import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  // Audit log visible to ADMIN only (not SUPERVISOR/CONTENT_ADMIN)
  const auth = await requireAdmin(req, { minRole: "ADMIN" });
  if (auth.error) return auth.error;

  try {
    const sp = req.nextUrl.searchParams;
    const limit = Math.min(Math.max(parseInt(sp.get("limit") || "100"), 1), 500);
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { id: true, email: true, phone: true, role: true } } },
    });
    return NextResponse.json({ ok: true, count: logs.length, logs });
  } catch (err: unknown) {
    console.error("Audit GET error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
