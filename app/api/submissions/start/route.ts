import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";
import { logAudit } from "@/lib/audit";

const prisma = new PrismaClient();

/* ================= RATE LIMIT (IP LEVEL) ================= */

const RATE_LIMIT = 10;
const WINDOW_MS = 60 * 1000;

const ipStore = new Map<
  string,
  { count: number; windowStart: number }
>();

function checkRateLimit(ip: string) {
  const now = Date.now();

  if (!ipStore.has(ip)) {
    ipStore.set(ip, { count: 1, windowStart: now });
    return true;
  }

  const record = ipStore.get(ip)!;

  if (now - record.windowStart > WINDOW_MS) {
    ipStore.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (record.count >= RATE_LIMIT) return false;

  record.count++;
  return true;
}

/* ================= HANDLER ================= */

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const userAgent = req.headers.get("user-agent") || null;

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { ok: false, error: "RATE_LIMIT_EXCEEDED" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const phone = body?.phone?.trim();

    if (!phone) {
      return NextResponse.json(
        { ok: false, error: "PHONE_REQUIRED" },
        { status: 400 }
      );
    }

    if (!/^971\d{9}$/.test(phone)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_PHONE_FORMAT" },
        { status: 400 }
      );
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const count24h = await prisma.adSubmission.count({
      where: {
        phone,
        createdAt: { gte: since },
      },
    });

    if (count24h >= 5) {
      return NextResponse.json(
        { ok: false, error: "DAILY_LIMIT_REACHED" },
        { status: 429 }
      );
    }

    const existing = await prisma.adSubmission.findFirst({
      where: {
        phone,
        status: "DRAFT",
      },
    });

    if (existing) {

      await logAudit({
        actorType: "USER",
        actorId: phone,
        ipAddress: ip,
        userAgent,
        action: "REUSE_DRAFT",
        entity: "AdSubmission",
        entityId: existing.id,
        oldValue: null,
        newValue: { status: existing.status },
      });

      return NextResponse.json({
        ok: true,
        reused: true,
        submissionId: existing.id,
        status: existing.status,
      });
    }

    const submission = await prisma.adSubmission.create({
      data: {
        phone,
        status: "DRAFT",
      },
    });

    await logAudit({
      actorType: "USER",
      actorId: phone,
      ipAddress: ip,
      userAgent,
      action: "CREATE_SUBMISSION",
      entity: "AdSubmission",
      entityId: submission.id,
      oldValue: null,
      newValue: { status: submission.status },
    });

    return NextResponse.json({
      ok: true,
      reused: false,
      submissionId: submission.id,
      status: submission.status,
    });

  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: err?.message ?? "" },
      { status: 500 }
    );
  }
}
