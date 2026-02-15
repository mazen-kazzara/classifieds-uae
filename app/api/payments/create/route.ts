import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";

const prisma = new PrismaClient();

/* ================= RATE LIMIT ================= */

const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 1000;

const ipStore = new Map<
  string,
  { count: number; windowStart: number }
>();

function checkRateLimit(ip: string) {
  const now = Date.now();

  if (!ipStore.has(ip)) {
    ipStore.set(ip, { count: 1, windowStart: now });
    return true;
  }

  const record = ipStore.get(ip)!;

  if (now - record.windowStart > WINDOW_MS) {
    ipStore.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

/* ================= HANDLER ================= */

function generateFakePaymentRef() {
  return "PAY_" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { ok: false, error: "RATE_LIMIT_EXCEEDED" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const submissionId = String(body?.submissionId ?? "");

    if (!submissionId) {
      return NextResponse.json(
        { ok: false, error: "SUBMISSION_ID_REQUIRED" },
        { status: 400 }
      );
    }

    const submission = await prisma.adSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (submission.status !== "WAITING_PAYMENT") {
      return NextResponse.json(
        { ok: false, error: "INVALID_STATUS_FOR_PAYMENT" },
        { status: 400 }
      );
    }

    if (!submission.priceTotal || submission.priceTotal <= 0) {
      return NextResponse.json(
        { ok: false, error: "INVALID_AMOUNT" },
        { status: 400 }
      );
    }

    const paymentRef = generateFakePaymentRef();

    const payment = await prisma.payment.create({
      data: {
        submissionId: submission.id,
        provider: "ZIINA_SIM",
        amount: submission.priceTotal,
        currency: "AED",
        status: "PENDING",
        providerRef: paymentRef,
        rawPayload: {},
      },
    });

    return NextResponse.json({
      ok: true,
      paymentId: payment.id,
      providerRef: payment.providerRef,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: err?.message ?? "" },
      { status: 500 }
    );
  }
}
