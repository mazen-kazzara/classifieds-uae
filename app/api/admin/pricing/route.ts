import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

function isAdmin(req: NextRequest) {
  const key = req.headers.get("x-admin-key") || "";
  const expected = process.env.ADMIN_API_KEY || "";
  return expected.length > 0 && key === expected;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const pricing = await prisma.pricingConfig.findFirst({ orderBy: { createdAt: "desc" } });
  if (!pricing) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true, pricing });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 }); }
  const textPrice = Number(body.textPrice), imagePrice = Number(body.imagePrice), adDurationDays = Number(body.adDurationDays);
  if (!Number.isFinite(textPrice) || !Number.isFinite(imagePrice) || !Number.isFinite(adDurationDays)) return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  const latest = await prisma.pricingConfig.findFirst({ orderBy: { createdAt: "desc" } });
  const pricing = latest
    ? await prisma.pricingConfig.update({ where: { id: latest.id }, data: { textPrice, imagePrice, adDurationDays } })
    : await prisma.pricingConfig.create({ data: { textPrice, imagePrice, adDurationDays } });
  return NextResponse.json({ ok: true, pricing });
}
