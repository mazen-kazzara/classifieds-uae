import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";

const prisma = new PrismaClient();

/* ================= RATE LIMIT ================= */

const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 1000;

const ipStore = new Map<string, { count: number; windowStart: number }>();

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

  if (record.count >= RATE_LIMIT) return false;

  record.count++;
  return true;
}

function generateFakePaymentRef() {
  return "PAY_" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

/* ================= HANDLER ================= */

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

    const result = await prisma.$transaction(async (tx) => {
      const submission = await tx.adSubmission.findUnique({
        where: { id: submissionId },
        include: { payment: true },
      });

      if (!submission) throw new Error("NOT_FOUND");

      // Must be fully completed
      if (
        !submission.language ||
        !submission.category ||
        !submission.text ||
        !submission.contactPhone ||
        !submission.contactEmail
      ) {
        throw new Error("INCOMPLETE_SUBMISSION");
      }

      if (!submission.priceTotal || submission.priceTotal <= 0) {
        throw new Error("INVALID_AMOUNT");
      }

      // Existing payment logic
      const existing = await tx.payment.findUnique({
        where: { submissionId },
      });

      if (existing) {
        if (existing.status === "SUCCESS") {
          throw new Error("ALREADY_PAID");
        }

        if (existing.status === "PENDING") {
          return { reused: true, payment: existing };
        }

        // If FAILED → allow new one (delete old)
        if (existing.status === "FAILED") {
          await tx.payment.delete({
            where: { id: existing.id },
          });
        }
      }

      // Ensure submission is in correct state
      await tx.adSubmission.update({
        where: { id: submission.id },
        data: { status: "WAITING_PAYMENT" },
      });

      const paymentRef = generateFakePaymentRef();

      const payment = await tx.payment.create({
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

      return { reused: false, payment };
    });

    return NextResponse.json({
      ok: true,
      paymentId: result.payment.id,
      providerRef: result.payment.providerRef,
      amount: result.payment.amount,
      currency: result.payment.currency,
      status: result.payment.status,
      reused: result.reused,
    });
  } catch (err: any) {
    const map: Record<string, number> = {
      NOT_FOUND: 404,
      INCOMPLETE_SUBMISSION: 400,
      INVALID_AMOUNT: 400,
      ALREADY_PAID: 400,
    };

    const status = map[err.message] ?? 500;

    return NextResponse.json(
      { ok: false, error: err.message || "SERVER_ERROR" },
      { status }
    );
  }
}
