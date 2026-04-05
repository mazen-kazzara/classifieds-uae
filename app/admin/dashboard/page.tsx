import { prisma } from "@/lib/prisma";
import Link from "next/link";
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [totalAds, publishedAds, pendingSubmissions, totalUsers, totalPayments, totalRevenue] = await Promise.all([
    prisma.ad.count(),
    prisma.ad.count({ where: { status: "PUBLISHED" } }),
    prisma.adSubmission.count({ where: { status: { in: ["WAITING_PAYMENT","PAID","PENDING_REVIEW"] } } }),
    prisma.user.count(),
    prisma.payment.count({ where: { status: "SUCCESS" } }),
    prisma.payment.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
  ]);
  const revenueTotal = totalRevenue._sum.amount ?? 0;
  const stats = [
    { label: "Total Ads", value: totalAds, color: "text-blue-600", bg: "bg-blue-50", icon: "📢" },
    { label: "Live Ads", value: publishedAds, color: "text-green-600", bg: "bg-green-50", icon: "✅" },
    { label: "Pending", value: pendingSubmissions, color: "text-orange-600", bg: "bg-orange-50", icon: "⏳" },
    { label: "Users", value: totalUsers, color: "text-purple-600", bg: "bg-purple-50", icon: "👤" },
    { label: "Paid Ads", value: totalPayments, color: "text-blue-600", bg: "bg-blue-50", icon: "💳" },
    { label: "Revenue (AED)", value: revenueTotal, color: "text-green-600", bg: "bg-green-50", icon: "💰" },
  ];
  const recentAds = await prisma.ad.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, title: true, category: true, status: true, publishedAt: true, contentType: true } });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-5`}>
            <div className="flex items-center gap-2 mb-1"><span className="text-xl">{s.icon}</span><p className="text-sm font-medium text-gray-600">{s.label}</p></div>
            <p className={`text-3xl font-extrabold ${s.color}`}>{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { href: "/admin/submissions", label: "Review Submissions", color: "bg-orange-500" },
          { href: "/admin/ads", label: "Manage Ads", color: "bg-blue-600" },
          { href: "/admin/categories", label: "Categories", color: "bg-purple-600" },
          { href: "/admin/pricing", label: "Pricing Config", color: "bg-green-600" },
        ].map((a) => <Link key={a.href} href={a.href} className={`${a.color} text-white rounded-xl p-4 text-sm font-semibold hover:opacity-90 transition text-center`}>{a.label}</Link>)}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Recent Ads</h2>
          <Link href="/admin/ads" className="text-blue-600 text-sm hover:underline">View all</Link>
        </div>
        <div className="divide-y">
          {recentAds.map((ad) => (
            <div key={ad.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate text-sm">{ad.title || "Untitled"}</p>
                <p className="text-xs text-gray-500">{ad.category} · {ad.contentType}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ad.status==="PUBLISHED"?"bg-green-100 text-green-700":ad.status==="EXPIRED"?"bg-gray-100 text-gray-600":ad.status==="REJECTED"?"bg-red-100 text-red-700":"bg-yellow-100 text-yellow-700"}`}>{ad.status}</span>
                <Link href={`/ad/${ad.id}`} target="_blank" className="text-xs text-blue-600 hover:underline">View</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
