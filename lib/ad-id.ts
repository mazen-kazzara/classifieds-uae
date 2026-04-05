import { randomBytes } from "crypto";

export function generateAdId(): string {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const date = `${yy}${mm}${dd}`;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
  const rand = randomBytes(8).reduce((acc, b) => acc + chars[b % chars.length], "");
  return `${date}-${rand}`;
}
