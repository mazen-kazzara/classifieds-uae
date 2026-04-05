import { generateAdId } from "@/lib/ad-id";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
       data: { id: generateAdId(),
         submissionId,
         title: submission.title || "Ad",
         description: submission.text || "",
         category: submission.categoryName || "Other",
         contentType: submission.contentType || "ad",
         contactPhone: submission.contactPhone,
         whatsappNumber: submission.whatsappNumber,
         contactMethod: submission.contactMethod,
         status: "PUBLISHED",
         publishedAt: new Date(),
         expiresAt,

         // 🔥 THIS FIXES YOUR ISSUE
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

    // 🔥 THIS IS THE MISSING PART
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

    
    // Telegram channel publish
    if (!adAlreadyExisted && (submission as any).publishTarget === "website+telegram") {
      const BOT = process.env.TELEGRAM_BOT_TOKEN || "";
      const CHAN = process.env.TELEGRAM_CHANNEL_ID || "";
      if (BOT && CHAN) {
        const adUrl = `${process.env.APP_URL || "https://classifiedsuae.ae"}/ad/${ad.id}`;
        const priceVal = (submission as any).adPrice;
        const isNeg = (submission as any).isNegotiable;
        const priceLine = priceVal
          ? `\n💰 ${Number(priceVal).toLocaleString("en-AE")} AED${isNeg ? " · Negotiable" : ""}`
          : isNeg ? "\n💰 Price: Negotiable" : "";
        const desc = (ad.description || "").slice(0, 700);
        const ellipsis = (ad.description?.length ?? 0) > 700 ? "..." : "";
        const waNum = (submission as any).whatsappNumber || "";
        const phone = (submission as any).contactPhone || "";
        const method = (submission as any).contactMethod || "";
        const telegramUser = (submission as any).telegramUsername || (submission as any).telegramChatId || "";
        const callLine = (method === "call" || method === "both") && phone
          ? `\n📞 Call: +${phone}`
          : "";
        const caption = `📢 ${ad.title}\n🗂 ${ad.category}${priceLine}${callLine}\n\n${desc}${ellipsis}\n\n🔗 ${adUrl}`;
        const contactButtons: { text: string; url: string }[] = [];
        if ((method === "whatsapp" || method === "both") && waNum) {
          contactButtons.push({ text: "💬 WhatsApp", url: `https://wa.me/${waNum}` });
        }
        if (telegramUser) {
          const tgContact = String(telegramUser).startsWith("-") || Number.isInteger(Number(telegramUser))
            ? `https://t.me/${telegramUser}`
            : `https://t.me/${String(telegramUser).replace("@", "")}`;
          contactButtons.push({ text: "✈️ Telegram", url: tgContact });
        }
        const replyMarkup = contactButtons.length > 0
          ? { inline_keyboard: [contactButtons] }
          : undefined;
        const firstMedia = (submission as any).submissionMedia?.[0];
        const photoUrl = firstMedia
          ? (firstMedia.tempKey.startsWith("/") ? `${process.env.APP_URL || "https://classifiedsuae.ae"}${firstMedia.tempKey}` : `${process.env.APP_URL || "https://classifiedsuae.ae"}/uploads/${firstMedia.tempKey}`)
          : null;
        if (photoUrl) {
          await fetch(`https://api.telegram.org/bot${BOT}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: CHAN, photo: photoUrl, caption: caption.slice(0, 1024), ...(replyMarkup && { reply_markup: replyMarkup }) }),
          }).catch(() => {});
        } else {
          await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: CHAN, text: caption.slice(0, 4096), ...(replyMarkup && { reply_markup: replyMarkup }) }),
          }).catch(() => {});
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
