import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { categoryId } = await req.json();
  if (!categoryId) return NextResponse.json({ ok: false, error: "CATEGORY_REQUIRED" }, { status: 400 });
  const [s, cat] = await Promise.all([prisma.adSubmission.findUnique({ where: { id } }), prisma.category.findUnique({ where: { id: categoryId } })]);
  if (!s) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  if (!cat) return NextResponse.json({ ok: false, error: "CATEGORY_NOT_FOUND" }, { status: 404 });
  if (s.status !== "DRAFT") return NextResponse.json({ ok: false, error: "CANNOT_EDIT" }, { status: 400 });
  await prisma.adSubmission.update({ where: { id }, data: { categoryId, categoryName: cat.name } });
  return NextResponse.json({ ok: true });
}
