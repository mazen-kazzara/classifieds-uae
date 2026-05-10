/**
 * Generate a public-profile slug ("username") from a Trade License Name.
 * - Strips diacritics, normalizes to lowercase ASCII where possible.
 * - Replaces spaces and unsupported characters with "_".
 * - Collapses repeated underscores; trims leading/trailing underscores.
 * - Falls back to "company" if the input produces an empty slug (pure punctuation).
 *
 * Uniqueness is enforced by the caller via DB checks against User.username + Company.username.
 */
import { prisma } from "@/lib/prisma";

const MAX_LEN = 32;
const MIN_LEN = 3;

export function baseSlug(input: string): string {
  if (!input) return "company";
  // Decompose accents → strip combining marks
  const normalized = input.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  // Lowercase, replace any non-[a-z0-9] with underscore
  let slug = normalized.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  // Collapse repeats and trim edges
  slug = slug.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  if (slug.length < MIN_LEN) slug = "company";
  return slug.slice(0, MAX_LEN);
}

/** Generate a unique username, appending _2, _3, ... if collisions exist. */
export async function generateUniqueUsername(tradeLicenseName: string): Promise<string> {
  const base = baseSlug(tradeLicenseName);
  // Truncate base to leave room for suffix
  const root = base.slice(0, MAX_LEN - 4);

  let attempt = root;
  let n = 1;
  // Cap iterations so a pathological collision never spins forever.
  for (let i = 0; i < 1000; i++) {
    const [u, c] = await Promise.all([
      prisma.user.findUnique({ where: { username: attempt }, select: { id: true } }),
      prisma.company.findUnique({ where: { username: attempt }, select: { id: true } }),
    ]);
    if (!u && !c) return attempt;
    n += 1;
    attempt = `${root}_${n}`;
  }
  // Fallback — extremely unlikely. Append timestamp suffix.
  return `${root}_${Date.now().toString(36)}`.slice(0, MAX_LEN);
}
