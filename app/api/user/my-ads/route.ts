import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const phone = (session.user as any).phone;
  if (!phone) return NextResponse.json({ ok: false, error: "NO_PHONE" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });

  const submissions = await prisma.adSubmission.findMany({
    where: { userId: user.id, status: "PUBLISHED" },
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
