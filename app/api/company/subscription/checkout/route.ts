/**
 * POST /api/company/subscription/checkout
 * Body: { companyId }
 * Creates (or reuses) a Ziina checkout session for the company's currently selected plan.
 * Mirrors the AD payment flow in /api/payments/create but operates on Company + CompanyPlan.
 * The existing AD flow is untouched.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const companyId = String(body?.companyId ?? "");
    if (!companyId) return NextResponse.json({ ok: false, error: "MISSING_COMPANY_ID" }, { status: 400 });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { plan: true, user: true },
    });
    if (!company) return NextResponse.json({ ok: false, error: "COMPANY_NOT_FOUND" }, { status: 404 });
    if (!company.plan) return NextResponse.json({ ok: false, error: "NO_PLAN_SELECTED" }, { status: 400 });

    if (company.subscriptionStatus === "ACTIVE") {
      return NextResponse.json({ ok: false, error: "ALREADY_ACTIVE" }, { status: 409 });
    }
    if (company.subscriptionStatus === "PENDING_OTP") {
      return NextResponse.json({ ok: false, error: "OTP_NOT_VERIFIED" }, { status: 400 });
    }

    const amount = company.plan.price;
    if (!amount || amount <= 0) {
      return NextResponse.json({ ok: false, error: "INVALID_PLAN_PRICE" }, { status: 400 });
    }

    // Reuse a still-pending payment if one exists, otherwise create a new one.
    let payment = await prisma.payment.findFirst({
      where: { companyId: company.id, status: "PENDING", purpose: "COMPANY_SUBSCRIPTION" },
      orderBy: { createdAt: "desc" },
    });
    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          companyId: company.id,
          purpose: "COMPANY_SUBSCRIPTION",
          provider: "ziina",
          amount,
          currency: company.plan.currency || "AED",
          status: "PENDING",
          providerRef: randomUUID(),
        },
      });
    }

    const APP_URL = process.env.APP_URL || "https://classifiedsuae.ae";
    const ziinaRes = await fetch(process.env.ZIINA_BASE_URL!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ZIINA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // fils
        currency_code: "AED",
        message: `Company subscription: ${company.plan.name} — classifiedsuae.ae`,
        success_url: `${APP_URL}/success?companyId=${company.id}&kind=company`,
        cancel_url: `${APP_URL}/cancel?companyId=${company.id}&kind=company`,
        test: process.env.ZIINA_TEST_MODE === "true",
        metadata: { companyId: company.id, paymentId: payment.id, purpose: "COMPANY_SUBSCRIPTION" },
      }),
    });

    const ziina = await ziinaRes.json().catch(() => ({}));
    if (!ziinaRes.ok) {
      console.error("[CompanyCheckout] Ziina error:", ziina);
      return NextResponse.json({ ok: false, error: "ZIINA_ERROR", detail: ziina }, { status: 502 });
    }

    if (!ziina?.id || !ziina?.redirect_url) {
      return NextResponse.json({ ok: false, error: "NO_CHECKOUT_URL" }, { status: 502 });
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerRef: ziina.id },
    });

    return NextResponse.json({ ok: true, checkoutUrl: ziina.redirect_url });
  } catch (err) {
    console.error("[CompanyCheckout] Error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
