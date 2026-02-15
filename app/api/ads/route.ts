import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";

const prisma = new PrismaClient();

/* ================= RATE LIMIT ================= */

const RATE_LIMIT = 60;
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

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

/* ================= HANDLER ================= */

export async function GET(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { ok: false, error: "RATE_LIMIT_EXCEEDED" },
        { status: 429 }
      );
    }

    const now = new Date();

    const page = Math.max(
      parseInt(req.nextUrl.searchParams.get("page") || "1"),
      1
    );

    const limitRaw = parseInt(
      req.nextUrl.searchParams.get("limit") || "10"
    );

    const limit = Math.min(Math.max(limitRaw, 1), 50);

    const skip = (page - 1) * limit;

    const category = req.nextUrl.searchParams.get("category");
    const search = req.nextUrl.searchParams.get("search");

    const whereClause: any = {
      status: "PUBLISHED",
      expiresAt: { gt: now },
    };

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause.description = {
        contains: search,
        mode: "insensitive",
      };
    }

    const totalCount = await prisma.ad.count({
      where: whereClause,
    });

    const ads = await prisma.ad.findMany({
      where: whereClause,
      orderBy: { publishedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        description: true,
        category: true,
        publishedAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      ads,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: err?.message ?? "" },
      { status: 500 }
    );
  }
}
