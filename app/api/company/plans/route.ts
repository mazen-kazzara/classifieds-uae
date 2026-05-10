import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const plans = await prisma.companyPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        nameAr: true,
        description: true,
        descriptionAr: true,
        price: true,
        currency: true,
        billingCycle: true,
        maxActivities: true,
        maxAdChars: true,
        maxAdImages: true,
        unlimitedAds: true,
      },
    });
    return NextResponse.json({ ok: true, plans });
  } catch (err) {
    console.error("[CompanyPlans] Error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
