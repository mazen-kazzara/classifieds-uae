import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const category = searchParams.get("category");
  const emirate = searchParams.get("emirate");
  const q = searchParams.get("q");
  const type = searchParams.get("type");

  const where: any = { status: "PUBLISHED", deletedAt: null };
  if (category) where.categorySlug = category;
  if (emirate) where.emirate = emirate;
  if (type) where.type = type;
  if (q) {
    where.OR = [
      { titleAr: { contains: q, mode: "insensitive" } },
      { titleEn: { contains: q, mode: "insensitive" } },
      { descriptionAr: { contains: q, mode: "insensitive" } },
      { descriptionEn: { contains: q, mode: "insensitive" } },
    ];
  }

  const [ads, total] = await Promise.all([
    prisma.ad.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
      include: { media: { take: 1 } },
    }),
    prisma.ad.count({ where }),
  ]);

  return NextResponse.json({
    ads,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
