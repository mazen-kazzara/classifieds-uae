import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const contactPhone = String(body?.contactPhone ?? "").replace(/\D/g, "");
    const whatsappNumber = String(body?.whatsappNumber ?? "").replace(/\D/g, "");
    const contactEmail = String(body?.contactEmail ?? "").trim() || null;
    const s = await prisma.adSubmission.findUnique({ where: { id } });
    if (!s) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    if (s.status !== "DRAFT") return NextResponse.json({ ok: false, error: "CANNOT_EDIT" }, { status: 400 });
    await prisma.adSubmission.update({ where: { id }, data: {
      contactPhone: contactPhone || null, whatsappNumber: whatsappNumber || null, contactEmail,
      contactMethod: body?.contactMethod || "whatsapp",
      contentType: body?.contentType || "ad",
      publishTarget: body?.publishTarget || "website",
      bookingEnabled: Boolean(body?.bookingEnabled),
      bookingType: body?.bookingType || null,
      offerStartDate: body?.offerStartDate ? new Date(body.offerStartDate) : null,
      offerEndDate: body?.offerEndDate ? new Date(body.offerEndDate) : null,
    }});
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: err instanceof Error ? err.message : "" }, { status: 500 });
  }
}
