import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { publishToSocial } from "@/lib/social-publisher";
import { buildFollowUsText, type FollowPlatform } from "@/lib/follow-us";
import { generateAdId } from "@/lib/ad-id";

const prisma = new PrismaClient();

// ── Telegram Channel Config ──────────────────────────────────────────────────
// Set TELEGRAM_CHANNEL_ID in your .env to enable channel publishing
// Example: TELEGRAM_CHANNEL_ID=-1001234567890
// Leave blank to disable channel publishing
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || "";

function verifyZiinaSignature(rawBody: string, signature: string | null) {
  const secret = process.env.ZIINA_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function normalizeMediaUrl(tempKey: string) {
  const clean = String(tempKey || "").trim();
  if (!clean) throw new Error("INVALID_TEMP_MEDIA_KEY");
  if (clean.startsWith("/uploads/")) return clean;
  if (clean.startsWith("uploads/")) return `/${clean}`;
  return `/uploads/${clean}`;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (!rawBody || rawBody.length < 2) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });

    const signature = req.headers.get("x-hmac-signature");
    if (!verifyZiinaSignature(rawBody, signature)) return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 401 });

    let body: any;
    try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 }); }

    const eventName = String(body?.event ?? "");
    const paymentStatus = String(body?.data?.status ?? "").toLowerCase();

    if (eventName !== "payment_intent.status.updated") return NextResponse.json({ ok: true, ignored: true, reason: "UNHANDLED_EVENT" });
    if (paymentStatus !== "completed") return NextResponse.json({ ok: true, ignored: true, reason: "PAYMENT_NOT_COMPLETED" });

    const providerRef = String(body?.data?.id ?? "").trim();
    if (!providerRef) return NextResponse.json({ ok: false, error: "PROVIDER_REF_REQUIRED" }, { status: 400 });

    // ── Branch: company subscription payments ───────────────────────────────
    // Detect early so the existing AD flow stays untouched.
    const preliminaryPayment = await prisma.payment.findUnique({
      where: { providerRef },
      select: { id: true, purpose: true, status: true, companyId: true },
    });
    if (!preliminaryPayment) {
      return NextResponse.json({ ok: false, error: "PAYMENT_NOT_FOUND" }, { status: 404 });
    }
    if (preliminaryPayment.purpose === "COMPANY_SUBSCRIPTION") {
      if (preliminaryPayment.status === "SUCCESS") {
        return NextResponse.json({ ok: true, alreadyProcessed: true });
      }
      if (!preliminaryPayment.companyId) {
        return NextResponse.json({ ok: false, error: "PAYMENT_HAS_NO_COMPANY" }, { status: 400 });
      }
      const startedAt = new Date();
      const endsAt = new Date(startedAt);
      endsAt.setMonth(endsAt.getMonth() + 1); // monthly billing
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: preliminaryPayment.id },
          data: { status: "SUCCESS", rawPayload: { webhook: body } },
        }),
        prisma.company.update({
          where: { id: preliminaryPayment.companyId },
          data: {
            subscriptionStatus: "ACTIVE",
            subscriptionStartedAt: startedAt,
            subscriptionEndsAt: endsAt,
          },
        }),
      ]);
      console.log("[CompanyWebhook] subscription ACTIVE for companyId=%s", preliminaryPayment.companyId);
      return NextResponse.json({ ok: true, paymentStatus: "SUCCESS", kind: "company" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { providerRef }, include: { submission: true } });
      if (!payment) throw new Error("PAYMENT_NOT_FOUND");
      if (!payment.submission) throw new Error("PAYMENT_HAS_NO_SUBMISSION");

      // Detect republish: the Payment record was tagged by /api/user/republish-confirm.
      // We preserve the tag across the webhook-body overwrite below.
      const prevPayload = payment.rawPayload as any;
      const isRepublish = prevPayload?.isRepublish === true;
      const republishDurationDays = Number(prevPayload?.durationDays) || null;

      const existingAd = await tx.ad.findUnique({ where: { submissionId: payment.submission.id } });

      if (payment.status === "SUCCESS" && existingAd && existingAd.status === "PUBLISHED") {
        await tx.adSubmission.update({ where: { id: payment.submission.id }, data: { status: "PUBLISHED" } });
        return { alreadyProcessed: true };
      }

      if (payment.status !== "SUCCESS") {
        // Merge webhook body into rawPayload without losing our isRepublish tag.
        const merged = { ...(prevPayload || {}), webhook: body };
        await tx.payment.update({ where: { id: payment.id }, data: { status: "SUCCESS", rawPayload: merged } });
      }

      // ── REPUBLISH PATH: revive the existing expired ad ──────────────────
      if (isRepublish && existingAd) {
        const durationDays = republishDurationDays || 14;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        const revived = await tx.ad.update({
          where: { id: existingAd.id },
          data: { status: "PUBLISHED", publishedAt: new Date(), expiresAt, deletedAt: null },
        });
        await tx.adSubmission.update({ where: { id: payment.submission.id }, data: { status: "PUBLISHED" } });

        const revivedMedia = await tx.media.findMany({ where: { adId: existingAd.id }, orderBy: { position: "asc" } });
        return {
          alreadyProcessed: false,
          isRepublish: true,
          submission: {
            id: payment.submission.id,
            phone: payment.submission.phone,
            telegramChatId: payment.submission.telegramChatId ?? null,
            contactMethod: (payment.submission as any).contactMethod ?? null,
            whatsappNumber: (payment.submission as any).whatsappNumber ?? null,
            contactPhone: payment.submission.contactPhone ?? null,
            adPrice: (payment.submission as any).adPrice ?? null,
            isNegotiable: (payment.submission as any).isNegotiable ?? false,
            text: payment.submission.text ?? "",
            publishTarget: (payment.submission as any).publishTarget ?? "website",
            telegramUsername: (payment.submission as any).telegramUsername ?? null,
            source: (payment.submission as any).source ?? null,
            language: payment.submission.language ?? "en",
          },
          ad: { id: revived.id, title: revived.title || "Ad", status: revived.status, expiresAt: revived.expiresAt, isFeatured: revived.isFeatured, category: revived.category },
          mediaUrls: revivedMedia.map(m => m.url),
        };
      }

      if (existingAd) {
        // Normal case: ad exists and already PUBLISHED (rare race)
        await tx.adSubmission.update({ where: { id: payment.submission.id }, data: { status: "PUBLISHED" } });
        return { alreadyProcessed: true };
      }

      const submission = await tx.adSubmission.update({ where: { id: payment.submission.id }, data: { status: "PAID" } });
      const rawText = (submission.text || "").trim();
      if (!rawText || rawText.length < 5) throw new Error("INVALID_AD_TEXT");

      // Use package durationDays for expiry (default 30)
      let durationDays = 30;
      let isFeatured = false;
      let isPinned = false;
      if (submission.packageId) {
        const pkg = await tx.package.findUnique({ where: { id: submission.packageId } });
        if (pkg) { isFeatured = pkg.isFeatured; isPinned = pkg.isPinned; durationDays = pkg.durationDays; }
      }
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      const ad = await tx.ad.create({
        data: {
          id: generateAdId(),
          submissionId: submission.id,
          title: submission.title || rawText.split(/\s+/).slice(0, 6).join(" "),
          description: rawText,
          category: submission.categoryName || "Other",
          contentType: submission.contentType || "ad",
          contactPhone: submission.contactPhone,
          whatsappNumber: submission.whatsappNumber,
          telegramChatId: submission.telegramChatId,
          telegramUsername: (submission as any).telegramUsername || undefined,
          contactEmail: submission.contactEmail,
          contactMethod: submission.contactMethod,
          bookingEnabled: submission.bookingEnabled,
          bookingType: submission.bookingType,
          offerStartDate: submission.offerStartDate,
          offerEndDate: submission.offerEndDate,
          isFeatured,
          isPinned,
          location: (submission as any).location ?? null,
          subCategory: (submission as any).subCategory ?? null,
          status: "PUBLISHED",
          publishedAt: new Date(),
          expiresAt,
        } as any,
      });

      const tempMedia = await tx.submissionMedia.findMany({ where: { submissionId: submission.id }, orderBy: { position: "asc" } });
      for (const m of tempMedia) {
        await tx.media.create({ data: { adId: ad.id, position: m.position, url: normalizeMediaUrl(m.tempKey) } });
      }

      await tx.adSubmission.update({ where: { id: submission.id }, data: { status: "PUBLISHED" } });

      return {
        alreadyProcessed: false,
        submission: {
          id:             submission.id,
          phone:          submission.phone,
          telegramChatId: submission.telegramChatId ?? null,
          contactMethod:  (submission as any).contactMethod  ?? null,
          whatsappNumber: (submission as any).whatsappNumber ?? null,
          contactPhone:   submission.contactPhone  ?? null,
          adPrice:        (submission as any).adPrice        ?? null,
          isNegotiable:   (submission as any).isNegotiable   ?? false,
          text:           submission.text ?? "",
          publishTarget:  (submission as any).publishTarget  ?? "website",
          telegramUsername: (submission as any).telegramUsername ?? null,
          source:         (submission as any).source         ?? null,
          language:       submission.language ?? "en",
        },
        ad: { id: ad.id, title: ad.title || "Ad", status: ad.status, expiresAt: ad.expiresAt, isFeatured, category: ad.category },
        mediaUrls: tempMedia.map(m => normalizeMediaUrl(m.tempKey)),
      };
    });

    if (result.alreadyProcessed) return NextResponse.json({ ok: true, alreadyProcessed: true });

    const adUrl = `${process.env.APP_URL}/ad/${result.ad!.id}`;
    const adTitle = result.ad!.title;

    const APP_URL = process.env.APP_URL || "https://classifiedsuae.ae";
    const webhookPubTarget = result.submission?.publishTarget || "";
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const subObj = result.submission!;
    const adObj = result.ad!;

    // ── Publish to Telegram channel (with image) ─────────────────────────────
    try {
      if (TELEGRAM_CHANNEL_ID && botToken && webhookPubTarget.includes("telegram")) {
        const methods  = subObj.contactMethod
          ? subObj.contactMethod.split(",").map((m: string) => m.trim())
          : ["call"];
        const waNumber  = (subObj.whatsappNumber || subObj.phone || "").replace(/\D/g, "");
        const callPhone = (subObj.phone || "").replace(/\D/g, "");
        const hasWA     = methods.includes("whatsapp") && !!waNumber;
        const hasCall   = methods.includes("call")     && !!callPhone;
        const hasTg     = methods.includes("telegram");

        const priceVal = subObj.adPrice;
        const isNeg = subObj.isNegotiable;
        // Captions are emoji-free per spec.
        const priceLine = priceVal
          ? `\n${Number(priceVal).toLocaleString("en-AE")} AED${isNeg ? " · Negotiable" : ""}`
          : isNeg ? "\nNegotiable" : "";

        const desc = (subObj.text || "").slice(0, 700);
        const ellipsis = (subObj.text?.length ?? 0) > 700 ? "..." : "";
        const callLine = hasCall ? `\nCall: +${callPhone}` : "";
        const channelText = `${adTitle}\n${adObj.category}${priceLine}${callLine}\n\n${desc}${ellipsis}\n\n${adUrl}`;

        const tgUsername = subObj.telegramUsername || "";
        const buttons: { text: string; url: string }[] = [];
        if (hasWA)  buttons.push({ text: "WhatsApp", url: `https://wa.me/${waNumber}` });
        if (hasTg && tgUsername) buttons.push({ text: "Telegram", url: `https://t.me/${tgUsername}` });
        buttons.push({ text: "View Ad", url: adUrl });
        const replyMarkup = { inline_keyboard: [buttons] };

        // Try sending images — sendMediaGroup for multiple, sendPhoto for single
        const allMediaUrls = (result.mediaUrls || []).map(u => `${APP_URL}/uploads/${u.replace(/^\/?(uploads\/)?/, "")}`).filter(Boolean);
        let sent = false;

        if (allMediaUrls.length > 1) {
          // Multiple images → sendMediaGroup
          const media = allMediaUrls.map((url, i) => ({
            type: "photo" as const,
            media: url,
            ...(i === 0 ? { caption: channelText.slice(0, 1024) } : {}),
          }));
          const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: TELEGRAM_CHANNEL_ID, media }),
          }).catch(() => null);
          const tgJson = await tgRes?.json().catch(() => null);
          if (tgJson?.ok && Array.isArray(tgJson.result)) {
            // Store ALL message IDs (comma-separated) so we can delete them all later
            const allMsgIds = tgJson.result.map((r: any) => r.message_id).filter(Boolean);
            console.log("WEBHOOK CHANNEL sendMediaGroup OK, message_ids=", allMsgIds);
            // Send buttons as separate message (sendMediaGroup doesn't support inline keyboards)
            const btnRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: TELEGRAM_CHANNEL_ID, text: adUrl, reply_markup: replyMarkup }),
            }).catch(() => null);
            const btnJson = await btnRes?.json().catch(() => null);
            if (btnJson?.result?.message_id) allMsgIds.push(btnJson.result.message_id);
            if (allMsgIds.length > 0) {
              await prisma.ad.update({ where: { id: result.ad!.id }, data: { telegramMessageId: allMsgIds.join(",") } });
            }
            sent = true;
          } else {
            console.error("WEBHOOK CHANNEL sendMediaGroup failed:", JSON.stringify(tgJson));
          }
        } else if (allMediaUrls.length === 1) {
          // Single image → sendPhoto
          const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: TELEGRAM_CHANNEL_ID, photo: allMediaUrls[0], caption: channelText.slice(0, 1024), reply_markup: replyMarkup }),
          }).catch(() => null);
          const tgJson = await tgRes?.json().catch(() => null);
          if (tgJson?.ok) {
            console.log("WEBHOOK CHANNEL sendPhoto OK, message_id=", tgJson?.result?.message_id);
            if (tgJson?.result?.message_id) {
              await prisma.ad.update({ where: { id: result.ad!.id }, data: { telegramMessageId: String(tgJson.result.message_id) } });
            }
            sent = true;
          } else {
            console.error("WEBHOOK CHANNEL sendPhoto failed:", JSON.stringify(tgJson));
          }
        }

        if (!sent) {
          const tgRes2 = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: TELEGRAM_CHANNEL_ID, text: channelText, reply_markup: replyMarkup }),
          }).catch(() => null);
          const tgJson2 = await tgRes2?.json().catch(() => null);
          if (!tgJson2?.ok) {
            console.error("WEBHOOK CHANNEL sendMessage failed:", JSON.stringify(tgJson2));
          } else {
            console.log("WEBHOOK CHANNEL sendMessage OK, message_id=", tgJson2?.result?.message_id);
            if (tgJson2?.result?.message_id) {
              await prisma.ad.update({ where: { id: result.ad!.id }, data: { telegramMessageId: String(tgJson2.result.message_id) } });
            }
          }
        }
      }
    } catch (e) { console.error("TELEGRAM CHANNEL PUBLISH FAILED:", e); }

    // ── Publish to Facebook + Instagram + X ────────────────────────────────
    let facebookUrl: string | null = null;
    let instagramUrl: string | null = null;
    let xUrl: string | null = null;
    try {
      const pubFacebook  = webhookPubTarget.includes("facebook");
      const pubInstagram = webhookPubTarget.includes("instagram");
      const pubX         = webhookPubTarget.includes("x");

      if (pubFacebook || pubInstagram || pubX) {
        const allImageUrls = (result.mediaUrls || []).map(u => `${APP_URL}/uploads/${u.replace(/^\/?(uploads\/)?/, "")}`);
        const imageUrl = allImageUrls[0] ?? null;
        const methodStr2 = subObj.contactMethod || "";
        const methods2 = methodStr2 ? methodStr2.split(",").map((m: string) => m.trim()) : [];
        const phone2 = (subObj.contactPhone || subObj.phone || "").replace(/\D/g, "");
        const waNum2 = (subObj.whatsappNumber || "").replace(/\D/g, "");
        const contactLines2: string[] = [];
        if (methods2.includes("call") && phone2) contactLines2.push(`Call: +${phone2}`);
        if (methods2.includes("whatsapp") && waNum2) contactLines2.push(`WhatsApp: wa.me/${waNum2}`);
        if (methods2.includes("telegram")) contactLines2.push(`Telegram`);

        const socialResult = await publishToSocial({
          title: adTitle,
          description: subObj.text || "",
          category: adObj.category,
          adUrl,
          imageUrl,
          allImageUrls,
          adPrice: subObj.adPrice ?? null,
          isNegotiable: subObj.isNegotiable ?? false,
          contactLines: contactLines2,
          publishFacebook: pubFacebook,
          publishInstagram: pubInstagram,
          publishX: pubX,
        });
        facebookUrl = socialResult.facebookUrl || null;
        instagramUrl = socialResult.instagramUrl || null;
        xUrl = socialResult.xUrl || null;
        console.log("SOCIAL PUBLISH IDs: fb=", socialResult.facebookPostId, "ig=", socialResult.instagramPostId, "x=", socialResult.xPostId);
        const socialUpdateData: Record<string, string> = {};
        if (socialResult.facebookPostId) socialUpdateData.facebookPostId = socialResult.facebookPostId;
        if (socialResult.instagramPostId) socialUpdateData.instagramPostId = socialResult.instagramPostId;
        if (socialResult.xPostId) socialUpdateData.twitterPostId = socialResult.xPostId;
        if (Object.keys(socialUpdateData).length > 0) {
          await prisma.ad.update({ where: { id: result.ad!.id }, data: socialUpdateData });
          console.log("SOCIAL IDs saved for ad=", result.ad!.id);
        }
      }
    } catch (e) { console.error("SOCIAL PUBLISH ERROR (webhook):", e); }

    // ── Build the platform-links block once, used by both DM channels ────────
    const linksAr: string[] = [];
    const linksEn: string[] = [];
    if (webhookPubTarget.includes("website")) {
      linksAr.push(`🌍 الموقع:\n${adUrl}`);
      linksEn.push(`🌍 Website:\n${adUrl}`);
    }
    if (webhookPubTarget.includes("telegram")) {
      linksAr.push(`📱 قناة تيليغرام`);
      linksEn.push(`📱 Telegram Channel`);
    }
    if (facebookUrl)  { linksAr.push(`📘 فيسبوك:\n${facebookUrl}`);   linksEn.push(`📘 Facebook:\n${facebookUrl}`); }
    if (instagramUrl) { linksAr.push(`📷 انستقرام:\n${instagramUrl}`); linksEn.push(`📷 Instagram:\n${instagramUrl}`); }
    if (xUrl)         { linksAr.push(`✖️ X:\n${xUrl}`);                linksEn.push(`✖️ X:\n${xUrl}`); }
    if (linksEn.length === 0) {
      linksAr.push(`🔗 ${adUrl}`);
      linksEn.push(`🔗 ${adUrl}`);
    }

    // Follow-us snippet — same platforms the ad was posted to, our brand pages.
    const followPlatforms: FollowPlatform[] = ["website", "telegram", "facebook", "instagram", "x"]
      .filter(p => webhookPubTarget.includes(p)) as FollowPlatform[];
    const followAr = buildFollowUsText(followPlatforms, "ar");
    const followEn = buildFollowUsText(followPlatforms, "en");

    // ── Notify user via Telegram DM with all links ───────────────────────────
    try {
      const chatId = subObj.telegramChatId;
      if (chatId && botToken) {
        const followBlock = followEn ? `\n\n${followEn}` : "";
        const dmText = `✅ Your ad is live!\n\n📌 ${adTitle}\n\n🔗 Your ad links:\n${linksEn.join("\n\n")}${followBlock}\n\nThank you for using Classifieds UAE.\nUse /start to post a new ad.`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: dmText, disable_web_page_preview: false }),
        });
      }
    } catch (e) { console.error("TELEGRAM DM FAILED:", e); }

    // ── Notify user via WhatsApp DM with all links (mirrors Telegram path) ──
    // Only if the submission was created by the WhatsApp bot.
    try {
      if ((subObj as any).source === "whatsapp" && subObj.phone) {
        const lang = ((subObj as any).language || "en") === "ar" ? "ar" : "en";
        const links = lang === "ar" ? linksAr : linksEn;
        const followBlock = lang === "ar" ? (followAr ? `\n\n${followAr}` : "") : (followEn ? `\n\n${followEn}` : "");
        const dmText = lang === "ar"
          ? `✅ تم نشر إعلانك!\n\n📌 ${adTitle}\n\n🔗 روابط إعلانك:\n${links.join("\n\n")}${followBlock}\n\nشكراً لاستخدامك Classifieds UAE.\nاكتب *start* لنشر إعلان جديد.`
          : `✅ Your ad is live!\n\n📌 ${adTitle}\n\n🔗 Your ad links:\n${links.join("\n\n")}${followBlock}\n\nThank you for using Classifieds UAE.\nType *start* to post a new ad.`;
        const { sendText } = await import("@/services/whatsapp");
        await sendText(subObj.phone, dmText);
      }
    } catch (e) { console.error("WHATSAPP DM FAILED:", e); }

    return NextResponse.json({ ok: true, paymentStatus: "SUCCESS", adId: result.ad!.id });
  } catch (err: any) {
    if (err.message === "PAYMENT_NOT_FOUND") return NextResponse.json({ ok: false, error: "PAYMENT_NOT_FOUND" }, { status: 404 });
    if (err.message === "INVALID_AD_TEXT") return NextResponse.json({ ok: false, error: "INVALID_AD_TEXT" }, { status: 400 });
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: "An error occurred" }, { status: 500 });
  }
}
