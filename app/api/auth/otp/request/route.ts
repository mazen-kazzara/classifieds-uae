import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtp } from "@/lib/otp-sender";
import { checkOtpSendLimit } from "@/lib/otp-rate-limiter";

/** UAE-only: must be 9715XXXXXXXX (12 digits, 4th digit = 5) */
function validateUAEPhone(phone: string): boolean {
  return /^9715[0-9]{8}$/.test(phone);
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const body = await req.json().catch(() => ({}));
    const phone: string = (body.phone || "").replace(/[\s+\-()]/g, "");

    // ── Validate UAE phone ──────────────────────────────────────────────────
    if (!validateUAEPhone(phone)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_PHONE", message: "Must be a valid UAE number: 9715XXXXXXXX" },
        { status: 400 }
      );
    }

    // ── Rate limiting ───────────────────────────────────────────────────────
    const limit = checkOtpSendLimit(phone, ip);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: limit.reason, retryAfter: limit.retryAfter },
        { status: 429 }
      );
    }

    // ── Already verified? Skip OTP (unless forced for password reset) ─────────
    const forceReset = body.forceReset === true;
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing?.phoneVerified && !forceReset) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    // ── Generate + store OTP ────────────────────────────────────────────────
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.upsert({
      where: { phone },
      create: { phone, otpCode: code, otpExpiresAt: expiresAt, otpAttempts: 0 },
      update: { otpCode: code, otpExpiresAt: expiresAt, otpAttempts: 0 },
    });

    // ── Send OTP ────────────────────────────────────────────────────────────
    const result = await sendOtp(phone, code);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: "SEND_FAILED", message: result.error },
        { status: 502 }
      );
    }

    // In mock mode return the code so dev can verify without SMS
    return NextResponse.json({
      ok: true,
      ...(result.mockCode ? { mockCode: result.mockCode } : {}),
    });

  } catch (err) {
    console.error("OTP request error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
