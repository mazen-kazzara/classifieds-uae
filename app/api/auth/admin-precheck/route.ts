import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const ADMIN_ROLES = ["ADMIN", "CONTENT_ADMIN", "SUPERVISOR"];

// Simple IP rate limiter (in-process): 10 attempts/minute
const rl = new Map<string, { count: number; windowStart: number }>();
function checkRL(ip: string): boolean {
  const now = Date.now();
  const entry = rl.get(ip);
  if (!entry || now - entry.windowStart > 60_000) {
    rl.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

/**
 * Pre-check admin credentials to decide whether to show the 2FA field.
 * Does NOT create a session — that happens via NextAuth's signIn afterwards.
 *
 * Returns:
 *  - { ok: true, need2FA: true }  → frontend shows the OTP input
 *  - { ok: true, need2FA: false } → frontend calls signIn directly
 *  - { ok: false, error: ... }    → credentials invalid
 *
 * Always takes a constant amount of time (bcrypt.compare on a dummy hash if user missing)
 * to prevent user enumeration via timing.
 */
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8Z9T4mZ7MJ3X4H5yGJDjIqUjUe4JRe"; // bcrypt("x")

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRL(ip)) {
    return NextResponse.json({ ok: false, error: "RATE_LIMIT_EXCEEDED" }, { status: 429 });
  }

  try {
    const { email, password } = await req.json().catch(() => ({}));
    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { email: true, password: true, role: true, twoFactorEnabled: true },
    });

    // Constant-time comparison: if user missing, still run bcrypt.
    const hash = user?.password || DUMMY_HASH;
    const passwordValid = await bcrypt.compare(password, hash);

    if (!user || !passwordValid || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ ok: false, error: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    return NextResponse.json({ ok: true, need2FA: !!user.twoFactorEnabled });
  } catch (err) {
    console.error("admin-precheck error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
