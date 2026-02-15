import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";

const prisma = new PrismaClient();

function calculateImagePrice(count: number) {
  if (count === 0) return 0;
  if (count === 1) return 5;
  if (count === 2) return 10;
  return -1; // invalid
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const imagesCount = Number(body?.imagesCount ?? 0);

    if (imagesCount < 0 || imagesCount > 2) {
      return NextResponse.json(
        { ok: false, error: "INVALID_IMAGES_COUNT" },
        { status: 400 }
      );
    }

    const submission = await prisma.adSubmission.findUnique({
      where: { id },
    });

    if (!submission) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!submission.priceText) {
      return NextResponse.json(
        { ok: false, error: "TEXT_REQUIRED_FIRST" },
        { status: 400 }
      );
    }

    const priceImages = calculateImagePrice(imagesCount);
    const priceTotal = (submission.priceText || 0) + priceImages;

    const updated = await prisma.adSubmission.update({
      where: { id },
      data: {
        imagesCount,
        priceImages,
        priceTotal,
        status: "WAITING_PAYMENT",
      },
    });

    return NextResponse.json({
      ok: true,
      submissionId: updated.id,
      imagesCount: updated.imagesCount,
      priceImages: updated.priceImages,
      priceTotal: updated.priceTotal,
      status: updated.status,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: err?.message ?? "" },
      { status: 500 }
    );
  }
}
