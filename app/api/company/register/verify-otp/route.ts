/**
 * POST /api/company/register/verify-otp
 * Body: { companyId, code }
 * Verifies the SMS OTP, marks the linked User.phoneVerified=true,
 * and advances Company.subscriptionStatus to PENDING_PAYMENT.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkVerifyLimit, recordVerifyFailure, clearVerifyLimit } from "@/lib/otp-rate-limiter";
import { companyOtpVerifySchema } from "@/lib/validation/companyRegistrationSchema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = companyOtpVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
    }
    const { companyId, code } = parsed.data;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { user: true },
    });
    if (!company) return NextResponse.json({ ok: false, error: "COMPANY_NOT_FOUND" }, { status: 404 });

    const phone = company.companyPhone;

    const limit = checkVerifyLimit(phone);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "TOO_MANY_ATTEMPTS", retryAfter: limit.retryAfter },
        { status: 429 }
      );
    }

    if (company.subscriptionStatus !== "PENDING_OTP") {
      // Already verified or further along — treat as success idempotently.
      return NextResponse.json({ ok: true, alreadyVerified: true, subscriptionStatus: company.subscriptionStatus });
    }

    const user = company.user;
    if (!user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return NextResponse.json({ ok: false, error: "OTP_EXPIRED" }, { status: 400 });
    }
    if (user.otpCode !== code) {
      recordVerifyFailure(phone);
      await prisma.user.update({ where: { id: user.id }, data: { otpAttempts: { increment: 1 } } });
      return NextResponse.json({ ok: false, error: "INVALID_CODE" }, { status: 400 });
    }

    clearVerifyLimit(phone);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true, otpCode: null, otpExpiresAt: null, otpAttempts: 0 },
      }),
      prisma.company.update({
        where: { id: company.id },
        data: { subscriptionStatus: "PENDING_PAYMENT" },
      }),
      prisma.otpRequest.updateMany({
        where: { phone, used: false },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({ ok: true, companyId, subscriptionStatus: "PENDING_PAYMENT" });
  } catch (err) {
    console.error("[CompanyVerifyOtp] Error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
