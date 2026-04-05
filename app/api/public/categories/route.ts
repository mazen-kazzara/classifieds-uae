import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET() {
  try {
    const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, nameAr: true, slug: true, icon: true } });
    return NextResponse.json({ ok: true, categories });
  } catch { return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 }); }
}
