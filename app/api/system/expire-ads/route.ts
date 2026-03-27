import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { logAudit } from "@/lib/audit";

const prisma = new PrismaClient();

export async function POST() {
  try {
    const now = new Date();

    const expiredAds = await prisma.ad.findMany({
      where: {
        status: "PUBLISHED",
        expiresAt: { lt: now },
      },
    });

    if (expiredAds.length === 0) {
      return NextResponse.json({
        ok: true,
        expiredCount: 0,
      });
    }

    let expiredCount = 0;

    for (const ad of expiredAds) {
      await prisma.ad.update({
        where: { id: ad.id },
        data: { status: "EXPIRED" },
      });

      await logAudit({
        actorType: "SYSTEM",
        action: "AD_EXPIRED",
        entity: "Ad",
        entityId: ad.id,
        oldValue: {
          status: ad.status,
          expiresAt: ad.expiresAt,
        },
        newValue: {
          status: "EXPIRED",
        },
      });

      expiredCount++;
    }

    return NextResponse.json({
      ok: true,
      expiredCount,
    });

  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: err?.message ?? "" },
      { status: 500 }
    );
  }
}
