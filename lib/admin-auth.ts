/**
 * Centralized admin auth: JWT + role checks, per-user rate limiting,
 * session timeout, and 2FA step-up verification.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { verifyTOTP } from "@/lib/totp";

// ── Role hierarchy ────────────────────────────────────────────────────────────
// ADMIN         : full access — including user role management, 2FA required
// CONTENT_ADMIN : manages ads/submissions/categories/packages — no user admin
// SUPERVISOR    : read-only
// USER          : regular user

export type AdminRole = "ADMIN" | "CONTENT_ADMIN" | "SUPERVISOR";

const ROLE_LEVELS: Record<string, number> = {
  SUPERVISOR: 1,
  CONTENT_ADMIN: 2,
  ADMIN: 3,
};

// ── Per-user rate limiter ─────────────────────────────────────────────────────
const userRateStore = new Map<string, { count: number; windowStart: number }>();
const RATE_WINDOW_MS = 60_000;   // 1 minute
const RATE_MAX_REQS = 120;        // 120 req/min per admin user

function checkUserRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = userRateStore.get(userId);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    userRateStore.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_MAX_REQS) return false;
  entry.count++;
  return true;
}

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of userRateStore.entries()) {
    if (now - v.windowStart > RATE_WINDOW_MS * 2) userRateStore.delete(k);
  }
}, 5 * 60_000).unref?.();

// ── Session timeout (30 min of inactivity) ────────────────────────────────────
const SESSION_IDLE_MS = 30 * 60_000;

export interface AdminAuthOptions {
  /** Minimum required role. Default: CONTENT_ADMIN */
  minRole?: AdminRole;
  /** If true, requires a fresh 2FA code in the request body (`otp` field). Default: false */
  require2FA?: boolean;
  /** If true, skips the session-timeout check (e.g. for the keep-alive ping route). Default: false */
  skipActivityUpdate?: boolean;
}

export interface AdminAuthResult {
  error?: NextResponse;
  token?: { id: string; role: AdminRole; email?: string };
}

/**
 * Enforces admin authentication, role, rate limiting, session timeout, and optional 2FA.
 *
 * Usage:
 *   const auth = await requireAdmin(req, { minRole: "ADMIN", require2FA: true });
 *   if (auth.error) return auth.error;
 *   const { id: adminId } = auth.token!;
 */
export async function requireAdmin(req: NextRequest, opts: AdminAuthOptions = {}): Promise<AdminAuthResult> {
  const minRole = opts.minRole ?? "CONTENT_ADMIN";
  const minLevel = ROLE_LEVELS[minRole];

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return { error: NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 }) };

  const role = String(token.role || "") as AdminRole;
  const userLevel = ROLE_LEVELS[role];
  if (!userLevel || userLevel < minLevel) {
    return { error: NextResponse.json({ ok: false, error: "FORBIDDEN", message: `Requires ${minRole} or higher` }, { status: 403 }) };
  }

  const userId = String(token.id || token.sub || "");
  if (!userId) return { error: NextResponse.json({ ok: false, error: "INVALID_SESSION" }, { status: 401 }) };

  // Per-user rate limiting
  if (!checkUserRateLimit(userId)) {
    return { error: NextResponse.json({ ok: false, error: "RATE_LIMIT_EXCEEDED" }, { status: 429 }) };
  }

  // Session timeout check (via lastActivityAt)
  if (!opts.skipActivityUpdate) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { lastActivityAt: true, twoFactorEnabled: true, twoFactorSecret: true } });
      if (!user) return { error: NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 401 }) };

      if (user.lastActivityAt && Date.now() - user.lastActivityAt.getTime() > SESSION_IDLE_MS) {
        return { error: NextResponse.json({ ok: false, error: "SESSION_EXPIRED", message: "Session idle timeout. Please log in again." }, { status: 401 }) };
      }

      // 2FA step-up verification for sensitive ops
      if (opts.require2FA) {
        if (!user.twoFactorEnabled || !user.twoFactorSecret) {
          return { error: NextResponse.json({ ok: false, error: "2FA_NOT_ENABLED", message: "Enable 2FA to perform this action." }, { status: 403 }) };
        }
        // Read OTP from request body (caller must send it)
        let otp: string | undefined;
        try {
          const cloned = req.clone();
          const body = await cloned.json();
          otp = body?.otp;
        } catch { /* no body */ }
        if (!otp || !verifyTOTP(String(otp), user.twoFactorSecret)) {
          return { error: NextResponse.json({ ok: false, error: "2FA_REQUIRED", message: "Valid 2FA code required." }, { status: 403 }) };
        }
      }

      // Update lastActivityAt (fire-and-forget)
      prisma.user.update({ where: { id: userId }, data: { lastActivityAt: new Date() } }).catch(() => {});
    } catch (err) {
      console.error("requireAdmin error:", err);
      return { error: NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 }) };
    }
  }

  return { token: { id: userId, role, email: token.email as string | undefined } };
}

/** Check whether a role can manage users (role changes, deletions). */
export function canManageUsers(role: string): boolean {
  return role === "ADMIN";
}

/** Check whether a role can perform content operations. */
export function canManageContent(role: string): boolean {
  return role === "ADMIN" || role === "CONTENT_ADMIN";
}
