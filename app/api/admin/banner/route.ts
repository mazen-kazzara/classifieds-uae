import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function GET() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: "hero_banner" } });
  return NextResponse.json({ ok: true, bannerUrl: setting?.value || null });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "CONTENT_ADMIN" });
  if (auth.error) return auth.error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ ok: false, error: "NO_FILE" }, { status: 400 });

    // Validate MIME type from the File object itself (not filename)
    const mime = file.type;
    if (!ALLOWED_MIME[mime]) {
      return NextResponse.json({ ok: false, error: "INVALID_MIME_TYPE", message: "Only JPEG, PNG, WebP allowed" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE", message: "Max 5 MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = ALLOWED_MIME[mime];
    const fileName = `banner-${randomUUID()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public/uploads");

    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    fs.writeFileSync(path.join(uploadDir, fileName), buffer);
    const url = `/uploads/${fileName}`;

    await prisma.siteSetting.upsert({
      where: { key: "hero_banner" },
      update: { value: url },
      create: { key: "hero_banner", value: url },
    });

    return NextResponse.json({ ok: true, bannerUrl: url });
  } catch (err) {
    console.error("Banner upload error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "CONTENT_ADMIN" });
  if (auth.error) return auth.error;
  try {
    await prisma.siteSetting.deleteMany({ where: { key: "hero_banner" } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Banner delete error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
