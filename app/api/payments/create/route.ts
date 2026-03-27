import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    console.log("PAYMENTS CREATE HIT");

    const body = await req.json();
    console.log("BODY:", body);

    const { submissionId } = body;

    if (!submissionId) {
      throw new Error("NO_SUBMISSION_ID");
    }

    const payment = await prisma.payment.findFirst({
      where: { submissionId },
    });

    if (!payment) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    console.log("PAYMENT FOUND:", payment);

    const ziinaRes = await fetch(process.env.ZIINA_BASE_URL!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ZIINA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: payment.amount * 100,
        currency_code: "AED",
        message: "Classified Ad Payment",
        success_url: "https://classifiedsuae.ae/success",
        cancel_url: "https://classifiedsuae.ae/cancel",
        test: true,
        metadata: {
          providerRef: payment.providerRef,
        },
      }),
    });

    console.log("ZIINA STATUS:", ziinaRes.status);

    const ziina = await ziinaRes.json();
    await prisma.payment.update({
     where: { id: payment.id },
     data: {
       providerRef: ziina.id, // overwrite with ziina id
     },
  });
    console.log("ZIINA RESPONSE:", ziina);

    const checkoutUrl = ziina?.redirect_url;

    if (!checkoutUrl) {
      throw new Error("NO_CHECKOUT_URL_FROM_ZIINA");
    }

    return NextResponse.json({
      checkoutUrl,
    });

  } catch (err: any) {
    console.error("PAYMENT CREATE ERROR:", err);

    return NextResponse.json(
      { error: err.message || "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}