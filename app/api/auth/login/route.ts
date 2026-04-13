import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkLoginLimit, recordLoginFailure, clearLoginLimit } from "@/lib/login-rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const body = await req.json().catch(() => ({}));
    const phone: string = (body.phone || "").replace(/[\s+\-()]/g, "");
    const password: string = body.password || "";

    if (!phone || !password) {
      return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    }

    // ── Rate limit ──────────────────────────────────────────────────────────
    const limit = checkLoginLimit(phone);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "TOO_MANY_ATTEMPTS", retryAfter: limit.retryAfter },
        { status: 429 }
      );
    }

    // ── Find user ───────────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return NextResponse.json({ ok: false, error: "NOT_REGISTERED" }, { status: 404 });
    }
    if (!user.password) {
      return NextResponse.json({ ok: false, error: "NO_PASSWORD" }, { status: 400 });
    }
    if (!user.phoneVerified) {
      return NextResponse.json({ ok: false, error: "PHONE_NOT_VERIFIED" }, { status: 403 });
    }

    // ── Check password ──────────────────────────────────────────────────────
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      recordLoginFailure(phone);
      const remaining = limit.remainingAttempts - 1;
      return NextResponse.json(
        { ok: false, error: "WRONG_PASSWORD", remainingAttempts: remaining },
        { status: 401 }
      );
    }

    clearLoginLimit(phone);
    return NextResponse.json({ ok: true, phone: user.phone, id: user.id });

  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
