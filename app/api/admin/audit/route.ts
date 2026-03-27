import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      count: logs.length,
      logs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: err?.message ?? "" },
      { status: 500 }
    );
  }
}
