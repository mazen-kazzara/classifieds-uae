/**
 * URL-safe slug from any string. Keeps Arabic letters as-is (Next.js + Postgres
 * handle them natively) but strips diacritics, punctuation, and collapses spaces.
 */
export function slugify(input: string, maxLen = 80): string {
  if (!input) return "";
  const normalized = input.normalize("NFKD").replace(/[̀-ًͯ-ٟ]/g, ""); // strip accents + Arabic diacritics
  const cleaned = normalized
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "") // keep letters/numbers (any script), spaces, hyphens
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.slice(0, maxLen) || "post";
}
