import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "SUPERVISOR" });
  if (auth.error) return auth.error;
  try {
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status");
    const search = sp.get("search")?.trim();
    const page = Math.max(parseInt(sp.get("page") || "1"), 1);
    const limit = 20;
    const where: any = {
      ...(status ? { status } : {}),
      ...(search ? {
        OR: [
          { phone: { contains: search } },
          { text: { contains: search, mode: "insensitive" } },
          { title: { contains: search, mode: "insensitive" } },
          { id: { contains: search, mode: "insensitive" } },
          { categoryName: { contains: search, mode: "insensitive" } },
          { contactPhone: { contains: search } },
        ],
      } : {}),
    };
    const [submissions, total] = await Promise.all([
      prisma.adSubmission.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page-1)*limit, take: limit, include: { payment: true, ad: { select: { id: true, status: true } } } }),
      prisma.adSubmission.count({ where }),
    ]);
    return NextResponse.json({ ok: true, submissions, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err: unknown) { return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: err instanceof Error ? err.message : "" }, { status: 500 }); }
}
