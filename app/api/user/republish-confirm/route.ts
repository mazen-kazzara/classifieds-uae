import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

/**
 * Confirms a republish and either:
 *  - Republishes immediately (free path: price === 0)
 *  - Creates a Ziina payment intent and returns checkoutUrl (paid path)
 *
 * The Payment record is tagged with an "isRepublish" marker in rawPayload so the webhook
 * knows to REVIVE the existing ad instead of creating a new one.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const { adId } = await req.json();
    if (!adId) return NextResponse.json({ ok: false, error: "AD_ID_REQUIRED" }, { status: 400 });

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

    // ── Calculate republish price (backend = source of truth) ────────────────
    const allPackages = await prisma.package.findMany({
      where: { isActive: true },
      select: { id: true, name: true, price: true, sortOrder: true, durationDays: true },
    });
    const originalPackage = submission.package;
    let republishPrice = 0;
    let republishDurationDays = originalPackage?.durationDays ?? 14;
    if (originalPackage && originalPackage.price > 0) {
      // Paid plan → 50% of original price
      republishPrice = Math.ceil(originalPackage.price * 0.5);
    } else {
      // Free plan → 50% of the cheapest paid plan's price
      const sortedPaid = allPackages.filter(p => p.price > 0).sort((a, b) => a.sortOrder - b.sortOrder);
      const nextPlan = sortedPaid[0];
      if (nextPlan) {
        republishPrice = Math.ceil(nextPlan.price * 0.5);
        republishDurationDays = nextPlan.durationDays;
      }
    }

    // ── FREE REPUBLISH (price === 0) ─────────────────────────────────────────
    if (republishPrice === 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + republishDurationDays);

      await prisma.ad.update({
        where: { id: adId },
        data: { status: "PUBLISHED", publishedAt: new Date(), expiresAt, deletedAt: null },
      });
      await prisma.adSubmission.update({
        where: { id: submission.id },
        data: { status: "PUBLISHED" },
      });

      return NextResponse.json({ ok: true, republished: true, free: true, adId });
    }

    // ── PAID REPUBLISH: create Ziina payment intent ──────────────────────────
    // Mark payment with isRepublish=true in rawPayload so the webhook knows to
    // REVIVE the existing ad instead of creating a new one.
    const provisionalRef = `REPUB_${randomUUID()}`;
    const payment = await prisma.payment.create({
      data: {
        submissionId: submission.id,
        provider: "ziina",
        amount: republishPrice,
        currency: "AED",
        status: "PENDING",
        providerRef: provisionalRef,
        rawPayload: { isRepublish: true, adId, durationDays: republishDurationDays } as any,
      },
    });

    if (!process.env.ZIINA_API_KEY || !process.env.ZIINA_BASE_URL) {
      return NextResponse.json({ ok: false, error: "PAYMENT_GATEWAY_NOT_CONFIGURED" }, { status: 500 });
    }

    const ziinaRes = await fetch(process.env.ZIINA_BASE_URL!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ZIINA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: republishPrice * 100,
        currency_code: "AED",
        message: `Republish ad ${adId} — Classifieds UAE`,
        success_url: `${process.env.APP_URL}/success?submissionId=${submission.id}&republish=1`,
        cancel_url: `${process.env.APP_URL}/cancel?submissionId=${submission.id}&republish=1`,
        test: process.env.ZIINA_TEST_MODE === "true",
        metadata: { submissionId: submission.id, paymentId: payment.id, isRepublish: "true", adId },
      }),
    });

    const ziina = await ziinaRes.json();
    if (!ziinaRes.ok || !ziina?.id || !ziina?.redirect_url) {
      return NextResponse.json({ ok: false, error: "PAYMENT_GATEWAY_ERROR", detail: ziina }, { status: 502 });
    }

    // Update payment with real Ziina ref
    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerRef: ziina.id },
    });

    return NextResponse.json({
      ok: true,
      republished: false,
      republishPrice,
      checkoutUrl: ziina.redirect_url,
      submissionId: submission.id,
    });
  } catch (err: unknown) {
    console.error("republish-confirm error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: err instanceof Error ? err.message : "" }, { status: 500 });
  }
}
