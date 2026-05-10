import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "SUPERVISOR" });
  if (auth.error) return auth.error;

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));
  const status = url.searchParams.get("status") || "";
  const search = url.searchParams.get("search") || "";

  const where: any = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { adTitle: { contains: search, mode: "insensitive" } },
      { adId: { contains: search, mode: "insensitive" } },
      { reason: { contains: search, mode: "insensitive" } },
      { reporterName: { contains: search, mode: "insensitive" } },
      { reporterEmail: { contains: search, mode: "insensitive" } },
    ];
  }

  const [reports, totalCount] = await Promise.all([
    prisma.adReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.adReport.count({ where }),
  ]);

  return NextResponse.json({ ok: true, reports, totalCount, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "CONTENT_ADMIN" });
  if (auth.error) return auth.error;

  const body = await req.json();
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
  }

  const validStatuses = ["PENDING", "AD_SUSPENDED", "AD_DELETED", "DISMISSED"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ ok: false, error: "INVALID_STATUS" }, { status: 400 });
  }

  // If suspending, update the ad status
  if (status === "AD_SUSPENDED") {
    const report = await prisma.adReport.findUnique({ where: { id } });
    if (!report) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    await prisma.ad.update({
      where: { id: report.adId },
      data: { status: "SUSPENDED" },
    }).catch(() => {}); // ad might not exist
  }

  // If reopening from suspended, unsuspend the ad
  if (status === "PENDING" && body.unsuspend) {
    const report = await prisma.adReport.findUnique({ where: { id } });
    if (report) {
      await prisma.ad.update({
        where: { id: report.adId },
        data: { status: "PUBLISHED" },
      }).catch(() => {});
    }
  }

  const updatedReport = await prisma.adReport.update({
    where: { id },
    data: {
      status,
      reviewedAt: new Date(),
      reviewedBy: body.reviewedBy || "admin",
    },
  });

  return NextResponse.json({ ok: true, report: updatedReport });
}
