import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFromAllChannels } from "@/lib/delete-from-channels";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req, { minRole: "SUPERVISOR" });
  if (auth.error) return auth.error;
  const { id } = await context.params;
  const ad = await prisma.ad.findUnique({ where: { id }, include: { media: true } });
  if (!ad) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true, ad });
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req, { minRole: "CONTENT_ADMIN" });
  if (auth.error) return auth.error;
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { title, description, category, status, isFeatured, isPinned, expiresAt, adPrice, isNegotiable } = body;

    // Validate status
    if (status !== undefined && !["PENDING", "APPROVED", "REJECTED", "PUBLISHED", "EXPIRED"].includes(status)) {
      return NextResponse.json({ ok: false, error: "INVALID_STATUS" }, { status: 400 });
    }

    // Validate string length (prevent abuse)
    if (title !== undefined && String(title).length > 200) return NextResponse.json({ ok: false, error: "TITLE_TOO_LONG" }, { status: 400 });
    if (description !== undefined && String(description).length > 10000) return NextResponse.json({ ok: false, error: "DESC_TOO_LONG" }, { status: 400 });
    if (adPrice !== undefined && adPrice !== null && (!Number.isFinite(Number(adPrice)) || Number(adPrice) < 0 || Number(adPrice) > 10_000_000)) {
      return NextResponse.json({ ok: false, error: "INVALID_PRICE" }, { status: 400 });
    }

    const ad = await prisma.ad.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(status !== undefined && { status }),
        ...(isFeatured !== undefined && { isFeatured: Boolean(isFeatured) }),
        ...(isPinned !== undefined && { isPinned: Boolean(isPinned) }),
        ...(expiresAt !== undefined && { expiresAt: new Date(expiresAt) }),
        ...(adPrice !== undefined && { adPrice: adPrice === null ? null : Number(adPrice) }),
        ...(isNegotiable !== undefined && { isNegotiable: Boolean(isNegotiable) }),
      },
    });
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await logAudit({ actorType: "ADMIN", actorId: (auth.token as any).id, ipAddress: ip, action: "UPDATE_AD", entity: "Ad", entityId: id }).catch(() => {});
    return NextResponse.json({ ok: true, ad });
  } catch (err) {
    console.error("Ad PUT error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

/**
 * Soft-delete: marks ad as deleted, removes from all social channels immediately.
 * Ad remains in DB for 7 days for recovery; cron hard-deletes after.
 * Sensitive: requires 2FA step-up.
 */
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req, { minRole: "CONTENT_ADMIN", require2FA: true });
  if (auth.error) return auth.error;
  try {
    const { id } = await context.params;
    const ad = await prisma.ad.findUnique({
      where: { id },
      select: { submissionId: true, telegramMessageId: true, facebookPostId: true, instagramPostId: true, twitterPostId: true, title: true, category: true, deletedAt: true },
    });
    if (!ad) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    if (ad.deletedAt) return NextResponse.json({ ok: false, error: "ALREADY_DELETED" }, { status: 400 });

    // Delete from external channels first (continue even if some fail)
    const channelResults = await deleteFromAllChannels(ad);

    // Soft-delete: mark deletedAt, clear channel IDs (so we don't try deleting them again), hide from public queries
    await prisma.ad.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "EXPIRED",
        telegramMessageId: null,
        facebookPostId: null,
        instagramPostId: null,
        twitterPostId: null,
      },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await logAudit({
      actorType: "ADMIN", actorId: auth.token!.id, ipAddress: ip,
      action: "SOFT_DELETE_AD", entity: "Ad", entityId: id,
      payload: { deletedFrom: ["website", ...channelResults], title: ad.title, category: ad.category },
    }).catch(() => {});

    return NextResponse.json({ ok: true, deletedFrom: ["website", ...channelResults], softDeleted: true, recoveryWindow: "7 days" });
  } catch (err) {
    console.error("Ad DELETE error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
