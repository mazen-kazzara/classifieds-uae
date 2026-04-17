import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "SUPERVISOR" });
  if (auth.error) return auth.error;
  const user = await prisma.user.findUnique({
    where: { id: auth.token!.id },
    select: { twoFactorEnabled: true, email: true },
  });
  return NextResponse.json({ ok: true, enabled: !!user?.twoFactorEnabled });
}
