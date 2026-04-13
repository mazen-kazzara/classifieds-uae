import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: "hero_banner" } });
  return NextResponse.json({ ok: true, bannerUrl: setting?.value || null });
}
