import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const ADMIN_KEY = process.env.ADMIN_API_KEY;

    // Admin authentication
    if (!ADMIN_KEY || req.headers.get("x-admin-key") !== ADMIN_KEY) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const submissions = await prisma.adSubmission.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        payment: true,
        ad: true,
      },
    });

    return NextResponse.json({
      ok: true,
      count: submissions.length,
      submissions,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "SERVER_ERROR",
        message: err?.message ?? "",
      },
      { status: 500 }
    );
  }
}
