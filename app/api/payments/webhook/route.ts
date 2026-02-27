import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";

const prisma = new PrismaClient();

type TxResult =
  | { alreadyProcessed: true }
  | {
      alreadyProcessed: false;
      ad: {
        id: string;
        status: string;
        expiresAt: Date;
      };
    };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const providerRef = String(body?.providerRef ?? "");

    if (!providerRef) {
      return NextResponse.json(
        { ok: false, error: "PROVIDER_REF_REQUIRED" },
        { status: 400 }
      );
    }

    const result: TxResult = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { providerRef },
        include: { submission: true },
      });

      if (!payment) {
        throw new Error("PAYMENT_NOT_FOUND");
      }

      if (payment.status === "SUCCESS") {
        return { alreadyProcessed: true };
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "SUCCESS" },
      });

      if (payment.submission.status === "PUBLISHED") {
        return { alreadyProcessed: true };
      }

      const submission = await tx.adSubmission.update({
        where: { id: payment.submissionId },
        data: { status: "PAID" },
      });

      const existingAd = await tx.ad.findUnique({
        where: { submissionId: submission.id },
      });

      if (existingAd) {
        return { alreadyProcessed: true };
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const rawText = (submission.text || "").trim();
      const words = rawText.split(/\s+/).slice(0, 6);
      const generatedTitle =
        words.length > 0 ? words.join(" ") : "New Listing";

      const ad = await tx.ad.create({
        data: {
          submissionId: submission.id,
          title: generatedTitle,
          description: rawText,
          category: submission.category || "Other",
          status: "PUBLISHED",
          publishedAt: new Date(),
          expiresAt,
        },
      });

      // 🔥 MOVE IMAGES FROM submissionMedia TO Media
      const tempMedia = await tx.submissionMedia.findMany({
        where: { submissionId: submission.id },
        orderBy: { position: "asc" },
      });

      for (const m of tempMedia) {
        await tx.media.create({
          data: {
            adId: ad.id,
            position: m.position,
            url: `/uploads/${m.tempKey}`, // FIXED HERE
          },
        });
      }

      await tx.adSubmission.update({
        where: { id: submission.id },
        data: { status: "PUBLISHED" },
      });

      return {
        alreadyProcessed: false,
        ad: {
          id: ad.id,
          status: ad.status,
          expiresAt: ad.expiresAt,
        },
      };
    });

    if (result.alreadyProcessed) {
      return NextResponse.json({
        ok: true,
        alreadyProcessed: true,
      });
    }

    return NextResponse.json({
      ok: true,
      paymentStatus: "SUCCESS",
      adId: result.ad.id,
      adStatus: result.ad.status,
      expiresAt: result.ad.expiresAt,
    });
  } catch (err: any) {
    if (err.message === "PAYMENT_NOT_FOUND") {
      return NextResponse.json(
        { ok: false, error: "PAYMENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: err?.message ?? "" },
      { status: 500 }
    );
  }
}