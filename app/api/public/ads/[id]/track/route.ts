import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { type } = await req.json();
    const updateData: Record<string, unknown> = {};
    if (type === "whatsapp") updateData.whatsappClicks = { increment: 1 };
    else if (type === "call") updateData.callClicks = { increment: 1 };
    else if (type === "booking") updateData.bookingClicks = { increment: 1 };
    else return NextResponse.json({ ok: false, error: "INVALID_TYPE" }, { status: 400 });
    await prisma.ad.update({ where: { id }, data: updateData });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ ok: true }); }
}
