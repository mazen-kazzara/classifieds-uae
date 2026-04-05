import { generateAdId } from "@/lib/ad-id";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { submissionId } = await req.json();
    if (!submissionId)
      return NextResponse.json({ error: "NO_SUBMISSION_ID" }, { status: 400 });

    const submission = await prisma.adSubmission.findUnique({
      where: { id: submissionId },
      include: { submissionMedia: { orderBy: { position: "asc" } } },
    });

    if (!submission)
      return NextResponse.json({ error: "SUBMISSION_NOT_FOUND" }, { status: 404 });

    console.log("PACKAGE DEBUG (prisma):", submission?.packageId);

    // ✅ FORCE REAL DB CHECK (fixes your bug)
    const pkgCheck: any = await prisma.$queryRawUnsafe(
      `SELECT "packageId" FROM "AdSubmission" WHERE id = $1`,
      submissionId
    );

    const hasPaidPackage = pkgCheck?.[0]?.packageId != null;

    console.log("PACKAGE DEBUG (raw):", pkgCheck?.[0]?.packageId);

    const amount = submission.priceTotal || 0;

    // =========================
    // ENFORCE: Free plan cannot have images
    if (!hasPaidPackage) {
      const mediaCount = await prisma.submissionMedia.count({ where: { submissionId } });
      if (mediaCount > 0) {
        return NextResponse.json(
          { error: "FREE_PLAN_NO_IMAGES", message: "Free plan does not support images. Please remove images or upgrade to Normal/Featured." },
          { status: 400 }
        );
      }
    }

    // FREE AD
    // =========================
    if (!hasPaidPackage) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      const existing = await prisma.ad.findUnique({
        where: { submissionId },
      });

      if (existing) {
        await prisma.adSubmission.update({
          where: { id: submissionId },
          data: { status: "PUBLISHED" },
        });

        return NextResponse.json({ free: true, adId: existing.id });
      }

      const ad = await prisma.ad.create({
        data: { id: generateAdId(),
          submissionId,
          title:
            submission.title ||
            submission.text?.split(" ").slice(0, 6).join(" ") ||
            "Ad",
          description: submission.text || "",
          category: submission.categoryName || "Other",
          contentType: submission.contentType || "ad",
          contactPhone: submission.contactPhone,
          whatsappNumber: submission.whatsappNumber,
          contactEmail: submission.contactEmail,
          contactMethod: submission.contactMethod,
          bookingEnabled: submission.bookingEnabled,
          bookingType: submission.bookingType,
          offerStartDate: submission.offerStartDate,
          offerEndDate: submission.offerEndDate,
          status: "PUBLISHED",
          publishedAt: new Date(),
          expiresAt,
        },
      });

      await prisma.$executeRawUnsafe(
        `UPDATE "Ad" SET "adPrice" = $1, "isNegotiable" = $2 WHERE id = $3`,
        (submission as any).adPrice ?? null,
        (submission as any).isNegotiable ?? false,
        ad.id
      );

      for (const m of submission.submissionMedia) {
        const url = m.tempKey.startsWith("/")
          ? m.tempKey
          : `/uploads/${m.tempKey}`;

        await prisma.media.create({
          data: { adId: ad.id, position: m.position, url },
        });
      }

      await prisma.adSubmission.update({
        where: { id: submissionId },
        data: { status: "PUBLISHED" },
      });

      
      // Telegram channel publish
      if ((submission as any).publishTarget === "website+telegram") {
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
            const tgRes = await fetch(`https://api.telegram.org/bot${BOT}/sendPhoto`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: CHAN, photo: photoUrl, caption: caption.slice(0, 1024), ...(replyMarkup && { reply_markup: replyMarkup }) }),
            }).catch((e: unknown) => { console.error("TG sendPhoto error:", e); return null; });
            const tgJson = await tgRes?.json().catch(() => null);
            console.log("TG sendPhoto result:", JSON.stringify(tgJson), "photoUrl:", photoUrl);
            if (!tgJson?.ok) {
              // fallback to text
              const tgRes2 = await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: CHAN, text: caption.slice(0, 4096), ...(replyMarkup && { reply_markup: replyMarkup }) }),
              }).catch((e: unknown) => { console.error("TG sendMessage error:", e); return null; });
              console.log("TG sendMessage fallback:", JSON.stringify(await tgRes2?.json().catch(() => null)));
            }
          } else {
            const tgRes3 = await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: CHAN, text: caption.slice(0, 4096), ...(replyMarkup && { reply_markup: replyMarkup }) }),
            }).catch((e: unknown) => { console.error("TG sendMessage error:", e); return null; });
            console.log("TG sendMessage result:", JSON.stringify(await tgRes3?.json().catch(() => null)));
          }
        }
      }
      return NextResponse.json({ free: true, adId: ad.id });
    }

    // =========================
    // PAID AD
    // =========================
    let payment = await prisma.payment.findFirst({
      where: { submissionId },
    });

    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          submissionId,
          provider: "ziina",
          amount,
          currency: "AED",
          status: "PENDING",
          providerRef: randomUUID(),
        },
      });
    }

    const ziinaRes = await fetch(process.env.ZIINA_BASE_URL!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ZIINA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount * 100,
        currency_code: "AED",
        message: "Classified Ad Payment - classifiedsuae.ae",
        success_url: `${process.env.APP_URL}/success?submissionId=${submissionId}`,
        cancel_url: `${process.env.APP_URL}/cancel?submissionId=${submissionId}`,
        test: process.env.ZIINA_TEST_MODE === "true",
        metadata: { submissionId, paymentId: payment.id },
      }),
    });

    const ziina = await ziinaRes.json();

    if (!ziinaRes.ok) {
      return NextResponse.json(
        { error: "ZIINA_ERROR", detail: ziina },
        { status: 502 }
      );
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerRef: ziina.id },
    });

    const checkoutUrl = ziina?.redirect_url;

    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "NO_CHECKOUT_URL" },
        { status: 502 }
      );
    }

    return NextResponse.json({ checkoutUrl });

  } catch (err: any) {
    console.error("PAYMENT CREATE ERROR:", err);
    return NextResponse.json(
      { error: err.message || "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}