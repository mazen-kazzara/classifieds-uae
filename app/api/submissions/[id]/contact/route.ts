import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";

const prisma = new PrismaClient();

function normalizePhone(input: string) {
  return (input || "").replace(/\D/g, "");
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

    const contactPhoneRaw = String(body?.contactPhone ?? "");
    const contactEmailRaw = String(body?.contactEmail ?? "");

    const contactPhone = normalizePhone(contactPhoneRaw);
    const contactEmail = contactEmailRaw.trim();

    if (!contactPhone.startsWith("971")) {
      return NextResponse.json(
        { ok: false, error: "INVALID_CONTACT_PHONE" },
        { status: 400 }
      );
    }

    if (!isValidEmail(contactEmail)) {
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

    const updated = await prisma.adSubmission.update({
      where: { id },
      data: {
        contactPhone,
        contactEmail,
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
