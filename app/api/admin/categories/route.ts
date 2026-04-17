import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "SUPERVISOR" });
  if (auth.error) return auth.error;
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ ok: true, categories });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "CONTENT_ADMIN" });
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const nameAr = String(body.nameAr ?? "").trim();
    const slug = String(body.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    const icon = body.icon ? String(body.icon).trim() : null;
    const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null;
    const description = body.description ? String(body.description).trim() : null;
    const isActive = Boolean(body.isActive ?? true);
    const sortOrder = Math.max(0, Math.min(9999, Number(body.sortOrder ?? 0)));
    const parentId = body.parentId ? String(body.parentId).trim() : null;

    if (!name || !nameAr || !slug) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    if (name.length > 100 || nameAr.length > 100 || slug.length > 100) return NextResponse.json({ ok: false, error: "FIELD_TOO_LONG" }, { status: 400 });

    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) return NextResponse.json({ ok: false, error: "PARENT_NOT_FOUND" }, { status: 400 });
      // Prevent self-reference
      const existing = await prisma.category.findUnique({ where: { slug } });
      if (existing && existing.id === parentId) return NextResponse.json({ ok: false, error: "CANNOT_BE_OWN_PARENT" }, { status: 400 });
    }

    const category = await prisma.category.upsert({
      where: { slug },
      create: { name, nameAr, slug, icon, imageUrl, description, isActive, sortOrder, parentId },
      update: { name, nameAr, icon, imageUrl, description, isActive, sortOrder, parentId },
    });
    return NextResponse.json({ ok: true, category });
  } catch (err: unknown) {
    console.error("Category POST error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "ADMIN", require2FA: true });
  if (auth.error) return auth.error;
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "ID_REQUIRED" }, { status: 400 });

    // Check if category has children or submissions
    const [childCount, submissionCount] = await Promise.all([
      prisma.category.count({ where: { parentId: id } }),
      prisma.adSubmission.count({ where: { categoryId: id } }),
    ]);
    if (childCount > 0) return NextResponse.json({ ok: false, error: "HAS_SUBCATEGORIES", message: `Cannot delete: ${childCount} subcategories depend on this` }, { status: 400 });
    if (submissionCount > 0) {
      // Soft-delete: mark inactive instead of hard delete
      await prisma.category.update({ where: { id }, data: { isActive: false } });
      return NextResponse.json({ ok: true, softDeleted: true, message: `Category has ${submissionCount} ads — marked inactive instead of deleted` });
    }
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("Category DELETE error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
