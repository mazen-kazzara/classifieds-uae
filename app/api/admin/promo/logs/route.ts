import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "SUPERVISOR" });
  if (auth.error) return auth.error;

  const logs = await prisma.promoLog.findMany({
    orderBy: { publishedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ ok: true, count: logs.length, logs });
}
