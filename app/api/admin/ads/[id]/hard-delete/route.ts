import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

/**
 * HARD delete — permanent removal from database.
 * Requires ADMIN role + 2FA. Used for already soft-deleted ads.
 */
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req, { minRole: "ADMIN", require2FA: true });
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const ad = await prisma.ad.findUnique({
      where: { id },
      select: { submissionId: true, title: true, deletedAt: true },
    });
    if (!ad) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    await prisma.$transaction([
      prisma.media.deleteMany({ where: { adId: id } }),
      prisma.ad.delete({ where: { id } }),
      prisma.submissionMedia.deleteMany({ where: { submissionId: ad.submissionId } }),
      prisma.payment.deleteMany({ where: { submissionId: ad.submissionId } }),
      prisma.adSubmission.delete({ where: { id: ad.submissionId } }),
    ]);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await logAudit({
      actorType: "ADMIN", actorId: auth.token!.id, ipAddress: ip,
      action: "HARD_DELETE_AD", entity: "Ad", entityId: id,
      payload: { title: ad.title, wasAlreadyDeleted: !!ad.deletedAt },
    }).catch(() => {});

    return NextResponse.json({ ok: true, permanentlyDeleted: true });
  } catch (err) {
    console.error("Ad HARD DELETE error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
