import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";
import { logAudit } from "@/lib/audit";

const prisma = new PrismaClient();

function normalizePhone(input: string) {
  return (input || "").replace(/\D/g, "");
}

function isValidUAEPhone(phone: string) {
  return /^971\d{9}$/.test(phone);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const userAgent = req.headers.get("user-agent") || null;

    const contactPhoneRaw = String(body?.contactPhone ?? "");
    const contactEmailRaw = String(body?.contactEmail ?? "");

    const contactPhone = normalizePhone(contactPhoneRaw);
    const contactEmail = contactEmailRaw.trim();

    if (!isValidUAEPhone(contactPhone)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_CONTACT_PHONE" },
        { status: 400 }
      );
    }

    if (contactEmail && !isValidEmail(contactEmail)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_EMAIL" },
        { status: 400 }
      );
    }

    const submission = await prisma.adSubmission.findUnique({
      where: { id },
    });

    if (!submission) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (submission.status !== "DRAFT") {
      return NextResponse.json(
        { ok: false, error: "CANNOT_EDIT_AFTER_PAYMENT_STARTED" },
        { status: 400 }
      );
    }

    if (!submission.text) {
      return NextResponse.json(
        { ok: false, error: "TEXT_REQUIRED_FIRST" },
        { status: 400 }
      );
    }

    const updated = await prisma.adSubmission.update({
      where: { id },
      data: {
        contactPhone,
        contactEmail: contactEmail || null,
      },
    });

    await logAudit({
      actorType: "USER",
      actorId: submission.phone,
      ipAddress: ip,
      userAgent,
      action: "CONTACT_UPDATED",
      entity: "AdSubmission",
      entityId: submission.id,
      oldValue: {
        contactPhone: submission.contactPhone,
        contactEmail: submission.contactEmail,
      },
      newValue: {
        contactPhone: updated.contactPhone,
        contactEmail: updated.contactEmail,
      },
    });

    return NextResponse.json({
      ok: true,
      submissionId: updated.id,
      contactPhone: updated.contactPhone,
      contactEmail: updated.contactEmail,
      status: updated.status,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: err?.message ?? "" },
      { status: 500 }
    );
  }
}
