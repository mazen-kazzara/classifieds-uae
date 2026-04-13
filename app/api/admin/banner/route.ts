import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

// GET — fetch current banner
export async function GET() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: "hero_banner" } });
  return NextResponse.json({ ok: true, bannerUrl: setting?.value || null });
}

// POST — upload new banner image
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "NO_FILE" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";
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
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// DELETE — remove banner
export async function DELETE() {
  try {
    await prisma.siteSetting.deleteMany({ where: { key: "hero_banner" } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
