import { prisma } from "@/lib/prisma"
import { PrismaClient } from "@prisma/client"
import Link from "next/link"
const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'


export default async function AdminDashboard() {
  const totalAds = await prisma.ad.count()
  const pendingAds = await prisma.ad.count({
    where: { status: "PENDING" },
  })
  const totalUsers = await prisma.user.count()
  const totalPayments = await prisma.payment.count()

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">
        dashboard overview
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded border bg-white p-4">
          <div className="text-sm text-gray-500">total ads</div>
          <div className="text-2xl font-bold">{totalAds}</div>
        </div>

        <div className="rounded border bg-white p-4">
          <div className="text-sm text-gray-500">pending ads</div>
          <div className="text-2xl font-bold text-orange-600">
            {pendingAds}
          </div>
        </div>

        <div className="rounded border bg-white p-4">
          <div className="text-sm text-gray-500">users</div>
          <div className="text-2xl font-bold">{totalUsers}</div>
        </div>

        <div className="rounded border bg-white p-4">
          <div className="text-sm text-gray-500">payments</div>
          <div className="text-2xl font-bold">{totalPayments}</div>
        </div>
      </div>
    </div>
  )
}
