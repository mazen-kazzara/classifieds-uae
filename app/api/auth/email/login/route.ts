import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const store = new Map<string, { failures: number; blockedUntil: number; windowStart: number }>();

function checkLimit(email: string): { allowed: boolean; remainingAttempts?: number; retryAfter?: number } {
  const now = Date.now();
  const r = store.get(email);
  if (!r) return { allowed: true, remainingAttempts: 5 };
  if (r.blockedUntil && now < r.blockedUntil) return { allowed: false, retryAfter: Math.ceil((r.blockedUntil - now) / 1000) };
  if (r.blockedUntil && now >= r.blockedUntil) { store.delete(email); return { allowed: true, remainingAttempts: 5 }; }
  if (now - r.windowStart > 900000) { store.delete(email); return { allowed: true, remainingAttempts: 5 }; }
  return { allowed: r.failures < 5, remainingAttempts: Math.max(0, 5 - r.failures) };
}

function recordFailure(email: string) {
  const now = Date.now();
  const r = store.get(email) || { failures: 0, blockedUntil: 0, windowStart: now };
  r.failures++;
  if (r.failures >= 5) r.blockedUntil = now + 900000;
  store.set(email, r);
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const e = String(email || "").trim().toLowerCase();
    if (!e || !password) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });

    const limit = checkLimit(e);
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "TOO_MANY_ATTEMPTS", retryAfter: limit.retryAfter }, { status: 429 });

    const user = await prisma.user.findUnique({ where: { email: e } });
    if (!user) return NextResponse.json({ ok: false, error: "NOT_REGISTERED" }, { status: 404 });
    if (!user.password) return NextResponse.json({ ok: false, error: "NO_PASSWORD" }, { status: 400 });
    if (!user.emailVerified) return NextResponse.json({ ok: false, error: "EMAIL_NOT_VERIFIED" }, { status: 403 });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      recordFailure(e);
      return NextResponse.json({ ok: false, error: "WRONG_PASSWORD", remainingAttempts: Math.max(0, (limit.remainingAttempts ?? 5) - 1) }, { status: 401 });
    }

    store.delete(e);
    return NextResponse.json({ ok: true, email: e, id: user.id });
  } catch (err: any) {
    console.error("EMAIL LOGIN ERROR:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
