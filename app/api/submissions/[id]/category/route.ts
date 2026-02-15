import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";

const prisma = new PrismaClient();

const ALLOWED_CATEGORIES = [
  "Real Estate",
  "Vehicles",
  "Jobs",
  "Services",
  "Electronics",
  "Home & Furniture",
  "Fashion",
  "Pets",
  "Other",
];

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const category = String(body?.category ?? "");

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_CATEGORY" },
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
      data: { category },
    });

    return NextResponse.json({
      ok: true,
      submissionId: updated.id,
      category: updated.category,
      status: updated.status,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: err?.message ?? "" },
      { status: 500 }
    );
  }
}
