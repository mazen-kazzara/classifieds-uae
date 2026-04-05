import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { packageId } = await req.json();
    const s = await prisma.adSubmission.findUnique({ where: { id } });
    if (!s) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    const imgCost = s.priceImages || 0;
    if (packageId) {
      const pkg = await prisma.package.findUnique({ where: { id: packageId } });
      if (!pkg) return NextResponse.json({ ok: false, error: "PACKAGE_NOT_FOUND" }, { status: 404 });
      let priceTotal: number;
      if (pkg.isFeatured) {
        priceTotal = pkg.price; // Featured: flat 25 AED, images included
      } else {
        priceTotal = Math.min(pkg.price + imgCost, 15); // Normal: 10 base + 2.5/img, max 15
      }
      await prisma.adSubmission.update({ where: { id }, data: { packageId, priceTotal } });
    } else {
      await prisma.adSubmission.update({ where: { id }, data: { packageId: null, priceTotal: 0 } });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: err instanceof Error ? err.message : "" }, { status: 500 });
  }
}
