import { generateAdId } from "@/lib/ad-id";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { publishToSocial } from "@/lib/social-publisher";

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

    // FREE AD (no package OR package with price 0)
    // =========================
    if (!hasPaidPackage || amount === 0) {
      const pkg = submission.packageId ? await prisma.package.findUnique({ where: { id: submission.packageId } }) : null;
      const durationDays = pkg?.durationDays ?? 3;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

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
          isFeatured: pkg?.isFeatured ?? false,
          isPinned: pkg?.isPinned ?? false,
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
      const pubTarget = ((submission as any).publishTarget || "") as string;
      if (pubTarget.includes("telegram")) {
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
          const rawWaNum = ((submission as any).whatsappNumber || "").replace(/\D/g, "");
          const rawPhone = ((submission as any).contactPhone || submission.phone || "").replace(/\D/g, "");
          const methodStr = (submission as any).contactMethod || "";
          const methods = methodStr ? methodStr.split(",").map((m: string) => m.trim()) : [];
          const hasCall = methods.includes("call") || methods.includes("both");
          const hasWA   = (methods.includes("whatsapp") || methods.includes("both")) && !!rawWaNum;
          const hasTg   = methods.includes("telegram");
          const callLine2 = hasCall && rawPhone ? `\n📞 +${rawPhone}` : "";
          const caption = `📢 ${ad.title}\n🗂 ${ad.category}${priceLine}${callLine2}\n\n${desc}${ellipsis}\n\n🔗 ${adUrl}`;
          const buttons: { text: string; url: string }[] = [];
          if (hasWA)  buttons.push({ text: "💬 WhatsApp", url: `https://wa.me/${rawWaNum}` });
          const tgUser = ((submission as any).telegramUsername || "").replace(/^@/, "");
          if (hasTg && tgUser) buttons.push({ text: "✈️ Telegram", url: `https://t.me/${tgUser}` });
          buttons.push({ text: "🔗 View Ad", url: adUrl });
          const replyMarkup = { inline_keyboard: [buttons] };
          const firstMedia = (submission as any).submissionMedia?.[0];
          const photoUrl = firstMedia
            ? (firstMedia.tempKey.startsWith("/") ? `${process.env.APP_URL || "https://classifiedsuae.ae"}${firstMedia.tempKey}` : `${process.env.APP_URL || "https://classifiedsuae.ae"}/uploads/${firstMedia.tempKey}`)
            : null;
          if (photoUrl) {
            const tgRes = await fetch(`https://api.telegram.org/bot${BOT}/sendPhoto`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: CHAN, photo: photoUrl, caption: caption.slice(0, 1024), reply_markup: replyMarkup }),
            }).catch((e: unknown) => { console.error("TG sendPhoto error:", e); return null; });
            const tgJson = await tgRes?.json().catch(() => null);
            if (!tgJson?.ok) {
              await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: CHAN, text: caption.slice(0, 4096), reply_markup: replyMarkup }),
              }).catch((e: unknown) => { console.error("TG sendMessage error:", e); });
            }
          } else {
            await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: CHAN, text: caption.slice(0, 4096), reply_markup: replyMarkup }),
            }).catch((e: unknown) => { console.error("TG sendMessage error:", e); });
          }
        }
      }

      // Social (Facebook + Instagram) publish — only if user selected them
      if (pubTarget.includes("facebook") || pubTarget.includes("instagram")) {
        const APP_URL = process.env.APP_URL || "https://classifiedsuae.ae";
        const adUrl2 = `${APP_URL}/ad/${ad.id}`;
        const firstMedia2 = submission.submissionMedia?.[0];
        const imageUrl = firstMedia2
          ? `${APP_URL}${firstMedia2.tempKey.startsWith("/") ? firstMedia2.tempKey : `/${firstMedia2.tempKey}`}`
          : null;
        const methodStr2 = (submission as any).contactMethod || "";
        const methods2 = methodStr2 ? methodStr2.split(",").map((m: string) => m.trim()) : [];
        const phone2 = ((submission as any).contactPhone || submission.phone || "").replace(/\D/g, "");
        const waNum2 = ((submission as any).whatsappNumber || "").replace(/\D/g, "");
        const contactLines2: string[] = [];
        if (methods2.includes("call") && phone2) contactLines2.push(`📞 +${phone2}`);
        if (methods2.includes("whatsapp") && waNum2) contactLines2.push(`💬 wa.me/${waNum2}`);
        if (methods2.includes("telegram")) contactLines2.push(`✈️ Telegram`);
        publishToSocial({
          title: ad.title || "",
          description: ad.description || "",
          category: ad.category,
          adUrl: adUrl2,
          imageUrl,
          adPrice: (submission as any).adPrice ?? null,
          isNegotiable: (submission as any).isNegotiable ?? false,
          contactLines: contactLines2,
          publishFacebook: pubTarget.includes("facebook"),
          publishInstagram: pubTarget.includes("instagram"),
        }).catch(e => console.error("SOCIAL PUBLISH ERROR (create):", e));
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