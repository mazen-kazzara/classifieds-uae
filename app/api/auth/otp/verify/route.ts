import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkVerifyLimit, recordVerifyFailure, clearVerifyLimit } from "@/lib/otp-rate-limiter";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone: string = (body.phone || "").replace(/[\s+\-()]/g, "");
    const code: string  = (body.code  || "").trim();

    if (!phone || !code) {
      return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    }

    // ── Verify attempt rate limit ───────────────────────────────────────────
    const limit = checkVerifyLimit(phone);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "TOO_MANY_ATTEMPTS", retryAfter: limit.retryAfter },
        { status: 429 }
      );
    }

    // ── Fetch user ──────────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    // ── Check expiry ────────────────────────────────────────────────────────
    if (!user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return NextResponse.json({ ok: false, error: "OTP_EXPIRED" }, { status: 400 });
    }

    // ── Check code ──────────────────────────────────────────────────────────
    if (user.otpCode !== code) {
      recordVerifyFailure(phone);
      await prisma.user.update({
        where: { phone },
        data: { otpAttempts: { increment: 1 } },
      });
      return NextResponse.json({ ok: false, error: "INVALID_CODE" }, { status: 400 });
    }

    // ── Success: clear OTP + mark phone verified ────────────────────────────
    clearVerifyLimit(phone);
    await prisma.user.update({
      where: { phone },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        phoneVerified: true,
      },
    });

    return NextResponse.json({ ok: true, phone: user.phone, id: user.id, name: user.name });

  } catch (err) {
    console.error("OTP verify error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
