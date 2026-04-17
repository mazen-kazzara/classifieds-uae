import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { generateSecret, buildOtpAuthUrl } from "@/lib/totp";

/**
 * Generates a new TOTP secret and stores it (NOT yet enabled).
 * The user must then call /enable with a valid code to activate 2FA.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "SUPERVISOR" });
  if (auth.error) return auth.error;

  const user = await prisma.user.findUnique({
    where: { id: auth.token!.id },
    select: { email: true, phone: true, twoFactorEnabled: true },
  });
  if (!user) return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
  if (user.twoFactorEnabled) {
    return NextResponse.json({ ok: false, error: "ALREADY_ENABLED", message: "2FA is already enabled. Disable it first to regenerate." }, { status: 400 });
  }

  const secret = generateSecret();
  await prisma.user.update({
    where: { id: auth.token!.id },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  });

  const label = user.email || user.phone || auth.token!.id;
  const otpauthUrl = buildOtpAuthUrl(secret, label);
  return NextResponse.json({ ok: true, secret, otpauthUrl });
}
