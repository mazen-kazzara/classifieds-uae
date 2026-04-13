import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { publishToSocial } from "@/lib/social-publisher";
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

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { providerRef }, include: { submission: true } });
      if (!payment) throw new Error("PAYMENT_NOT_FOUND");

      const existingAd = await tx.ad.findUnique({ where: { submissionId: payment.submissionId } });

      if (payment.status === "SUCCESS" && existingAd) {
        await tx.adSubmission.update({ where: { id: payment.submissionId }, data: { status: "PUBLISHED" } });
        return { alreadyProcessed: true };
      }

      if (payment.status !== "SUCCESS") {
        await tx.payment.update({ where: { id: payment.id }, data: { status: "SUCCESS", rawPayload: body } });
      }

      if (existingAd) {
        await tx.adSubmission.update({ where: { id: payment.submissionId }, data: { status: "PUBLISHED" } });
        return { alreadyProcessed: true };
      }

      const submission = await tx.adSubmission.update({ where: { id: payment.submissionId }, data: { status: "PAID" } });
      const rawText = (submission.text || "").trim();
      if (!rawText || rawText.length < 5) throw new Error("INVALID_AD_TEXT");

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Determine if featured based on package
      let isFeatured = false;
      let isPinned = false;
      if (submission.packageId) {
        const pkg = await tx.package.findUnique({ where: { id: submission.packageId } });
        if (pkg) { isFeatured = pkg.isFeatured; isPinned = pkg.isPinned; }
      }

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
          status: "PUBLISHED",
          publishedAt: new Date(),
          expiresAt,
        },
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
        const priceLine = priceVal
          ? `\n💰 ${Number(priceVal).toLocaleString("en-AE")} AED${isNeg ? " · Negotiable" : ""}`
          : isNeg ? "\n💰 Negotiable" : "";

        const desc = (subObj.text || "").slice(0, 700);
        const ellipsis = (subObj.text?.length ?? 0) > 700 ? "..." : "";
        const callLine = hasCall ? `\n📞 +${callPhone}` : "";
        const channelText = `📢 ${adTitle}\n🗂 ${adObj.category}${priceLine}${callLine}\n\n${desc}${ellipsis}\n\n🔗 ${adUrl}`;

        const tgUsername = subObj.telegramUsername || "";
        const buttons: { text: string; url: string }[] = [];
        if (hasWA)  buttons.push({ text: "💬 WhatsApp", url: `https://wa.me/${waNumber}` });
        if (hasTg && tgUsername) buttons.push({ text: "✈️ Telegram", url: `https://t.me/${tgUsername}` });
        buttons.push({ text: "🔗 View Ad", url: adUrl });
        const replyMarkup = { inline_keyboard: [buttons] };

        // Try sendPhoto if images exist
        const firstMediaUrl = result.mediaUrls?.[0] ?? null;
        const photoUrl = firstMediaUrl ? `${APP_URL}${firstMediaUrl}` : null;
        let sent = false;

        if (photoUrl) {
          const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: TELEGRAM_CHANNEL_ID, photo: photoUrl, caption: channelText.slice(0, 1024), reply_markup: replyMarkup }),
          }).catch(() => null);
          const tgJson = await tgRes?.json().catch(() => null);
          if (tgJson?.ok) {
            console.log("WEBHOOK CHANNEL sendPhoto OK, message_id=", tgJson?.result?.message_id);
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
          }
        }
      }
    } catch (e) { console.error("TELEGRAM CHANNEL PUBLISH FAILED:", e); }

    // ── Publish to Facebook + Instagram ──────────────────────────────────────
    let facebookUrl: string | null = null;
    let instagramUrl: string | null = null;
    try {
      const pubFacebook  = webhookPubTarget.includes("facebook");
      const pubInstagram = webhookPubTarget.includes("instagram");

      if (pubFacebook || pubInstagram) {
        const firstUrl = result.mediaUrls?.[0] ?? null;
        const imageUrl = firstUrl ? `${APP_URL}${firstUrl}` : null;
        const methodStr2 = subObj.contactMethod || "";
        const methods2 = methodStr2 ? methodStr2.split(",").map((m: string) => m.trim()) : [];
        const phone2 = (subObj.contactPhone || subObj.phone || "").replace(/\D/g, "");
        const waNum2 = (subObj.whatsappNumber || "").replace(/\D/g, "");
        const contactLines2: string[] = [];
        if (methods2.includes("call") && phone2) contactLines2.push(`📞 +${phone2}`);
        if (methods2.includes("whatsapp") && waNum2) contactLines2.push(`💬 wa.me/${waNum2}`);
        if (methods2.includes("telegram")) contactLines2.push(`✈️ Telegram`);

        const socialResult = await publishToSocial({
          title: adTitle,
          description: subObj.text || "",
          category: adObj.category,
          adUrl,
          imageUrl,
          adPrice: subObj.adPrice ?? null,
          isNegotiable: subObj.isNegotiable ?? false,
          contactLines: contactLines2,
          publishFacebook: pubFacebook,
          publishInstagram: pubInstagram,
        });
        facebookUrl = socialResult.facebookUrl || null;
        instagramUrl = socialResult.instagramUrl || null;
      }
    } catch (e) { console.error("SOCIAL PUBLISH ERROR (webhook):", e); }

    // ── Notify user via Telegram DM with all links ───────────────────────────
    try {
      const chatId = subObj.telegramChatId;
      if (chatId && botToken) {
        const links: string[] = [];
        if (webhookPubTarget.includes("website")) links.push(`🌍 Website:\n${adUrl}`);
        if (facebookUrl)  links.push(`📘 Facebook:\n${facebookUrl}`);
        if (instagramUrl) links.push(`📷 Instagram:\n${instagramUrl}`);
        if (webhookPubTarget.includes("telegram")) links.push(`📱 Telegram Channel`);

        const dmText = `✅ Your ad is live!\n\n📌 ${adTitle}\n\n🔗 Your ad links:\n${links.join("\n\n")}\n\nThank you for using Classifieds UAE.\nUse /start to post a new ad.`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: dmText, disable_web_page_preview: false }),
        });
      }
    } catch (e) { console.error("TELEGRAM DM FAILED:", e); }

    return NextResponse.json({ ok: true, paymentStatus: "SUCCESS", adId: result.ad!.id });
  } catch (err: any) {
    if (err.message === "PAYMENT_NOT_FOUND") return NextResponse.json({ ok: false, error: "PAYMENT_NOT_FOUND" }, { status: 404 });
    if (err.message === "INVALID_AD_TEXT") return NextResponse.json({ ok: false, error: "INVALID_AD_TEXT" }, { status: 400 });
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: err?.message ?? "" }, { status: 500 });
  }
}
