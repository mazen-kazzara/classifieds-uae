import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const submission = await prisma.adSubmission.findUnique({
      where: { id },
      include: { ad: true },
    });

    if (!submission) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // 1️⃣ Update submission
    await prisma.adSubmission.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    // 2️⃣ If ad exists, reject it too
    if (submission.ad) {
      await prisma.ad.update({
        where: { id: submission.ad.id },
        data: { status: "REJECTED" },
      });
    }

    return NextResponse.json({
      ok: true,
      submissionId: id,
      status: "REJECTED",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: err?.message ?? "" },
      { status: 500 }
    );
  }
}
