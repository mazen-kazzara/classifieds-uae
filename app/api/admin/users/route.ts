import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "SUPERVISOR" });
  if (auth.error) return auth.error;

  const rawSearch = req.nextUrl.searchParams.get("search")?.trim() ?? "";
  const search = rawSearch.length > 200 ? rawSearch.slice(0, 200) : rawSearch;
  const where: any = search ? {
    OR: [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { id: { contains: search, mode: "insensitive" } },
    ],
  } : {};

  const users = await prisma.user.findMany({
    where,
    select: { id: true, phone: true, email: true, name: true, role: true, phoneVerified: true, emailVerified: true, provider: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const userIds = users.map(u => u.id);
  const adCounts = await prisma.adSubmission.groupBy({ by: ["userId"], where: { userId: { in: userIds } }, _count: true });
  const countMap: Record<string, number> = {};
  adCounts.forEach(a => { if (a.userId) countMap[a.userId] = a._count; });

  return NextResponse.json({ ok: true, users: users.map(u => ({ ...u, adsCount: countMap[u.id] || 0 })) });
}

export async function POST(req: NextRequest) {
  // User management = sensitive — ADMIN only, with 2FA
  const auth = await requireAdmin(req, { minRole: "ADMIN", require2FA: true });
  if (auth.error) return auth.error;

  const actorId = auth.token!.id;
  const { userId, role, action } = await req.json();

  if (!userId || typeof userId !== "string") return NextResponse.json({ ok: false, error: "INVALID_USER_ID" }, { status: 400 });

  // Prevent self-modification on critical actions
  if (userId === actorId && ["delete", "suspend"].includes(action)) {
    return NextResponse.json({ ok: false, error: "CANNOT_SELF_MODIFY" }, { status: 400 });
  }
  // Prevent self-demotion from ADMIN
  if (userId === actorId && role && role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "CANNOT_SELF_DEMOTE" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, phone: true, email: true } });
  if (!target) return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    if (action === "suspend") {
      await prisma.user.update({ where: { id: userId }, data: { phoneVerified: false, emailVerified: false } });
      await logAudit({ actorType: "ADMIN", actorId, ipAddress: ip, action: "SUSPEND_USER", entity: "User", entityId: userId }).catch(() => {});
      return NextResponse.json({ ok: true });
    }
    if (action === "activate") {
      await prisma.user.update({ where: { id: userId }, data: { phoneVerified: true, emailVerified: true } });
      await logAudit({ actorType: "ADMIN", actorId, ipAddress: ip, action: "ACTIVATE_USER", entity: "User", entityId: userId }).catch(() => {});
      return NextResponse.json({ ok: true });
    }
    if (action === "delete") {
      // Cascade delete: submissions → media/payments/ads are handled by CASCADE in schema
      await prisma.$transaction(async (tx) => {
        await tx.adSubmission.deleteMany({ where: { userId } });
        await tx.user.delete({ where: { id: userId } });
      });
      await logAudit({ actorType: "ADMIN", actorId, ipAddress: ip, action: "DELETE_USER", entity: "User", entityId: userId, payload: { targetRole: target.role, targetEmail: target.email, targetPhone: target.phone } }).catch(() => {});
      return NextResponse.json({ ok: true });
    }

    if (role) {
      if (!["USER", "ADMIN", "SUPERVISOR"].includes(role)) return NextResponse.json({ ok: false, error: "INVALID_ROLE" }, { status: 400 });
      await prisma.user.update({ where: { id: userId }, data: { role } });
      await logAudit({ actorType: "ADMIN", actorId, ipAddress: ip, action: "CHANGE_ROLE", entity: "User", entityId: userId, payload: { oldRole: target.role, newRole: role } }).catch(() => {});
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "INVALID_ACTION" }, { status: 400 });
  } catch (err) {
    console.error("User POST error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
