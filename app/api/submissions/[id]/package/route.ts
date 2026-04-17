import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { packageId } = await req.json();
    const s = await prisma.adSubmission.findUnique({ where: { id } });
    if (!s) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    if (packageId) {
      const pkg = await prisma.package.findUnique({ where: { id: packageId } });
      // Allow inactive packages only for admin-unlimited (hidden internal plan)
      if (!pkg || (!pkg.isActive && pkg.id !== "admin-unlimited")) return NextResponse.json({ ok: false, error: "PACKAGE_NOT_FOUND" }, { status: 404 });
      // Flat package price — no per-image surcharge
      await prisma.adSubmission.update({ where: { id }, data: { packageId, priceTotal: pkg.price } });
      return NextResponse.json({ ok: true, price: pkg.price, maxChars: pkg.maxChars, maxImages: pkg.maxImages });
    } else {
      // Free plan (no package selected)
      await prisma.adSubmission.update({ where: { id }, data: { packageId: null, priceTotal: 0 } });
      return NextResponse.json({ ok: true, price: 0 });
    }
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: err instanceof Error ? err.message : "" }, { status: 500 });
  }
}
