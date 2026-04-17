import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET() {
  try {
    const packages = await prisma.package.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
    // Add computed fields for promo status
    const now = new Date();
    const enriched = packages.map(pkg => ({
      ...pkg,
      isPromoActive: pkg.promoEndDate ? now < pkg.promoEndDate : false,
      promoEndDate: pkg.promoEndDate?.toISOString() ?? null,
    }));
    return NextResponse.json({ ok: true, packages: enriched });
  } catch { return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 }); }
}
