import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const submission = await prisma.adSubmission.findUnique({ where: { id }, include: { ad: true } });
    if (!submission) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    await prisma.adSubmission.update({ where: { id }, data: { status: "REJECTED" } });
    if (submission.ad) await prisma.ad.update({ where: { id: submission.ad.id }, data: { status: "REJECTED" } });
    return NextResponse.json({ ok: true, submissionId: id, status: "REJECTED" });
  } catch (err: unknown) { return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: err instanceof Error ? err.message : "" }, { status: 500 }); }
}
