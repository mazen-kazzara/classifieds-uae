import { prisma } from "@/lib/prisma"  // Use the global instance
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const totalAds = await prisma.ad.count()
  const pendingAds = await prisma.ad.count({
    where: { status: "PENDING" as any },  // Cast to bypass TypeScript
  })
  const totalUsers = await prisma.user.count()
  const totalPayments = await prisma.payment.count()

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h2 className="mb-6 text-2xl font-bold">
        Dashboard Overview
      </h2>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-600">Total Ads</h3>
          <p className="mt-2 text-3xl font-bold">{totalAds}</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-600">Pending Review</h3>
          <p className="mt-2 text-3xl font-bold text-orange-600">{pendingAds}</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-600">Total Users</h3>
          <p className="mt-2 text-3xl font-bold">{totalUsers}</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-600">Total Payments</h3>
          <p className="mt-2 text-3xl font-bold">{totalPayments}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Link
          href="/admin/ads/moderate"
          className="rounded-lg bg-blue-600 p-6 text-white shadow hover:bg-blue-700"
        >
          <h3 className="text-lg font-semibold">Moderate Ads</h3>
          <p className="mt-2 text-sm">Review and approve pending ads</p>
        </Link>

        <Link
          href="/admin/users"
          className="rounded-lg bg-green-600 p-6 text-white shadow hover:bg-green-700"
        >
          <h3 className="text-lg font-semibold">Manage Users</h3>
          <p className="mt-2 text-sm">View and manage user accounts</p>
        </Link>

        <Link
          href="/admin/pricing"
          className="rounded-lg bg-purple-600 p-6 text-white shadow hover:bg-purple-700"
        >
          <h3 className="text-lg font-semibold">Pricing Rules</h3>
          <p className="mt-2 text-sm">Configure automated pricing</p>
        </Link>
      </div>
    </div>
  )
}