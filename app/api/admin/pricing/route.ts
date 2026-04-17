import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "SUPERVISOR" });
  if (auth.error) return auth.error;
  const pricing = await prisma.pricingConfig.findFirst({ orderBy: { createdAt: "desc" } });
  if (!pricing) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true, pricing });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "ADMIN", require2FA: true });
  if (auth.error) return auth.error;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 }); }
  const textPrice = Number(body.textPrice);
  const imagePrice = Number(body.imagePrice);
  const adDurationDays = Number(body.adDurationDays);

  if (!Number.isFinite(textPrice) || !Number.isFinite(imagePrice) || !Number.isFinite(adDurationDays)) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }
  if (textPrice < 0 || textPrice > 1000 || imagePrice < 0 || imagePrice > 1000 || adDurationDays < 1 || adDurationDays > 365) {
    return NextResponse.json({ ok: false, error: "OUT_OF_RANGE" }, { status: 400 });
  }

  const latest = await prisma.pricingConfig.findFirst({ orderBy: { createdAt: "desc" } });
  const pricing = latest
    ? await prisma.pricingConfig.update({ where: { id: latest.id }, data: { textPrice, imagePrice, adDurationDays } })
    : await prisma.pricingConfig.create({ data: { textPrice, imagePrice, adDurationDays } });
  return NextResponse.json({ ok: true, pricing });
}
