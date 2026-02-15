import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";

const prisma = new PrismaClient();

function containsEmoji(text: string) {
  return /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu.test(text);
}

function calculatePrice(language: string, text: string) {
  const length = text.length;

  if (language === "AR") {
    return Math.ceil(length / 70) * 10;
  }

  if (language === "EN") {
    return Math.ceil(length / 140) * 10;
  }

  return 0;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const text = String(body?.text ?? "").trim();

    if (!text || text.length < 5) {
      return NextResponse.json(
        { ok: false, error: "TEXT_TOO_SHORT" },
        { status: 400 }
      );
    }

    if (containsEmoji(text)) {
      return NextResponse.json(
        { ok: false, error: "EMOJI_NOT_ALLOWED" },
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

    if (!submission.language) {
      return NextResponse.json(
        { ok: false, error: "LANGUAGE_REQUIRED_FIRST" },
        { status: 400 }
      );
    }

    const priceText = calculatePrice(submission.language, text);

    const updated = await prisma.adSubmission.update({
      where: { id },
      data: {
        text,
        priceText,
        priceTotal: priceText,
      },
    });

    return NextResponse.json({
      ok: true,
      submissionId: updated.id,
      textLength: text.length,
      priceText: updated.priceText,
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
