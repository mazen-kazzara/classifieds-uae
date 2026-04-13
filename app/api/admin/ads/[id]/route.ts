import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — fetch single ad details
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const ad = await prisma.ad.findUnique({ where: { id }, include: { media: true } });
  if (!ad) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true, ad });
}

// PUT — update ad
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { title, description, category, status, isFeatured, isPinned, expiresAt, adPrice, isNegotiable } = body;

    const ad = await prisma.ad.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(status !== undefined && { status }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(isPinned !== undefined && { isPinned }),
        ...(expiresAt !== undefined && { expiresAt: new Date(expiresAt) }),
        ...(adPrice !== undefined && { adPrice }),
        ...(isNegotiable !== undefined && { isNegotiable }),
      },
    });
    return NextResponse.json({ ok: true, ad });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// DELETE — delete ad and its media
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await prisma.media.deleteMany({ where: { adId: id } });
    await prisma.ad.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
