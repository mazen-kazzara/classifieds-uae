import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "SUPERVISOR" });
  if (auth.error) return auth.error;
  const packages = await prisma.package.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ ok: true, packages });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "CONTENT_ADMIN" });
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    const id = body.id ? String(body.id) : null;
    const name = String(body.name ?? "").trim();
    const nameAr = String(body.nameAr ?? "").trim();
    const description = body.description ? String(body.description).trim().slice(0, 500) : null;
    const price = Math.max(0, Math.min(99999, Number(body.price ?? 0)));
    const durationDays = Math.max(1, Math.min(365, Number(body.durationDays ?? 7)));
    const maxChars = Math.max(50, Math.min(10000, Number(body.maxChars ?? 300)));
    const maxImages = Math.max(0, Math.min(20, Number(body.maxImages ?? 2)));
    const isFeatured = Boolean(body.isFeatured);
    const isPinned = Boolean(body.isPinned);
    const includesTelegram = Boolean(body.includesTelegram);
    const isActive = Boolean(body.isActive ?? true);
    const sortOrder = Math.max(0, Math.min(9999, Number(body.sortOrder ?? 0)));
    const promoEndDate = body.promoEndDate ? new Date(body.promoEndDate) : null;

    if (!name || !nameAr || body.price === undefined) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    if (name.length > 50 || nameAr.length > 50) return NextResponse.json({ ok: false, error: "FIELD_TOO_LONG" }, { status: 400 });

    const data = { name, nameAr, description, price, durationDays, maxChars, maxImages, isFeatured, isPinned, includesTelegram, isActive, sortOrder, promoEndDate };
    const pkg = id ? await prisma.package.update({ where: { id }, data }) : await prisma.package.create({ data });
    return NextResponse.json({ ok: true, package: pkg });
  } catch (err: unknown) {
    console.error("Package POST error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "ADMIN", require2FA: true });
  if (auth.error) return auth.error;
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "ID_REQUIRED" }, { status: 400 });

    // If any submissions reference this package, soft-delete instead
    const submissionCount = await prisma.adSubmission.count({ where: { packageId: id } });
    if (submissionCount > 0) {
      await prisma.package.update({ where: { id }, data: { isActive: false } });
      return NextResponse.json({ ok: true, softDeleted: true, message: `Package has ${submissionCount} ads — marked inactive instead of deleted` });
    }
    await prisma.package.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("Package DELETE error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
