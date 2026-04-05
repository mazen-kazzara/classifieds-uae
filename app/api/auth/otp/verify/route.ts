import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();
    if (!phone || !code) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });

    if ((user.otpAttempts ?? 0) >= 5) {
      return NextResponse.json({ ok: false, error: "TOO_MANY_ATTEMPTS" }, { status: 429 });
    }
    if (!user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return NextResponse.json({ ok: false, error: "OTP_EXPIRED" }, { status: 400 });
    }
    if (user.otpCode !== code) {
      await prisma.user.update({ where: { phone }, data: { otpAttempts: { increment: 1 } } });
      return NextResponse.json({ ok: false, error: "INVALID_CODE" }, { status: 400 });
    }

    // Clear OTP after successful verify
    await prisma.user.update({
      where: { phone },
      data: { otpCode: null, otpExpiresAt: null, otpAttempts: 0 },
    });

    return NextResponse.json({ ok: true, phone: user.phone, id: user.id, name: user.name });
  } catch (err) {
    console.error("OTP verify error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
