/**
 * OTP Rate Limiting (in-memory, matches existing middleware pattern)
 * - Per phone: max 3 sends per 10 minutes
 * - Per IP:    max 5 sends per 1 hour
 * - Resend:    min 60 seconds between sends per phone
 */

interface Entry { count: number; windowStart: number; lastSent?: number; }

const phoneStore = new Map<string, Entry>();
const ipStore    = new Map<string, Entry>();

const PHONE_MAX      = 3;
const PHONE_WINDOW   = 10 * 60 * 1000;   // 10 min
const IP_MAX         = 5;
const IP_WINDOW      = 60 * 60 * 1000;   // 1 hour
const RESEND_COOLDOWN = 60 * 1000;        // 60 seconds

export type RateLimitResult =
  | { allowed: true; resendIn?: number }
  | { allowed: false; reason: "PHONE_RATE_LIMIT" | "IP_RATE_LIMIT" | "RESEND_TOO_SOON"; retryAfter: number };

export function checkOtpSendLimit(phone: string, ip: string): RateLimitResult {
  const now = Date.now();

  // ── Resend cooldown (per phone) ────────────────────────────────────────────
  const phoneEntry = phoneStore.get(phone);
  if (phoneEntry?.lastSent && now - phoneEntry.lastSent < RESEND_COOLDOWN) {
    const retryAfter = Math.ceil((RESEND_COOLDOWN - (now - phoneEntry.lastSent)) / 1000);
    return { allowed: false, reason: "RESEND_TOO_SOON", retryAfter };
  }

  // ── Per-phone window ───────────────────────────────────────────────────────
  if (!phoneEntry || now - phoneEntry.windowStart > PHONE_WINDOW) {
    phoneStore.set(phone, { count: 1, windowStart: now, lastSent: now });
  } else {
    if (phoneEntry.count >= PHONE_MAX) {
      const retryAfter = Math.ceil((PHONE_WINDOW - (now - phoneEntry.windowStart)) / 1000);
      return { allowed: false, reason: "PHONE_RATE_LIMIT", retryAfter };
    }
    phoneEntry.count++;
    phoneEntry.lastSent = now;
  }

  // ── Per-IP window ──────────────────────────────────────────────────────────
  const ipEntry = ipStore.get(ip);
  if (!ipEntry || now - ipEntry.windowStart > IP_WINDOW) {
    ipStore.set(ip, { count: 1, windowStart: now });
  } else {
    if (ipEntry.count >= IP_MAX) {
      const retryAfter = Math.ceil((IP_WINDOW - (now - ipEntry.windowStart)) / 1000);
      // Roll back phone counter since IP blocked
      const pe = phoneStore.get(phone);
      if (pe) { pe.count = Math.max(0, pe.count - 1); pe.lastSent = undefined; }
      return { allowed: false, reason: "IP_RATE_LIMIT", retryAfter };
    }
    ipEntry.count++;
  }

  return { allowed: true };
}

// ── Verify attempt limiter (max 3 per phone, then block) ──────────────────────
const verifyStore = new Map<string, { attempts: number; blockedUntil?: number }>();
const VERIFY_MAX     = 3;
const VERIFY_BLOCK   = 10 * 60 * 1000; // 10 min block after 3 failures

export type VerifyLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "TOO_MANY_ATTEMPTS"; retryAfter: number };

export function checkVerifyLimit(phone: string): VerifyLimitResult {
  const now = Date.now();
  const entry = verifyStore.get(phone);
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    return { allowed: false, reason: "TOO_MANY_ATTEMPTS", retryAfter: Math.ceil((entry.blockedUntil - now) / 1000) };
  }
  return { allowed: true };
}

export function recordVerifyFailure(phone: string): void {
  const now = Date.now();
  const entry = verifyStore.get(phone) || { attempts: 0 };
  entry.attempts++;
  if (entry.attempts >= VERIFY_MAX) {
    entry.blockedUntil = now + VERIFY_BLOCK;
    entry.attempts = 0;
  }
  verifyStore.set(phone, entry);
}

export function clearVerifyLimit(phone: string): void {
  verifyStore.delete(phone);
}
