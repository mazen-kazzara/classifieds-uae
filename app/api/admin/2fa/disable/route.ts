import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { verifyTOTP } from "@/lib/totp";
import { logAudit } from "@/lib/audit";

/**
 * Disables 2FA — requires a valid current TOTP code to confirm identity.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "SUPERVISOR" });
  if (auth.error) return auth.error;

  const { code } = await req.json().catch(() => ({}));
  if (!code || !/^\d{6}$/.test(String(code))) {
    return NextResponse.json({ ok: false, error: "INVALID_CODE" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.token!.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });
  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    return NextResponse.json({ ok: false, error: "NOT_ENABLED" }, { status: 400 });
  }
  if (!verifyTOTP(String(code), user.twoFactorSecret)) {
    return NextResponse.json({ ok: false, error: "INVALID_CODE" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: auth.token!.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  await logAudit({
    actorType: "ADMIN", actorId: auth.token!.id, ipAddress: ip,
    action: "DISABLE_2FA", entity: "User", entityId: auth.token!.id,
  }).catch(() => {});

  return NextResponse.json({ ok: true, enabled: false });
}
