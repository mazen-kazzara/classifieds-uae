import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const parentId = req.nextUrl.searchParams.get("parentId");
    const where: any = { isActive: true };
    // Default: only main categories (parentId is null)
    // Pass ?parentId=<id> to get subcategories of a specific parent
    // Pass ?parentId=all to get all categories
    if (parentId === "all") {
      // no parentId filter
    } else if (parentId) {
      where.parentId = parentId;
    } else {
      where.parentId = null;
    }
    const categories = await prisma.category.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, nameAr: true, slug: true, icon: true, imageUrl: true, parentId: true },
    });
    return NextResponse.json({ ok: true, categories });
  } catch { return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 }); }
}
