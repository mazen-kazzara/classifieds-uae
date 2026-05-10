/**
 * POST /api/company/register/start
 * Multipart form data:
 *   - planSlug:           "basic-business" | "standard-business" | "premium-business"
 *   - tradeLicenseName:   string
 *   - companyPhone:       9715XXXXXXXX (UAE format)
 *   - authorizedSignatory: string
 *   - activity:           string (category slug or label)
 *   - password:           strong password
 *   - confirmPassword:    string
 *   - termsAccepted:      "true"
 *   - tradeLicense:       File (PDF, JPEG, PNG, WEBP — max 10 MB)
 *
 * Behavior:
 *   - Validates inputs + file (size, MIME).
 *   - Rejects if a verified User+password already exists for this phone.
 *   - Saves the trade license under public/uploads/trade-licenses/{cuid}.{ext}.
 *   - Upserts a User (userType=COMPANY, hashed password, phoneVerified=false).
 *   - Generates a unique username from the trade license name.
 *   - Creates a Company in subscriptionStatus=PENDING_OTP.
 *   - Generates and stores an OTP on User.otpCode + OtpRequest, then sends via lib/otp-sender.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { sendOtp } from "@/lib/otp-sender";
import { checkOtpSendLimit } from "@/lib/otp-rate-limiter";
import { generateUniqueUsername } from "@/lib/username-generator";
import {
  companyRegistrationSchema,
  COMPANY_TRADE_LICENSE_MAX_BYTES,
  COMPANY_TRADE_LICENSE_MIME_TYPES,
} from "@/lib/validation/companyRegistrationSchema";

export const runtime = "nodejs";

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function extFromMime(mime: string): string {
  if (mime === "application/pdf") return ".pdf";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".jpg";
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
    }

    // ── Parse + validate fields ─────────────────────────────────────────────
    const fields = {
      planSlug: String(form.get("planSlug") ?? ""),
      tradeLicenseName: String(form.get("tradeLicenseName") ?? ""),
      companyPhone: String(form.get("companyPhone") ?? ""),
      authorizedSignatory: String(form.get("authorizedSignatory") ?? ""),
      activity: String(form.get("activity") ?? ""),
      password: String(form.get("password") ?? ""),
      confirmPassword: String(form.get("confirmPassword") ?? ""),
      termsAccepted: String(form.get("termsAccepted") ?? ""),
    };

    const parsed = companyRegistrationSchema.safeParse(fields);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        { ok: false, error: "VALIDATION_ERROR", field: firstIssue?.path?.join("."), message: firstIssue?.message },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // ── Validate file ───────────────────────────────────────────────────────
    const file = form.get("tradeLicense");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "FILE_REQUIRED" }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ ok: false, error: "FILE_EMPTY" }, { status: 400 });
    }
    if (file.size > COMPANY_TRADE_LICENSE_MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE", maxBytes: COMPANY_TRADE_LICENSE_MAX_BYTES }, { status: 400 });
    }
    if (!COMPANY_TRADE_LICENSE_MIME_TYPES.includes(file.type as (typeof COMPANY_TRADE_LICENSE_MIME_TYPES)[number])) {
      return NextResponse.json({ ok: false, error: "INVALID_FILE_TYPE", allowed: COMPANY_TRADE_LICENSE_MIME_TYPES }, { status: 400 });
    }

    // ── Verify plan exists ──────────────────────────────────────────────────
    const plan = await prisma.companyPlan.findUnique({ where: { slug: data.planSlug } });
    if (!plan || !plan.isActive) {
      return NextResponse.json({ ok: false, error: "INVALID_PLAN" }, { status: 400 });
    }

    // ── Reject duplicates ───────────────────────────────────────────────────
    const existingUser = await prisma.user.findUnique({
      where: { phone: data.companyPhone },
      include: { company: true },
    });

    if (existingUser?.company) {
      return NextResponse.json({ ok: false, error: "COMPANY_ALREADY_EXISTS" }, { status: 409 });
    }
    if (existingUser?.phoneVerified && existingUser?.password) {
      // Phone already belongs to a verified personal account.
      return NextResponse.json({ ok: false, error: "PHONE_IN_USE" }, { status: 409 });
    }

    // ── OTP rate-limit (per phone + IP) ─────────────────────────────────────
    const limit = checkOtpSendLimit(data.companyPhone, ip);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: limit.reason || "RATE_LIMITED", retryAfter: limit.retryAfter },
        { status: 429 }
      );
    }

    // ── Persist trade license file ──────────────────────────────────────────
    const ext = extFromMime(file.type);
    const filename = `${randomUUID()}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "trade-licenses");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    const tradeLicenseUrl = `/uploads/trade-licenses/${filename}`;

    // ── Generate username + hash password ───────────────────────────────────
    const username = await generateUniqueUsername(data.tradeLicenseName);
    const hashed = await bcrypt.hash(data.password, 12);

    // ── Generate OTP ────────────────────────────────────────────────────────
    const otpCode = generateOtpCode();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // ── Upsert User + create Company in one transaction ─────────────────────
    const company = await prisma.$transaction(async tx => {
      const user = await tx.user.upsert({
        where: { phone: data.companyPhone },
        create: {
          phone: data.companyPhone,
          username,
          password: hashed,
          name: data.authorizedSignatory,
          userType: "COMPANY",
          phoneVerified: false,
          otpCode,
          otpExpiresAt,
          otpAttempts: 0,
        },
        update: {
          username,
          password: hashed,
          name: data.authorizedSignatory,
          userType: "COMPANY",
          otpCode,
          otpExpiresAt,
          otpAttempts: 0,
        },
      });

      const c = await tx.company.create({
        data: {
          userId: user.id,
          tradeLicenseName: data.tradeLicenseName,
          tradeLicenseUrl,
          companyPhone: data.companyPhone,
          authorizedSignatory: data.authorizedSignatory,
          activity: data.activity,
          username,
          planId: plan.id,
          subscriptionStatus: "PENDING_OTP",
        },
      });

      await tx.otpRequest.create({
        data: {
          phone: data.companyPhone,
          code: otpCode,
          expiresAt: otpExpiresAt,
        },
      });

      return c;
    });

    // ── Send OTP via SMS (MSG91 in prod, mock in dev) ───────────────────────
    const sent = await sendOtp(data.companyPhone, otpCode);
    if (!sent.ok) {
      console.error("[CompanyRegister] OTP send failed for phone=%s", data.companyPhone);
      // Don't roll back — user can retry via /api/company/register/resend-otp
      return NextResponse.json(
        { ok: false, error: "OTP_SEND_FAILED", companyId: company.id, message: sent.error },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      companyId: company.id,
      username: company.username,
      planSlug: plan.slug,
      ...(sent.mockCode ? { mockCode: sent.mockCode } : {}),
    });
  } catch (err: any) {
    // Handle a unique-violation race on username (extremely unlikely after generator check)
    if (err?.code === "P2002") {
      console.error("[CompanyRegister] Unique violation:", err?.meta?.target);
      return NextResponse.json({ ok: false, error: "DUPLICATE", field: err?.meta?.target }, { status: 409 });
    }
    console.error("[CompanyRegister] Error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
