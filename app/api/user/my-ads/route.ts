import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const sessionUserId = (session.user as any).id;
  const sessionPhone = (session.user as any).phone;
  const sessionEmail = session.user?.email;

  // Find the user in DB by ID, phone, or email
  let userId: string | null = null;

  if (sessionUserId) {
    const u = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { id: true } });
    if (u) userId = u.id;
  }

  if (!userId && sessionPhone) {
    const u = await prisma.user.findUnique({ where: { phone: sessionPhone }, select: { id: true } });
    if (u) userId = u.id;
  }

  if (!userId && sessionEmail) {
    const u = await prisma.user.findUnique({ where: { email: sessionEmail.toLowerCase() }, select: { id: true } });
    if (u) userId = u.id;
  }

  // Build query: match by userId OR by phone
  const conditions: any[] = [];
  if (userId) conditions.push({ userId });
  if (sessionPhone) conditions.push({ phone: sessionPhone });

  if (conditions.length === 0) {
    return NextResponse.json({ ok: true, ads: [] });
  }

  const submissions = await prisma.adSubmission.findMany({
    where: {
      OR: conditions,
      status: "PUBLISHED",
    },
    include: { ad: { select: { id: true, title: true, category: true, status: true, publishedAt: true, expiresAt: true, isFeatured: true } } },
    orderBy: { createdAt: "desc" },
  });

  const ads = submissions.flatMap(s => s.ad ? [{
    id: s.ad.id, title: s.ad.title, category: s.ad.category,
    status: s.ad.status, publishedAt: s.ad.publishedAt, expiresAt: s.ad.expiresAt,
    isFeatured: s.ad.isFeatured,
  }] : []);

  return NextResponse.json({ ok: true, ads });
}
