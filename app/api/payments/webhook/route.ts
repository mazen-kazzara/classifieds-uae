import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";
import crypto from "crypto";

const prisma = new PrismaClient();

type TxResult =
  | { alreadyProcessed: true }
  | {
      alreadyProcessed: false;
      paymentId: string;
      previousStatus: string;
      providerRef: string;
      submission: {
        id: string;
        phone: string;
        telegramChatId: string | null;
      };
      ad: {
        id: string;
        title: string;
        status: string;
        expiresAt: Date;
      };
    };

function verifyZiinaSignature(rawBody: string, signature: string | null) {
  const secret = process.env.ZIINA_WEBHOOK_SECRET;

  if (!secret || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== signatureBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

function normalizeMediaUrl(tempKey: string) {
  const clean = String(tempKey || "").trim();

  if (!clean) {
    throw new Error("INVALID_TEMP_MEDIA_KEY");
  }

  if (clean.startsWith("/uploads/")) {
    return clean;
  }

  if (clean.startsWith("uploads/")) {
    return `/${clean}`;
  }

  return `/uploads/${clean}`;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    console.log("ZIINA RAW:", rawBody);

    if (!rawBody || rawBody.length < 2) {
      return NextResponse.json(
        { ok: false, error: "INVALID_BODY" },
        { status: 400 }
      );
    }

    const signature = req.headers.get("x-hmac-signature");

    if (!verifyZiinaSignature(rawBody, signature)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_SIGNATURE" },
        { status: 401 }
      );
    }

    let body: any;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { ok: false, error: "INVALID_JSON" },
        { status: 400 }
      );
    }

    console.log("ZIINA FULL BODY:", JSON.stringify(body, null, 2));

    const eventName = String(body?.event ?? "");
    const paymentStatus = String(body?.data?.status ?? "").toLowerCase();

    if (eventName !== "payment_intent.status.updated") {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "UNHANDLED_EVENT",
      });
    }

    if (paymentStatus !== "completed") {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "PAYMENT_NOT_COMPLETED",
      });
    }

    const providerRef = String(body?.data?.id ?? "").trim();

    if (!providerRef) {
      return NextResponse.json(
        { ok: false, error: "PROVIDER_REF_REQUIRED" },
        { status: 400 }
      );
    }

    const result: TxResult = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { providerRef },
        include: { submission: true },
      });

      if (!payment) {
        throw new Error("PAYMENT_NOT_FOUND");
      }

      const existingAd = await tx.ad.findUnique({
        where: { submissionId: payment.submissionId },
      });

      // webhook may retry after ad already exists
      // always force submission to PUBLISHED so user does not stay "in progress"
      if (payment.status === "SUCCESS" && existingAd) {
        await tx.adSubmission.update({
          where: { id: payment.submissionId },
          data: { status: "PUBLISHED" },
        });

        return { alreadyProcessed: true };
      }

      const previousStatus = payment.status;

      if (payment.status !== "SUCCESS") {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCESS",
            rawPayload: body,
          },
        });
      }

      if (existingAd) {
        await tx.adSubmission.update({
          where: { id: payment.submissionId },
          data: { status: "PUBLISHED" },
        });

        return { alreadyProcessed: true };
      }

      const submission = await tx.adSubmission.update({
        where: { id: payment.submissionId },
        data: { status: "PAID" },
      });

      const rawText = (submission.text || "").trim();

      if (!rawText || rawText.length < 5) {
        throw new Error("INVALID_AD_TEXT");
      }

      const words = rawText.split(/\s+/).slice(0, 6);
      const generatedTitle = words.join(" ");

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const ad = await tx.ad.create({
        data: {
          id: submission.id,
          submissionId: submission.id,
          title: generatedTitle,
          description: rawText,
          category: submission.category || "Other",
          status: "PUBLISHED",
          publishedAt: new Date(),
          expiresAt,
        },
      });

      const tempMedia = await tx.submissionMedia.findMany({
        where: { submissionId: submission.id },
        orderBy: { position: "asc" },
      });

      for (const m of tempMedia) {
        await tx.media.create({
          data: {
            adId: ad.id,
            position: m.position,
            url: normalizeMediaUrl(m.tempKey),
          },
        });
      }

      await tx.adSubmission.update({
        where: { id: submission.id },
        data: { status: "PUBLISHED" },
      });

      return {
        alreadyProcessed: false,
        paymentId: payment.id,
        previousStatus,
        providerRef,
        submission: {
          id: submission.id,
          phone: submission.phone,
          telegramChatId: submission.telegramChatId ?? null,
        },
        ad: {
          id: ad.id,
          title: ad.title || "No title",
          status: ad.status,
          expiresAt: ad.expiresAt,
        },
      };
    });

    if (result.alreadyProcessed) {
      return NextResponse.json({
        ok: true,
        alreadyProcessed: true,
      });
    }

    try {
      const chatId = result.submission.telegramChatId;

      console.log("SENDING TELEGRAM:", chatId);

      if (!chatId) {
        console.log("NO CHAT ID FOUND");
      } else {
        const adUrl = `https://classifiedsuae.ae/ad/${result.ad.id}`;

        const tgRes = await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: chatId,
              text:
                `✅ Your ad is live!\n\n` +
                `📌 ${result.ad.title}\n` +
                `🔗 ${adUrl}`,
              disable_web_page_preview: false,
            }),
          }
        );

        const tgData = await tgRes.json();
        console.log("TELEGRAM RESPONSE:", tgData);
      }
    } catch (e) {
      console.log("TELEGRAM SEND FAILED:", e);
    }

    return NextResponse.json({
      ok: true,
      paymentStatus: "SUCCESS",
      adId: result.ad.id,
      adStatus: result.ad.status,
      expiresAt: result.ad.expiresAt,
    });
  } catch (err: any) {
    if (err.message === "PAYMENT_NOT_FOUND") {
      return NextResponse.json(
        { ok: false, error: "PAYMENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (err.message === "INVALID_AD_TEXT") {
      return NextResponse.json(
        { ok: false, error: "INVALID_AD_TEXT" },
        { status: 400 }
      );
    }

    if (err.message === "INVALID_TEMP_MEDIA_KEY") {
      return NextResponse.json(
        { ok: false, error: "INVALID_TEMP_MEDIA_KEY" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: err?.message ?? "" },
      { status: 500 }
    );
  }
}