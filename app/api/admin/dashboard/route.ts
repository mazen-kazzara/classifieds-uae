import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Only count real payments (provider = "ziina", status = "SUCCESS")
    // Excludes: telegram (free/bot-initiated), ZIINA_SIM (test simulator), PENDING/FAILED
    const realPaymentFilter = { provider: "ziina", status: "SUCCESS" as const };

    const [totalAds, publishedAds, expiredAds, pendingSubmissions, totalUsers, totalPayments, totalRevenue] = await Promise.all([
      prisma.ad.count(),
      prisma.ad.count({ where: { status: "PUBLISHED", deletedAt: null } }),
      prisma.ad.count({ where: { status: "EXPIRED", deletedAt: null } }),
      prisma.adSubmission.count({ where: { status: { in: ["WAITING_PAYMENT", "PAID", "PENDING_REVIEW"] } } }),
      prisma.user.count(),
      prisma.payment.count({ where: realPaymentFilter }),
      prisma.payment.aggregate({ where: realPaymentFilter, _sum: { amount: true } }),
    ]);

    const stats = [
      { label: "Total Ads", labelAr: "إجمالي الإعلانات", value: totalAds, color: "var(--primary)" },
      { label: "Live Ads", labelAr: "إعلانات نشطة", value: publishedAds, color: "#22C55E" },
      { label: "Expired", labelAr: "منتهية", value: expiredAds, color: "#EAB308" },
      { label: "Pending", labelAr: "قيد الانتظار", value: pendingSubmissions, color: "#F97316" },
      { label: "Users", labelAr: "المستخدمون", value: totalUsers, color: "#8B5CF6" },
      { label: "Paid Ads", labelAr: "إعلانات مدفوعة", value: totalPayments, color: "#3B82F6" },
      { label: "Revenue (AED)", labelAr: "الإيرادات (د.إ)", value: totalRevenue._sum.amount ?? 0, color: "#22C55E" },
    ];

    const recentAds = await prisma.ad.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" }, take: 10,
      select: { id: true, title: true, category: true, status: true, publishedAt: true, contentType: true },
    });

    return NextResponse.json({ ok: true, stats, recentAds });
  } catch {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
