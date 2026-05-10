import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const REPORT_REASONS = [
  "SPAM",
  "FAKE_AD",
  "PROHIBITED_CONTENT",
  "WRONG_CATEGORY",
  "DUPLICATE",
  "SCAM_FRAUD",
  "OFFENSIVE_LANGUAGE",
  "ILLEGAL_ITEM",
  "MISLEADING_INFO",
  "OTHER",
];

// Rate limit: 5 reports per IP per hour
const ipStore = new Map<string, { count: number; windowStart: number }>();
function checkRL(ip: string): boolean {
  const now = Date.now();
  const entry = ipStore.get(ip);
  if (!entry || now - entry.windowStart > 3600000) {
    ipStore.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRL(ip)) {
      return NextResponse.json({ ok: false, error: "RATE_LIMIT", message: "Too many reports. Try again later." }, { status: 429 });
    }

    const body = await req.json();
    const adId = String(body.adId ?? "").trim();
    const adUrl = String(body.adUrl ?? "").trim();
    const reason = String(body.reason ?? "").trim();
    const details = body.details ? String(body.details).trim().slice(0, 1000) : null;
    const reporterName = body.reporterName ? String(body.reporterName).trim().slice(0, 100) : null;
    const reporterEmail = body.reporterEmail ? String(body.reporterEmail).trim().slice(0, 200) : null;
    const reporterPhone = body.reporterPhone ? String(body.reporterPhone).trim().slice(0, 20) : null;

    if (!adId) return NextResponse.json({ ok: false, error: "AD_ID_REQUIRED" }, { status: 400 });
    if (!adUrl) return NextResponse.json({ ok: false, error: "AD_URL_REQUIRED" }, { status: 400 });
    if (!reason || !REPORT_REASONS.includes(reason)) {
      return NextResponse.json({ ok: false, error: "INVALID_REASON", validReasons: REPORT_REASONS }, { status: 400 });
    }

    // Get ad title
    let adTitle: string | null = null;
    try {
      const ad = await prisma.ad.findUnique({ where: { id: adId }, select: { title: true } });
      adTitle = ad?.title ?? null;
    } catch {}

    const report = await prisma.adReport.create({
      data: { adId, adTitle, adUrl, reason, details, reporterName, reporterEmail, reporterPhone },
    });

    // Send notification to admin (fire and forget with logging)
    sendReportNotification(report).catch((e) => console.error("Report notification error:", e));

    return NextResponse.json({ ok: true, reportId: report.id });
  } catch {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

async function sendReportNotification(report: any) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  // Collect all admin chat IDs to notify
  const adminChatIds = (process.env.ADMIN_TELEGRAM_CHAT_IDS || "").split(",").filter(Boolean);

  // Always notify @MazenKazzara (chat ID: 1582488625)
  const REPORT_CHAT_IDS = ["1582488625", "166237035"];
  for (const id of REPORT_CHAT_IDS) {
    if (!adminChatIds.includes(id)) adminChatIds.push(id);
  }

  if (!botToken) {
    console.error("Report notification: TELEGRAM_BOT_TOKEN is not set");
    return;
  }

  if (adminChatIds.length === 0) {
    console.error("Report notification: no chat IDs to notify");
    return;
  }

  const text = `🚨 بلاغ جديد على إعلان\n\n` +
    `📌 الإعلان: ${report.adTitle || report.adId}\n` +
    `🔗 ${report.adUrl}\n` +
    `⚠️ السبب: ${report.reason}\n` +
    (report.details ? `📝 تفاصيل: ${report.details}\n` : "") +
    (report.reporterName ? `👤 المبلّغ: ${report.reporterName}\n` : "") +
    (report.reporterEmail ? `📧 ${report.reporterEmail}\n` : "") +
    (report.reporterPhone ? `📞 ${report.reporterPhone}\n` : "");

  for (const chatId of adminChatIds) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId.trim(), text, disable_web_page_preview: false }),
      });
      const data = await res.json();
      if (!data.ok) {
        console.error(`Report TG notify failed for ${chatId}:`, data.description);
      }
    } catch (e) {
      console.error(`Report TG notify error for ${chatId}:`, e);
    }
  }

  // Send email notification
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@classifiedsuae.ae",
      to: "info@classifiedsuae.ae",
      subject: `🚨 Ad Report: ${report.reason} — ${report.adTitle || report.adId}`,
      text: `New ad report received:\n\nAd: ${report.adTitle}\nURL: ${report.adUrl}\nReason: ${report.reason}\nDetails: ${report.details || "N/A"}\nReporter: ${report.reporterName || "Anonymous"}\nEmail: ${report.reporterEmail || "N/A"}\nPhone: ${report.reporterPhone || "N/A"}`,
    });
  } catch {}
}
