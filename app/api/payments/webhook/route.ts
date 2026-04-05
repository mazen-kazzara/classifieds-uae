import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";
import crypto from "crypto";

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
          submissionId: submission.id,
          title: submission.title || rawText.split(/\s+/).slice(0, 6).join(" "),
          description: rawText,
          category: submission.categoryName || "Other",
          contentType: submission.contentType || "ad",
          contactPhone: submission.contactPhone,
          whatsappNumber: submission.whatsappNumber,
          telegramChatId: submission.telegramChatId,
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
        submission: { id: submission.id, phone: submission.phone, telegramChatId: submission.telegramChatId ?? null },
        ad: { id: ad.id, title: ad.title || "Ad", status: ad.status, expiresAt: ad.expiresAt, isFeatured, category: ad.category },
      };
    });

    if (result.alreadyProcessed) return NextResponse.json({ ok: true, alreadyProcessed: true });

    const adUrl = `${process.env.APP_URL}/ad/${result.ad!.id}`;
    const adTitle = result.ad!.title;

    // Notify user via Telegram DM
    try {
      const chatId = result.submission!.telegramChatId;
      if (chatId) {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: `✅ Your ad is live!\n\n📌 ${adTitle}\n🔗 ${adUrl}`, disable_web_page_preview: false }),
        });
      }
    } catch (e) { console.error("TELEGRAM DM FAILED:", e); }

    // Publish to Telegram channel if configured
    try {
      if (TELEGRAM_CHANNEL_ID) {
        const channelText = `📢 New Ad: ${adTitle}\n\n${result.ad!.category}\n\n🔗 ${adUrl}`;
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: TELEGRAM_CHANNEL_ID, text: channelText, disable_web_page_preview: false }),
        });
      }
    } catch (e) { console.error("TELEGRAM CHANNEL PUBLISH FAILED:", e); }

    return NextResponse.json({ ok: true, paymentStatus: "SUCCESS", adId: result.ad!.id });
  } catch (err: any) {
    if (err.message === "PAYMENT_NOT_FOUND") return NextResponse.json({ ok: false, error: "PAYMENT_NOT_FOUND" }, { status: 404 });
    if (err.message === "INVALID_AD_TEXT") return NextResponse.json({ ok: false, error: "INVALID_AD_TEXT" }, { status: 400 });
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: err?.message ?? "" }, { status: 500 });
  }
}
