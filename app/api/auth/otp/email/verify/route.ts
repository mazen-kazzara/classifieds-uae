import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const verifyStore = new Map<string, { attempts: number; blockedUntil: number }>();

function checkVerifyLimit(email: string): boolean {
  const r = verifyStore.get(email);
  if (!r) return true;
  if (r.blockedUntil && Date.now() < r.blockedUntil) return false;
  if (r.blockedUntil && Date.now() >= r.blockedUntil) { verifyStore.delete(email); return true; }
  return r.attempts < 3;
}

function recordFailure(email: string) {
  const r = verifyStore.get(email) || { attempts: 0, blockedUntil: 0 };
  r.attempts++;
  if (r.attempts >= 3) r.blockedUntil = Date.now() + 10 * 60 * 1000;
  verifyStore.set(email, r);
}

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    const e = String(email || "").trim().toLowerCase();
    const c = String(code || "").trim();

    if (!e || !c) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    if (!checkVerifyLimit(e)) return NextResponse.json({ ok: false, error: "TOO_MANY_ATTEMPTS" }, { status: 429 });

    const user = await prisma.user.findUnique({ where: { email: e } });
    if (!user) return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
    if (!user.otpCode || !user.otpExpiresAt) return NextResponse.json({ ok: false, error: "NO_OTP" }, { status: 400 });
    if (user.otpExpiresAt < new Date()) return NextResponse.json({ ok: false, error: "OTP_EXPIRED" }, { status: 400 });

    if (user.otpCode !== c) {
      recordFailure(e);
      await prisma.user.update({ where: { email: e }, data: { otpAttempts: { increment: 1 } } });
      return NextResponse.json({ ok: false, error: "INVALID_CODE" }, { status: 400 });
    }

    await prisma.user.update({
      where: { email: e },
      data: { otpCode: null, otpExpiresAt: null, otpAttempts: 0, emailVerified: true },
    });
    verifyStore.delete(e);

    return NextResponse.json({ ok: true, email: e, id: user.id, name: user.name });
  } catch (err: any) {
    console.error("EMAIL OTP VERIFY ERROR:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
