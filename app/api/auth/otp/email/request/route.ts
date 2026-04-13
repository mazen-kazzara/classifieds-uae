import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmailOtp } from "@/lib/email-otp-sender";

const emailStore = new Map<string, { count: number; windowStart: number; lastSent: number }>();

function checkEmailRate(email: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const r = emailStore.get(email);
  if (!r) { emailStore.set(email, { count: 1, windowStart: now, lastSent: now }); return { allowed: true }; }
  if (now - r.lastSent < 60000) return { allowed: false, reason: "RESEND_TOO_SOON" };
  if (now - r.windowStart > 600000) { emailStore.set(email, { count: 1, windowStart: now, lastSent: now }); return { allowed: true }; }
  if (r.count >= 3) return { allowed: false, reason: "EMAIL_RATE_LIMIT" };
  r.count++; r.lastSent = now;
  return { allowed: true };
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const e = String(email || "").trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
    }

    const rate = checkEmailRate(e);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: rate.reason }, { status: 429 });
    }

    // Check if already verified
    const existing = await prisma.user.findUnique({ where: { email: e } });
    if (existing?.emailVerified && existing?.password) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.upsert({
      where: { email: e },
      update: { otpCode: code, otpExpiresAt: expiresAt, otpAttempts: 0 },
      create: { email: e, otpCode: code, otpExpiresAt: expiresAt, otpAttempts: 0, emailVerified: false, phoneVerified: false },
    });

    const result = await sendEmailOtp(e, code);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: "SEND_FAILED" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      ...(result.mockCode ? { mockCode: result.mockCode } : {}),
    });
  } catch (err: any) {
    console.error("EMAIL OTP REQUEST ERROR:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
