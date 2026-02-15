import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST() {
  try {
    const now = new Date();

    const expiredAds = await prisma.ad.findMany({
      where: {
        status: "PUBLISHED",
        expiresAt: {
          lt: now,
        },
      },
      include: {
        submission: true,
      },
    });

    let count = 0;

    for (const ad of expiredAds) {
      await prisma.ad.update({
        where: { id: ad.id },
        data: { status: "EXPIRED" },
      });

      await prisma.adSubmission.update({
        where: { id: ad.submissionId },
        data: { status: "EXPIRED" },
      });

      count++;
    }

    return NextResponse.json({
      ok: true,
      expiredCount: count,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: err?.message ?? "" },
      { status: 500 }
    );
  }
}
