import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";

const prisma = new PrismaClient();

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

    const payment = await prisma.payment.findUnique({
      where: { providerRef },
      include: { submission: true },
    });

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: "PAYMENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (payment.status === "SUCCESS") {
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }

    // 1️⃣ Update payment to SUCCESS
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCESS" },
    });

    // 2️⃣ Update submission to PAID
    const submission = await prisma.adSubmission.update({
      where: { id: payment.submissionId },
      data: { status: "PAID" },
    });

    // 3️⃣ Create Ad
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const ad = await prisma.ad.create({
      data: {
        submissionId: submission.id,
        description: submission.text || "",
        category: submission.category || "Other",
        status: "PUBLISHED",
        publishedAt: new Date(),
        expiresAt,
      },
    });

    // 4️⃣ Mark submission as PUBLISHED
    await prisma.adSubmission.update({
      where: { id: submission.id },
      data: { status: "PUBLISHED" },
    });

    return NextResponse.json({
      ok: true,
      paymentStatus: "SUCCESS",
      adId: ad.id,
      adStatus: ad.status,
      expiresAt: ad.expiresAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: err?.message ?? "" },
      { status: 500 }
    );
  }
}
