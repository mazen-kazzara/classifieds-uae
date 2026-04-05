import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const users = await prisma.user.findMany({ select: { id: true, phone: true, email: true, role: true, createdAt: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ok: true, users });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const { userId, role } = await req.json();
  await prisma.user.update({ where: { id: userId }, data: { role } });
  return NextResponse.json({ ok: true });
}
