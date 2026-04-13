import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERVISOR"].includes((session.user as any).role)) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const users = await prisma.user.findMany({
    select: { id: true, phone: true, email: true, name: true, role: true, phoneVerified: true, emailVerified: true, provider: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  // Count ads per user
  const userIds = users.map(u => u.id);
  const adCounts = await prisma.adSubmission.groupBy({ by: ["userId"], where: { userId: { in: userIds } }, _count: true });
  const countMap: Record<string, number> = {};
  adCounts.forEach(a => { if (a.userId) countMap[a.userId] = a._count; });

  return NextResponse.json({ ok: true, users: users.map(u => ({ ...u, adsCount: countMap[u.id] || 0 })) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const { userId, role, action } = await req.json();

  if (action === "suspend") {
    await prisma.user.update({ where: { id: userId }, data: { phoneVerified: false, emailVerified: false } });
    return NextResponse.json({ ok: true });
  }
  if (action === "activate") {
    await prisma.user.update({ where: { id: userId }, data: { phoneVerified: true, emailVerified: true } });
    return NextResponse.json({ ok: true });
  }
  if (action === "delete") {
    await prisma.adSubmission.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ ok: true });
  }

  if (role) {
    await prisma.user.update({ where: { id: userId }, data: { role } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "INVALID_ACTION" }, { status: 400 });
}
