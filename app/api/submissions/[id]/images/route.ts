import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

const TEMP_TTL_MS = 6 * 60 * 60 * 1000;

function calculateImagePrice(count: number) {
  if (count === 0) return 0;
  if (count === 1) return 5;
  if (count === 2) return 10;
  return -1;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

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
        { ok: false, error: "CANNOT_UPLOAD_AFTER_PAYMENT_STARTED" },
        { status: 400 }
      );
    }

    if (!submission.priceText || !submission.text) {
      return NextResponse.json(
        { ok: false, error: "TEXT_REQUIRED_FIRST" },
        { status: 400 }
      );
    }

    if (!submission.contactPhone) {
      return NextResponse.json(
        { ok: false, error: "CONTACT_REQUIRED_FIRST" },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    const positionRaw = String(form.get("position") ?? "").trim();
    const position = Number(positionRaw);

    if (![1, 2].includes(position)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_POSITION" },
        { status: 400 }
      );
    }

    const existingMedia = await prisma.submissionMedia.findMany({
      where: { submissionId: id },
    });

    if (position === 2 && existingMedia.length === 0) {
      return NextResponse.json(
        { ok: false, error: "FIRST_IMAGE_REQUIRED" },
        { status: 400 }
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "FILE_REQUIRED" },
        { status: 400 }
      );
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
     return NextResponse.json(
     { ok: false, error: "INVALID_IMAGE_TYPE" },
     { status: 400 }
  );
}

    const MAX_FILE_BYTES = 5 * 1024 * 1024;

    if (file.size > MAX_FILE_BYTES) {
     return NextResponse.json(
     { ok: false, error: "IMAGE_TOO_LARGE" },
     { status: 400 }
  );
}

    const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

    const ext =
      file.type === "image/png"
        ? ".png"
        : file.type === "image/webp"
        ? ".webp"
        : ".jpg";

    const filename = `${randomUUID()}${ext}`;
    const relativePath = path.join(id, filename);
    const fullPath = path.join(UPLOAD_DIR, relativePath);

    await mkdir(path.dirname(fullPath), { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buffer);

    const expiresAt = new Date(Date.now() + TEMP_TTL_MS);

    await prisma.submissionMedia.upsert({
      where: {
        submissionId_position: {
          submissionId: id,
          position,
        },
      },
      create: {
        submissionId: id,
        position,
        tempKey: relativePath,
        expiresAt,
      },
      update: {
        tempKey: relativePath,
        expiresAt,
      },
    });

    const media = await prisma.submissionMedia.findMany({
      where: { submissionId: id },
      orderBy: { position: "asc" },
    });

    const imagesCount = media.length;

    if (imagesCount > 2) {
      return NextResponse.json(
        { ok: false, error: "TOO_MANY_IMAGES" },
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
      },
    });

    return NextResponse.json({
      ok: true,
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
