import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { generateAdId } from "@/lib/ad-id";

/**
 * Republish pricing logic (server-side, single source of truth):
 * - Paid plan: 50% of original plan price
 * - Free plan: 50% of the next paid plan's price
 */
function calculateRepublishPrice(originalPackage: { name: string; price: number } | null, allPackages: { name: string; price: number; sortOrder: number }[]): number {
  if (!originalPackage) return 0;
  if (originalPackage.price > 0) {
    return Math.ceil(originalPackage.price * 0.5);
  }
  // Free plan → 50% of next plan price
  const sorted = allPackages.filter(p => p.price > 0).sort((a, b) => a.sortOrder - b.sortOrder);
  const nextPlan = sorted[0]; // Basic (cheapest paid)
  return nextPlan ? Math.ceil(nextPlan.price * 0.5) : 0;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const { adId } = await req.json();
    if (!adId) return NextResponse.json({ ok: false, error: "AD_ID_REQUIRED" }, { status: 400 });

    // Find the expired ad
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      include: { submission: { include: { package: true } } },
    });
    if (!ad) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    if (ad.status !== "EXPIRED") return NextResponse.json({ ok: false, error: "AD_NOT_EXPIRED" }, { status: 400 });

    // Verify ownership
    const sessionPhone = (session.user as any)?.phone;
    const sessionUserId = (session.user as any)?.id;
    const submission = ad.submission;
    const isOwner = (sessionUserId && submission.userId === sessionUserId) || (sessionPhone && submission.phone === sessionPhone);
    if (!isOwner) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

    // Calculate republish price
    const allPackages = await prisma.package.findMany({ where: { isActive: true }, select: { name: true, price: true, sortOrder: true } });
    const republishPrice = calculateRepublishPrice(submission.package, allPackages);
    const originalPackage = submission.package;

    // Return pricing info for GET-like check, or process payment
    const body = await req.text().catch(() => "");
    // This endpoint returns the republish price and details
    return NextResponse.json({
      ok: true,
      adId: ad.id,
      originalPlan: originalPackage?.name ?? "Free",
      republishPrice,
      durationDays: originalPackage?.durationDays ?? 14,
      isFree: republishPrice === 0,
    });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: err instanceof Error ? err.message : "" }, { status: 500 });
  }
}
