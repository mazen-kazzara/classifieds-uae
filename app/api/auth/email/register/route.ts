import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password, confirmPassword } = await req.json();
    const e = String(email || "").trim().toLowerCase();

    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ ok: false, error: "PASSWORD_TOO_SHORT" }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ ok: false, error: "PASSWORD_MISMATCH" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: e } });
    if (existing?.emailVerified && existing?.password) {
      return NextResponse.json({ ok: false, error: "ALREADY_REGISTERED" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.upsert({
      where: { email: e },
      update: { password: hashed },
      create: { email: e, password: hashed, emailVerified: false, phoneVerified: false, provider: "email" },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("EMAIL REGISTER ERROR:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
