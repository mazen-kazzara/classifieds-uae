import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { language } = await req.json();
  if (!language) return NextResponse.json({ ok: false, error: "LANGUAGE_REQUIRED" }, { status: 400 });
  const s = await prisma.adSubmission.findUnique({ where: { id } });
  if (!s) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  if (s.status !== "DRAFT") return NextResponse.json({ ok: false, error: "CANNOT_EDIT" }, { status: 400 });
  await prisma.adSubmission.update({ where: { id }, data: { language } });
  return NextResponse.json({ ok: true });
}
