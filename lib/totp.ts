/**
 * TOTP (RFC 6238) implementation — zero external deps.
 * Used for 2FA on admin accounts.
 */
import crypto from "crypto";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TIME_STEP = 30; // seconds
const DIGITS = 6;

export function generateSecret(): string {
  // 160 bits = 32 base32 chars, per RFC 4226 recommendation
  const buf = crypto.randomBytes(20);
  return base32Encode(buf);
}

function base32Encode(buf: Buffer): string {
  let bits = "";
  let result = "";
  for (const byte of buf) bits += byte.toString(2).padStart(8, "0");
  while (bits.length % 5 !== 0) bits += "0";
  for (let i = 0; i < bits.length; i += 5) {
    result += BASE32_CHARS[parseInt(bits.slice(i, i + 5), 2)];
  }
  return result;
}

function base32Decode(encoded: string): Buffer {
  const clean = encoded.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  let bits = "";
  for (const c of clean) {
    const val = BASE32_CHARS.indexOf(c);
    if (val < 0) throw new Error("INVALID_BASE32");
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 7 < bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function computeTOTP(secret: string, counter: number): string {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(counter));
  const key = base32Decode(secret);
  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    10 ** DIGITS;
  return code.toString().padStart(DIGITS, "0");
}

export function generateTOTP(secret: string): string {
  const counter = Math.floor(Date.now() / 1000 / TIME_STEP);
  return computeTOTP(secret, counter);
}

/**
 * Verifies a TOTP code with ±1 step drift tolerance (±30 seconds).
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyTOTP(token: string, secret: string, window = 1): boolean {
  if (!token || !secret || !/^\d{6}$/.test(token)) return false;
  const now = Math.floor(Date.now() / 1000 / TIME_STEP);
  const tokenBuf = Buffer.from(token);
  for (let i = -window; i <= window; i++) {
    try {
      const expected = computeTOTP(secret, now + i);
      const expectedBuf = Buffer.from(expected);
      if (tokenBuf.length === expectedBuf.length && crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
        return true;
      }
    } catch { /* continue */ }
  }
  return false;
}

/**
 * Builds an otpauth:// URL for QR-code enrollment in authenticator apps.
 */
export function buildOtpAuthUrl(secret: string, label: string, issuer = "Classifieds UAE"): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(TIME_STEP),
  });
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?${params.toString()}`;
}
