import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const packages = await prisma.package.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ ok: true, packages });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, nameAr, description, price, durationDays, maxImages, isFeatured, isPinned, includesTelegram, isActive, sortOrder } = body;
    if (!name || !nameAr || price === undefined) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    const d = { name, nameAr, description, price: Number(price), durationDays: Number(durationDays ?? 7), maxImages: Number(maxImages ?? 2), isFeatured: Boolean(isFeatured), isPinned: Boolean(isPinned), includesTelegram: Boolean(includesTelegram), isActive: Boolean(isActive ?? true), sortOrder: Number(sortOrder ?? 0) };
    const pkg = id ? await prisma.package.update({ where: { id }, data: d }) : await prisma.package.create({ data: d });
    return NextResponse.json({ ok: true, package: pkg });
  } catch (err: unknown) { return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: err instanceof Error ? err.message : "" }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "ID_REQUIRED" }, { status: 400 });
  await prisma.package.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
