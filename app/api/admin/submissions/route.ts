import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    if (token.role !== "ADMIN" && token.role !== "SUPERVISOR") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status");
    const page = Math.max(parseInt(sp.get("page") || "1"), 1);
    const limit = 20;
    const where = status ? { status: status as never } : {};
    const [submissions, total] = await Promise.all([
      prisma.adSubmission.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page-1)*limit, take: limit, include: { payment: true, ad: { select: { id: true, status: true } } } }),
      prisma.adSubmission.count({ where }),
    ]);
    return NextResponse.json({ ok: true, submissions, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err: unknown) { return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: err instanceof Error ? err.message : "" }, { status: 500 }); }
}
