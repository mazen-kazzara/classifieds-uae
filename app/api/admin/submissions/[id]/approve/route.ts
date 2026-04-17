import { generateAdId } from "@/lib/ad-id";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req, { minRole: "CONTENT_ADMIN" });
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    const submission = await prisma.adSubmission.findUnique({ where: { id }, include: { ad: true, package: true } });
    if (!submission) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    const durationDays = submission.package?.durationDays ?? 14;
    const now = new Date(), expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    let ad;
    if (submission.ad) {
      ad = await prisma.ad.update({ where: { id: submission.ad.id }, data: { status: "PUBLISHED", publishedAt: now, expiresAt } });
    } else {
      const rawText = (submission.text || "").trim();
      ad = await prisma.ad.create({ data: { id: generateAdId(), submissionId: submission.id, title: submission.title || rawText.split(/\s+/).slice(0,6).join(" "), description: rawText, category: submission.categoryName || "General", contentType: submission.contentType || "ad", contactPhone: submission.contactPhone, whatsappNumber: submission.whatsappNumber, telegramChatId: submission.telegramChatId, status: "PUBLISHED", publishedAt: now, expiresAt } });
    }
    await prisma.adSubmission.update({ where: { id }, data: { status: "PUBLISHED" } });
    return NextResponse.json({ ok: true, adId: ad.id, status: "PUBLISHED", expiresAt });
  } catch (err: unknown) { return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: err instanceof Error ? err.message : "" }, { status: 500 }); }
}
