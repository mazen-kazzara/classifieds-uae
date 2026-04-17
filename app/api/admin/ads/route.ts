import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "SUPERVISOR" });
  if (auth.error) return auth.error;

  try {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(parseInt(sp.get("page") || "1"), 1);
    const limit = Math.min(Math.max(parseInt(sp.get("limit") || "20"), 1), 100);
    const rawSearch = sp.get("search")?.trim() ?? "";
    const search = rawSearch.length > 200 ? rawSearch.slice(0, 200) : rawSearch;
    const status = sp.get("status");
    const category = sp.get("category");
    const type = sp.get("type");
    const view = sp.get("view") ?? "active"; // "active" (default), "deleted", "all"

    const deletedFilter = view === "deleted" ? { deletedAt: { not: null } }
      : view === "all" ? {}
      : { deletedAt: null };

    const where: any = {
      ...deletedFilter,
      ...(status ? { status } : {}),
      ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
      ...(type ? { contentType: type } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { id: { contains: search, mode: "insensitive" } },
          { category: { contains: search, mode: "insensitive" } },
          { contactPhone: { contains: search } },
          { whatsappNumber: { contains: search } },
        ],
      } : {}),
    };

    const [totalCount, ads] = await Promise.all([
      prisma.ad.count({ where }),
      prisma.ad.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, title: true, description: true, category: true, contentType: true, status: true,
          isFeatured: true, isPinned: true, publishedAt: true, expiresAt: true, createdAt: true,
          viewsCount: true, adPrice: true, isNegotiable: true, deletedAt: true,
          telegramMessageId: true, facebookPostId: true, instagramPostId: true, twitterPostId: true,
          media: { select: { url: true, position: true }, orderBy: { position: "asc" }, take: 1 },
        },
      }),
    ]);

    return NextResponse.json({ ok: true, page, limit, totalCount, totalPages: Math.ceil(totalCount / limit), ads });
  } catch (err: unknown) {
    console.error("Admin ads GET error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
