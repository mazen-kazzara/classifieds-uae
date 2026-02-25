import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // 🔐 Read JWT from session
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // ❌ Not logged in
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // ❌ Not admin or supervisor
    if (token.role !== "ADMIN" && token.role !== "SUPERVISOR") {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
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