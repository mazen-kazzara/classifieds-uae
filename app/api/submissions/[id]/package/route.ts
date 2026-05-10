import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFreePlanNames, isUAEFlagAvailable } from "@/lib/plan-config";

// Free plan names — dynamically excludes UAE Flag after May 1 2026
const FREE_PLAN_NAMES = getFreePlanNames();

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { packageId } = await req.json();
    const s = await prisma.adSubmission.findUnique({
      where: { id },
      include: { company: { include: { plan: true } } },
    });
    if (!s) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    // Company submission: subscription locks the plan — no package selection needed.
    const isActiveCompany = !!(
      s.companyId && s.company &&
      s.company.subscriptionStatus === "ACTIVE" &&
      (!s.company.subscriptionEndsAt || s.company.subscriptionEndsAt > new Date())
    );
    if (isActiveCompany) {
      // Force priceTotal=0 (subscription covers it) and report the company plan limits.
      await prisma.adSubmission.update({ where: { id }, data: { packageId: null, priceTotal: 0 } });
      return NextResponse.json({
        ok: true, price: 0,
        maxChars: s.company!.plan!.maxAdChars,
        maxImages: s.company!.plan!.maxAdImages,
        company: true,
        planName: s.company!.plan!.name,
      });
    }

    if (packageId) {
      const pkg = await prisma.package.findUnique({ where: { id: packageId } });
      // Allow inactive packages only for admin-unlimited (hidden internal plan)
      if (!pkg || (!pkg.isActive && pkg.id !== "admin-unlimited")) return NextResponse.json({ ok: false, error: "PACKAGE_NOT_FOUND" }, { status: 404 });

      // Enforce daily limit for FREE plans only (Free + UAE Flag)
      const isFreePlan = pkg.price === 0 && FREE_PLAN_NAMES.includes(pkg.name);
      if (isFreePlan && pkg.id !== "admin-unlimited") {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        // Count free ads published in last 24h by this phone
        const freeAdsCount = await prisma.adSubmission.count({
          where: {
            phone: s.phone,
            createdAt: { gte: since },
            id: { not: id }, // Don't count the current draft
            package: { name: { in: FREE_PLAN_NAMES } },
            status: { not: "DRAFT" },
          },
        });
        if (freeAdsCount >= 5) {
          return NextResponse.json({
            ok: false,
            error: "FREE_DAILY_LIMIT_REACHED",
            message: "You have reached the daily limit of 5 free ads. Choose a paid plan to continue.",
            messageAr: "لقد وصلت للحد اليومي من 5 إعلانات مجانية. اختر خطة مدفوعة للمتابعة.",
          }, { status: 429 });
        }
      }

      // Flat package price — no per-image surcharge
      await prisma.adSubmission.update({ where: { id }, data: { packageId, priceTotal: pkg.price } });
      return NextResponse.json({ ok: true, price: pkg.price, maxChars: pkg.maxChars, maxImages: pkg.maxImages });
    } else {
      // No package selected (null) — treat as free, apply same limit
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const freeAdsCount = await prisma.adSubmission.count({
        where: {
          phone: s.phone,
          createdAt: { gte: since },
          id: { not: id },
          OR: [
            { package: { name: { in: FREE_PLAN_NAMES } } },
            { packageId: null },
          ],
          status: { not: "DRAFT" },
        },
      });
      if (freeAdsCount >= 5) {
        return NextResponse.json({
          ok: false,
          error: "FREE_DAILY_LIMIT_REACHED",
          message: "You have reached the daily limit of 5 free ads. Choose a paid plan to continue.",
          messageAr: "لقد وصلت للحد اليومي من 5 إعلانات مجانية. اختر خطة مدفوعة للمتابعة.",
        }, { status: 429 });
      }
      await prisma.adSubmission.update({ where: { id }, data: { packageId: null, priceTotal: 0 } });
      return NextResponse.json({ ok: true, price: 0 });
    }
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: "An error occurred" }, { status: 500 });
  }
}
