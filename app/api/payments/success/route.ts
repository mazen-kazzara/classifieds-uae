import { generateAdId } from "@/lib/ad-id";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishToSocial } from "@/lib/social-publisher";

export async function POST(req: Request) {
  try {
    const { submissionId } = await req.json();
    if (!submissionId) {
      return NextResponse.json({ error: "NO_SUBMISSION_ID" }, { status: 400 });
    }

    const submission = await prisma.adSubmission.findUnique({
      where: { id: submissionId },
      include: { submissionMedia: true, package: true },
    });

    if (!submission) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    let ad = await prisma.ad.findUnique({ where: { submissionId } });
    const adAlreadyExisted = !!ad;

    if (!ad) {
      const pkgDays = (submission as any).package?.durationDays ?? 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + pkgDays);

      ad = await prisma.ad.create({
        data: {
          id: generateAdId(),
          submissionId,
          title: submission.title || "Ad",
          description: submission.text || "",
          category: submission.categoryName || "Other",
          contentType: submission.contentType || "ad",
          contactPhone: submission.contactPhone,
          whatsappNumber: submission.whatsappNumber,
          contactMethod: submission.contactMethod,
          telegramUsername: (submission as any).telegramUsername || undefined,
          status: "PUBLISHED",
          publishedAt: new Date(),
          expiresAt,
          isFeatured: !!(submission as any).package?.isFeatured,
        },
      });

      for (const m of submission.submissionMedia) {
        const url = m.tempKey.startsWith("/") ? m.tempKey : `/uploads/${m.tempKey}`;
        await prisma.media.create({
          data: { adId: ad.id, position: m.position, url },
        });
      }
    }

    await prisma.ad.update({
      where: { id: ad.id },
      data: {
        adPrice: submission.adPrice ?? null,
        isNegotiable: submission.isNegotiable ?? false,
      },
    });

    await prisma.adSubmission.update({
      where: { id: submissionId },
      data: { status: "PUBLISHED" },
    });

    // Only publish to external platforms if ad was just created (not duplicate call)
    if (!adAlreadyExisted) {
      const APP_URL = process.env.APP_URL || "https://classifiedsuae.ae";
      const adUrl = `${APP_URL}/ad/${ad.id}`;
      const pubTarget = ((submission as any).publishTarget || "") as string;

      // ── Contact info ──────────────────────────────────────────────────
      const methodStr = (submission as any).contactMethod || "";
      const methods = methodStr ? methodStr.split(",").map((m: string) => m.trim()) : [];
      const rawPhone = ((submission as any).contactPhone || submission.phone || "").replace(/\D/g, "");
      const rawWaNum = ((submission as any).whatsappNumber || "").replace(/\D/g, "");
      const tgUsername = ((submission as any).telegramUsername || "").replace(/^@/, "");
      const hasCall = methods.includes("call") || methods.includes("both");
      const hasWA = (methods.includes("whatsapp") || methods.includes("both")) && !!rawWaNum;
      const hasTg = methods.includes("telegram") && !!tgUsername;

      // ── Telegram channel ──────────────────────────────────────────────
      if (pubTarget.includes("telegram")) {
        const BOT = process.env.TELEGRAM_BOT_TOKEN || "";
        const CHAN = process.env.TELEGRAM_CHANNEL_ID || "";
        if (BOT && CHAN) {
          const priceVal = (submission as any).adPrice;
          const isNeg = (submission as any).isNegotiable;
          const priceLine = priceVal
            ? `\n💰 ${Number(priceVal).toLocaleString("en-AE")} AED${isNeg ? " · Negotiable" : ""}`
            : isNeg ? "\n💰 Price: Negotiable" : "";
          const desc = (ad.description || "").slice(0, 700);
          const ellipsis = (ad.description?.length ?? 0) > 700 ? "..." : "";
          const callLine = hasCall && rawPhone ? `\n📞 +${rawPhone}` : "";
          const caption = `📢 ${ad.title}\n🗂 ${ad.category}${priceLine}${callLine}\n\n${desc}${ellipsis}\n\n🔗 ${adUrl}`;

          const buttons: { text: string; url: string }[] = [];
          if (hasWA) buttons.push({ text: "💬 WhatsApp", url: `https://wa.me/${rawWaNum}` });
          if (hasTg) buttons.push({ text: "✈️ Telegram", url: `https://t.me/${tgUsername}` });
          buttons.push({ text: "🔗 View Ad", url: adUrl });
          const replyMarkup = { inline_keyboard: [buttons] };

          // All media URLs — use sendMediaGroup if >1, sendPhoto otherwise.
          const allMedia = (submission.submissionMedia || [])
            .map((m: any) => `${APP_URL}/uploads/${m.tempKey.replace(/^\/?(uploads\/)?/, "")}`);
          let sent = false;

          if (allMedia.length > 1) {
            const mediaGroup = allMedia.map((url: string, i: number) => ({
              type: "photo",
              media: url,
              ...(i === 0 ? { caption: caption.slice(0, 1024) } : {}),
            }));
            const tgRes = await fetch(`https://api.telegram.org/bot${BOT}/sendMediaGroup`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: CHAN, media: mediaGroup }),
            }).catch(() => null);
            const tgJson = await tgRes?.json().catch(() => null);
            if (tgJson?.ok && Array.isArray(tgJson.result)) {
              sent = true;
              const allMsgIds = tgJson.result.map((r: any) => r.message_id).filter(Boolean);
              // Buttons as follow-up
              const btnRes = await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: CHAN, text: `🔗 ${adUrl}`, reply_markup: replyMarkup }),
              }).catch(() => null);
              const btnJson = await btnRes?.json().catch(() => null);
              if (btnJson?.result?.message_id) allMsgIds.push(btnJson.result.message_id);
              if (allMsgIds.length > 0) {
                await prisma.ad.update({ where: { id: ad.id }, data: { telegramMessageId: allMsgIds.join(",") } });
              }
              console.log("SUCCESS ROUTE: channel sendMediaGroup OK, ids=", allMsgIds);
            }
          } else if (allMedia.length === 1) {
            const tgRes = await fetch(`https://api.telegram.org/bot${BOT}/sendPhoto`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: CHAN, photo: allMedia[0], caption: caption.slice(0, 1024), reply_markup: replyMarkup }),
            }).catch(() => null);
            const tgJson = await tgRes?.json().catch(() => null);
            if (tgJson?.ok) {
              sent = true;
              if (tgJson.result?.message_id) {
                await prisma.ad.update({ where: { id: ad.id }, data: { telegramMessageId: String(tgJson.result.message_id) } });
              }
              console.log("SUCCESS ROUTE: channel sendPhoto OK");
            }
          }

          if (!sent) {
            const tgRes = await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: CHAN, text: caption.slice(0, 4096), reply_markup: replyMarkup }),
            }).catch(() => null);
            const tgJson = await tgRes?.json().catch(() => null);
            if (tgJson?.ok && tgJson.result?.message_id) {
              await prisma.ad.update({ where: { id: ad.id }, data: { telegramMessageId: String(tgJson.result.message_id) } });
            }
          }
        }
      }

      // ── Facebook + Instagram + X ──────────────────────────────────────
      if (pubTarget.includes("facebook") || pubTarget.includes("instagram") || pubTarget.includes("x")) {
        const allImageUrls = (submission.submissionMedia || []).map((m: any) =>
          `${APP_URL}/uploads/${m.tempKey.replace(/^\/?(uploads\/)?/, "")}`
        );
        const imageUrl = allImageUrls[0] ?? null;
        const contactLines: string[] = [];
        if (hasCall && rawPhone) contactLines.push(`📞 +${rawPhone}`);
        if (hasWA) contactLines.push(`💬 wa.me/${rawWaNum}`);
        if (hasTg) contactLines.push(`✈️ @${tgUsername}`);

        try {
          const socialResult = await publishToSocial({
            title: ad.title || "",
            description: ad.description || "",
            category: ad.category,
            adUrl,
            imageUrl,
            allImageUrls,
            adPrice: (submission as any).adPrice ?? null,
            isNegotiable: (submission as any).isNegotiable ?? false,
            contactLines,
            publishFacebook: pubTarget.includes("facebook"),
            publishInstagram: pubTarget.includes("instagram"),
            publishX: pubTarget.includes("x"),
          });
          const socialIds: Record<string, string> = {};
          if (socialResult.facebookPostId) socialIds.facebookPostId = socialResult.facebookPostId;
          if (socialResult.instagramPostId) socialIds.instagramPostId = socialResult.instagramPostId;
          if (socialResult.xPostId) socialIds.twitterPostId = socialResult.xPostId;
          if (Object.keys(socialIds).length > 0) {
            await prisma.ad.update({ where: { id: ad.id }, data: socialIds });
            console.log("SUCCESS ROUTE: social IDs saved for ad=", ad.id, socialIds);
          }
        } catch (e) {
          console.error("SUCCESS ROUTE: social publish error:", e);
        }
      }
    }

    const pkgDays = (submission as any).package?.durationDays ?? 3;
    return NextResponse.json({ ok: true, days: pkgDays, title: ad.title });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
