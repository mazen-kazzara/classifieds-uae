import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function validateUAEPhone(phone: string): boolean {
  return /^9715[0-9]{8}$/.test(phone);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone: string = (body.phone || "").replace(/[\s+\-()]/g, "");
    const password: string = body.password || "";
    const confirmPassword: string = body.confirmPassword || "";

    // ── Validate ────────────────────────────────────────────────────────────
    if (!phone || !password || !confirmPassword) {
      return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    }
    if (!validateUAEPhone(phone)) {
      return NextResponse.json({ ok: false, error: "INVALID_PHONE" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: "PASSWORD_TOO_SHORT" }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ ok: false, error: "PASSWORD_MISMATCH" }, { status: 400 });
    }

    // ── Check if already registered ─────────────────────────────────────────
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing?.phoneVerified && existing?.password) {
      return NextResponse.json({ ok: false, error: "ALREADY_REGISTERED" }, { status: 409 });
    }

    // ── Hash password + upsert user (unverified) ────────────────────────────
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.upsert({
      where: { phone },
      create: { phone, password: hashed, phoneVerified: false },
      update: { password: hashed },
    });

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
