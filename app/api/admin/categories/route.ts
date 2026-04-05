import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ ok: true, categories });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, nameAr, slug, icon, description, isActive, sortOrder } = body;
    if (!name || !nameAr || !slug) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    const category = await prisma.category.upsert({
      where: { slug },
      create: { name, nameAr, slug, icon, description, isActive: isActive ?? true, sortOrder: sortOrder ?? 0 },
      update: { name, nameAr, icon, description, isActive: isActive ?? true, sortOrder: sortOrder ?? 0 },
    });
    return NextResponse.json({ ok: true, category });
  } catch (err: unknown) { return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: err instanceof Error ? err.message : "" }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "ID_REQUIRED" }, { status: 400 });
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
