import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [totalAds, publishedAds, pendingSubmissions, totalUsers, totalPayments, totalRevenue] = await Promise.all([
      prisma.ad.count(),
      prisma.ad.count({ where: { status: "PUBLISHED" } }),
      prisma.adSubmission.count({ where: { status: { in: ["WAITING_PAYMENT", "PAID", "PENDING_REVIEW"] } } }),
      prisma.user.count(),
      prisma.payment.count({ where: { status: "SUCCESS" } }),
      prisma.payment.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
    ]);

    const stats = [
      { label: "Total Ads", labelAr: "إجمالي الإعلانات", value: totalAds, color: "var(--primary)" },
      { label: "Live Ads", labelAr: "إعلانات نشطة", value: publishedAds, color: "#22C55E" },
      { label: "Pending", labelAr: "قيد الانتظار", value: pendingSubmissions, color: "#EAB308" },
      { label: "Users", labelAr: "المستخدمون", value: totalUsers, color: "#8B5CF6" },
      { label: "Paid Ads", labelAr: "إعلانات مدفوعة", value: totalPayments, color: "#3B82F6" },
      { label: "Revenue (AED)", labelAr: "الإيرادات (د.إ)", value: totalRevenue._sum.amount ?? 0, color: "#22C55E" },
    ];

    const recentAds = await prisma.ad.findMany({
      orderBy: { createdAt: "desc" }, take: 10,
      select: { id: true, title: true, category: true, status: true, publishedAt: true, contentType: true },
    });

    return NextResponse.json({ ok: true, stats, recentAds });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
