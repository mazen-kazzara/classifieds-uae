import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

const ipStore = new Map<string, { count: number; windowStart: number }>();
function checkRL(ip: string) {
  const now = Date.now();
  if (!ipStore.has(ip)) { ipStore.set(ip, { count: 1, windowStart: now }); return true; }
  const r = ipStore.get(ip)!;
  if (now - r.windowStart > 60000) { ipStore.set(ip, { count: 1, windowStart: now }); return true; }
  if (r.count >= 60) return false;
  r.count++; return true;
}

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRL(ip)) return NextResponse.json({ ok: false, error: "RATE_LIMIT_EXCEEDED" }, { status: 429 });
    const now = new Date();
    const sp = req.nextUrl.searchParams;
    const page = Math.max(parseInt(sp.get("page") || "1"), 1);
    const limit = Math.min(Math.max(parseInt(sp.get("limit") || "10"), 1), 50);
    const rawSearch = sp.get("search")?.trim() ?? "";
    const search = rawSearch.length > 200 ? rawSearch.slice(0, 200) : rawSearch;
    // PUBLIC-ONLY: PUBLISHED + not-expired + not-soft-deleted. Admin must use /api/admin/ads
    const where: any = {
      status: "PUBLISHED",
      expiresAt: { gt: now },
      deletedAt: null,
      ...(sp.get("category") ? { category: { equals: sp.get("category")!, mode: "insensitive" } } : {}),
      ...(sp.get("type") ? { contentType: sp.get("type")! } : {}),
      ...(sp.get("featured") === "true" ? { isFeatured: true } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    };
    const orderBy = [{ isPinned: "desc" as const }, { isFeatured: "desc" as const }, { publishedAt: "desc" as const }];
    const [totalCount, ads] = await Promise.all([
      prisma.ad.count({ where }),
      prisma.ad.findMany({
        where, orderBy, skip: (page-1)*limit, take: limit,
        select: {
          id: true, title: true, description: true, category: true, contentType: true,
          isFeatured: true, isPinned: true, publishedAt: true, expiresAt: true, viewsCount: true,
          adPrice: true, isNegotiable: true,
          media: { select: { url: true, position: true }, orderBy: { position: "asc" }, take: 1 },
        },
      }),
    ]);
    return NextResponse.json({ ok: true, page, limit, totalCount, totalPages: Math.ceil(totalCount / limit), ads });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: err instanceof Error ? err.message : "" }, { status: 500 });
  }
}
