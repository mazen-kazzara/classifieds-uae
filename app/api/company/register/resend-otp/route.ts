/**
 * POST /api/company/register/resend-otp
 * Body: { companyId }
 * Re-sends the SMS OTP for a company that is still in PENDING_OTP state.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtp } from "@/lib/otp-sender";
import { checkOtpSendLimit } from "@/lib/otp-rate-limiter";

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const body = await req.json().catch(() => ({}));
    const companyId = String(body?.companyId ?? "");
    if (!companyId) return NextResponse.json({ ok: false, error: "MISSING_COMPANY_ID" }, { status: 400 });

    const company = await prisma.company.findUnique({ where: { id: companyId }, include: { user: true } });
    if (!company) return NextResponse.json({ ok: false, error: "COMPANY_NOT_FOUND" }, { status: 404 });

    if (company.subscriptionStatus !== "PENDING_OTP") {
      return NextResponse.json({ ok: false, error: "ALREADY_VERIFIED" }, { status: 400 });
    }

    const phone = company.companyPhone;

    const limit = checkOtpSendLimit(phone, ip);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: limit.reason || "RATE_LIMITED", retryAfter: limit.retryAfter },
        { status: 429 }
      );
    }

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: company.userId },
        data: { otpCode: code, otpExpiresAt: expiresAt, otpAttempts: 0 },
      }),
      prisma.otpRequest.create({ data: { phone, code, expiresAt } }),
    ]);

    const sent = await sendOtp(phone, code);
    if (!sent.ok) {
      return NextResponse.json({ ok: false, error: "OTP_SEND_FAILED", message: sent.error }, { status: 502 });
    }

    return NextResponse.json({ ok: true, ...(sent.mockCode ? { mockCode: sent.mockCode } : {}) });
  } catch (err) {
    console.error("[CompanyResendOtp] Error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
