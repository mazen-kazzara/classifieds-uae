import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

/**
 * Restores a soft-deleted ad. Does NOT re-publish to social channels
 * (admin must republish separately if needed).
 */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req, { minRole: "CONTENT_ADMIN" });
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const ad = await prisma.ad.findUnique({
      where: { id },
      select: { deletedAt: true, expiresAt: true },
    });
    if (!ad) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    if (!ad.deletedAt) return NextResponse.json({ ok: false, error: "NOT_DELETED" }, { status: 400 });

    // Extend expiry if the original was already past
    const now = new Date();
    const newExpiry = ad.expiresAt > now ? ad.expiresAt : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await prisma.ad.update({
      where: { id },
      data: { deletedAt: null, status: "PUBLISHED", expiresAt: newExpiry },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await logAudit({
      actorType: "ADMIN", actorId: auth.token!.id, ipAddress: ip,
      action: "RESTORE_AD", entity: "Ad", entityId: id,
    }).catch(() => {});

    return NextResponse.json({ ok: true, restored: true, newExpiresAt: newExpiry });
  } catch (err) {
    console.error("Ad RESTORE error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
