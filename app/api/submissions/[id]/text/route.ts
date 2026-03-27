import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";
import { forbiddenWords } from "@/lib/forbidden-words";
import { logAudit } from "@/lib/audit";

const prisma = new PrismaClient();

function containsEmoji(text: string) {
  return /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu.test(text);
}

function removeArabicDiacritics(text: string) {
  return text.replace(/[\u064B-\u065F]/g, "");
}

function containsForbiddenContent(text: string) {
  const lower = text.toLowerCase();
  return forbiddenWords.some(word => lower.includes(word));
}

function calculatePrice(language: string, text: string) {
  let processedText = text;

  if (language === "AR") {
    processedText = removeArabicDiacritics(text);
    return Math.ceil(processedText.length / 70) * 10;
  }

  if (language === "EN") {
    return Math.ceil(text.length / 140) * 10;
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

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const userAgent = req.headers.get("user-agent") || null;

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

    if (containsForbiddenContent(text)) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN_CONTENT" },
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

    if (submission.status !== "DRAFT") {
      return NextResponse.json(
        { ok: false, error: "CANNOT_EDIT_AFTER_PAYMENT_STARTED" },
        { status: 400 }
      );
    }

    if (!submission.language) {
      return NextResponse.json(
        { ok: false, error: "LANGUAGE_REQUIRED_FIRST" },
        { status: 400 }
      );
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const duplicate = await prisma.adSubmission.findFirst({
      where: {
        phone: submission.phone,
        text,
        createdAt: { gte: tenMinutesAgo },
        NOT: { id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { ok: false, error: "DUPLICATE_SUBMISSION_10_MIN" },
        { status: 409 }
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

    await logAudit({
      actorType: "USER",
      actorId: submission.phone,
      ipAddress: ip,
      userAgent,
      action: "TEXT_UPDATED",
      entity: "AdSubmission",
      entityId: submission.id,
      oldValue: {
        text: submission.text,
        priceText: submission.priceText,
      },
      newValue: {
        text: updated.text,
        priceText: updated.priceText,
        priceTotal: updated.priceTotal,
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
