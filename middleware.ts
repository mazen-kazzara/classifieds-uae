import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { RateLimiterMemory } from "rate-limiter-flexible";

const rateLimiter = new RateLimiterMemory({
  points: 100, // global API requests
  duration: 60, // per 60 seconds
});

const adminLimiter = new RateLimiterMemory({
  points: 20, // admin API requests
  duration: 60, // per 60 seconds
});

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  /* ================= GLOBAL API RATE LIMIT ================= */

  if (pathname.startsWith("/api")) {
    try {
      await rateLimiter.consume(ip);
    } catch {
      return NextResponse.json(
        { ok: false, error: "RATE_LIMIT_EXCEEDED" },
        { status: 429 }
      );
    }
  }

  /* ================= SYSTEM ROUTES ================= */

  if (pathname.startsWith("/api/system")) {
    const isLocal =
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip.startsWith("::ffff:127.0.0.1");

    if (!isLocal) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const secret = req.headers.get("x-system-secret");
    const expected = process.env.EXPIRE_SECRET;

    if (!expected || secret !== expected) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
  }

  /* ================= ADMIN ROUTES ================= */

  if (pathname.startsWith("/api/admin")) {
    try {
      await adminLimiter.consume(`admin:${ip}`);
    } catch {
      return NextResponse.json(
        { ok: false, error: "ADMIN_RATE_LIMIT_EXCEEDED" },
        { status: 429 }
      );
    }

    const apiKey = req.headers.get("x-admin-key");
    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ADMIN_KEY" },
        { status: 401 }
      );
    }

    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (token.role !== "ADMIN" && token.role !== "SUPERVISOR") {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};