import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const adminKey = req.headers.get("x-admin-key");
    if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const submission = await prisma.adSubmission.findUnique({
      where: { id },
      include: { payment: true, ad: true },
    });

    if (!submission) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Only allow approval if paid or expired (republish case)
    if (submission.status !== "PAID" && submission.status !== "EXPIRED") {
      return NextResponse.json(
        { ok: false, error: "INVALID_STATUS" },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let ad;

    if (submission.ad) {
      // Republish existing ad
      ad = await prisma.ad.update({
        where: { id: submission.ad.id },
        data: {
          status: "PUBLISHED",
          publishedAt: now,
          expiresAt,
        },
      });
    } else {
      // Create new ad
      ad = await prisma.ad.create({
        data: {
          submissionId: submission.id,
          description: submission.text || "",
          category: submission.category || "General",
          status: "PUBLISHED",
          publishedAt: now,
          expiresAt,
        },
      });
    }

    await prisma.adSubmission.update({
      where: { id: submission.id },
      data: {
        status: "PUBLISHED",
      },
    });

    return NextResponse.json({
      ok: true,
      submissionId: submission.id,
      adId: ad.id,
      status: "PUBLISHED",
      expiresAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: err?.message ?? "" },
      { status: 500 }
    );
  }
}
