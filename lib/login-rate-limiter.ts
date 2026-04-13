/**
 * Login brute force protection
 * Max 5 failed attempts per phone per 15 minutes → 15 min block
 */
interface Entry { failures: number; blockedUntil?: number; windowStart: number; }
const store = new Map<string, Entry>();
const MAX_FAILURES = 5;
const WINDOW = 15 * 60 * 1000;
const BLOCK_DURATION = 15 * 60 * 1000;

export type LoginLimitResult =
  | { allowed: true; remainingAttempts: number }
  | { allowed: false; retryAfter: number };

export function checkLoginLimit(phone: string): LoginLimitResult {
  const now = Date.now();
  const entry = store.get(phone);
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((entry.blockedUntil - now) / 1000) };
  }
  if (!entry || now - entry.windowStart > WINDOW) {
    store.set(phone, { failures: 0, windowStart: now });
    return { allowed: true, remainingAttempts: MAX_FAILURES };
  }
  return { allowed: true, remainingAttempts: MAX_FAILURES - entry.failures };
}

export function recordLoginFailure(phone: string): void {
  const now = Date.now();
  const entry = store.get(phone) || { failures: 0, windowStart: now };
  entry.failures++;
  if (entry.failures >= MAX_FAILURES) entry.blockedUntil = now + BLOCK_DURATION;
  store.set(phone, entry);
}

export function clearLoginLimit(phone: string): void {
  store.delete(phone);
}
