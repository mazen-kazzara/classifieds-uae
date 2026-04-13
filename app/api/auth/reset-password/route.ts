import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone: string = (body.phone || "").replace(/[\s+\-()]/g, "");
    const code: string = body.code || "";
    const password: string = body.password || "";
    const confirmPassword: string = body.confirmPassword || "";

    if (!phone || !code || !password || !confirmPassword) {
      return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: "PASSWORD_TOO_SHORT" }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ ok: false, error: "PASSWORD_MISMATCH" }, { status: 400 });
    }

    // ── Find user and update password (OTP already verified in previous step) ──
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });

    // Update password
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { phone },
      data: { password: hashed, otpCode: null, otpExpiresAt: null, otpAttempts: 0, phoneVerified: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
