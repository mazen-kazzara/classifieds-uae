import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { unlink } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

const UPLOAD_DIR = "/tmp/classifieds_uploads";

export async function POST() {
  try {
    const now = new Date();

    const expired = await prisma.submissionMedia.findMany({
      where: { expiresAt: { lte: now } },
      select: { id: true, tempKey: true },
      take: 200, // avoid huge delete in one call
    });

    let deletedFiles = 0;

    for (const item of expired) {
      const fullPath = path.join(UPLOAD_DIR, item.tempKey);
      try {
        await unlink(fullPath);
        deletedFiles++;
      } catch {
        // file might already be gone, ignore
      }
    }

    const deletedRows = await prisma.submissionMedia.deleteMany({
      where: { id: { in: expired.map((e) => e.id) } },
    });

    return NextResponse.json({
      ok: true,
      scanned: expired.length,
      deletedRows: deletedRows.count,
      deletedFiles,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: err?.message ?? "" },
      { status: 500 }
    );
  }
}
