import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET() {
  try {
    const config = await prisma.pricingConfig.findFirst({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ ok: true, config: config ?? { textPrice: 3, imagePrice: 2, adDurationDays: 7 } });
  } catch { return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 }); }
}
