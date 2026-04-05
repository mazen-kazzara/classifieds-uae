import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const s = await prisma.adSubmission.findUnique({ where: { id } });
    if (!s) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    if (s.status !== "DRAFT") return NextResponse.json({ ok: false, error: "CANNOT_EDIT" }, { status: 400 });

    const form = await req.formData();
    const file = form.get("file");
    const position = Number(String(form.get("position") ?? "").trim());

    if (![1,2].includes(position)) return NextResponse.json({ ok: false, error: "INVALID_POSITION" }, { status: 400 });
    if (!file || !(file instanceof File)) return NextResponse.json({ ok: false, error: "FILE_REQUIRED" }, { status: 400 });
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) return NextResponse.json({ ok: false, error: "INVALID_IMAGE_TYPE" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ ok: false, error: "IMAGE_TOO_LARGE" }, { status: 400 });

    const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
    const filename = `${randomUUID()}${ext}`;
    const subDir = path.join(process.cwd(), "public", "uploads", id);
    await mkdir(subDir, { recursive: true });
    await writeFile(path.join(subDir, filename), Buffer.from(await file.arrayBuffer()));

    const relativePath = `${id}/${filename}`;
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);

    await prisma.submissionMedia.upsert({
      where: { submissionId_position: { submissionId: id, position } },
      create: { submissionId: id, position, tempKey: relativePath, expiresAt },
      update: { tempKey: relativePath, expiresAt },
    });

    const media = await prisma.submissionMedia.findMany({ where: { submissionId: id } });
    const config = await prisma.pricingConfig.findFirst({ orderBy: { createdAt: "desc" } });
    const priceImages = media.length * 2.5;
    const priceTotal = (s.priceText || 0) + priceImages;
    await prisma.adSubmission.update({ where: { id }, data: { imagesCount: media.length, priceImages, priceTotal } });

    return NextResponse.json({ ok: true, url: `/uploads/${relativePath}`, imagesCount: media.length, priceImages, priceTotal });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: err instanceof Error ? err.message : "" }, { status: 500 });
  }
}
