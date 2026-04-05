import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtp } from "@/lib/otp-sender";

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    if (!phone || !/^[0-9]{9,15}$/.test(phone.replace(/\s/g, ""))) {
      return NextResponse.json({ ok: false, error: "INVALID_PHONE" }, { status: 400 });
    }
    const cleanPhone = phone.replace(/\s/g, "");
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.user.upsert({
      where: { phone: cleanPhone },
      create: { phone: cleanPhone, otpCode: code, otpExpiresAt: expiresAt, otpAttempts: 0 },
      update: { otpCode: code, otpExpiresAt: expiresAt, otpAttempts: 0 },
    });

    await sendOtp(cleanPhone, code);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("OTP request error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
