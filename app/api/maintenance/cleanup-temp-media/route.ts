import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

export async function POST() {
  try {
    const now = new Date();
    const expired = await prisma.submissionMedia.findMany({ where: { expiresAt: { lte: now } }, select: { id: true, tempKey: true }, take: 200 });
    let deletedFiles = 0;
    const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
    for (const item of expired) {
      try { await unlink(path.join(UPLOAD_DIR, item.tempKey)); deletedFiles++; } catch { }
    }
    const deletedRows = await prisma.submissionMedia.deleteMany({ where: { id: { in: expired.map(e => e.id) } } });
    return NextResponse.json({ ok: true, scanned: expired.length, deletedRows: deletedRows.count, deletedFiles });
  } catch (err: unknown) { return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: err instanceof Error ? err.message : "" }, { status: 500 }); }
}
