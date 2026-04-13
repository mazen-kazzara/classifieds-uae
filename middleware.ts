import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { RateLimiterMemory } from "rate-limiter-flexible";

const rateLimiter = new RateLimiterMemory({ points: 100, duration: 60 });
const adminLimiter = new RateLimiterMemory({ points: 20, duration: 60 });

const locales = ["en", "ar"];
const defaultLocale = "ar";

function getLocale(req: NextRequest): string {
  // 1. Check cookie (user's explicit choice)
  const cookieLocale = req.cookies.get("locale")?.value;
  if (cookieLocale && locales.includes(cookieLocale)) return cookieLocale;
  // 2. Default to Arabic
  return defaultLocale;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";

  // API routes — rate limit + admin auth
  if (pathname.startsWith("/api")) {
    try { await rateLimiter.consume(ip); }
    catch { return NextResponse.json({ ok: false, error: "RATE_LIMIT_EXCEEDED" }, { status: 429 }); }

    if (pathname.startsWith("/api/admin")) {
      try { await adminLimiter.consume(`admin:${ip}`); }
      catch { return NextResponse.json({ ok: false, error: "ADMIN_RATE_LIMIT_EXCEEDED" }, { status: 429 }); }
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
      if (token.role !== "ADMIN" && token.role !== "SUPERVISOR") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // Skip static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    pathname.includes(".") ||
    pathname.startsWith("/admin")
  ) {
    return NextResponse.next();
  }

  // Check if path already has a locale prefix
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    const locale = getLocale(req);
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(newUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
