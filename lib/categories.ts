import { prisma } from "@/lib/prisma";

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&q=80";

export interface CategoryData {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  icon: string | null;
  imageUrl: string | null;
  parentId: string | null;
}

let _cache: { data: CategoryData[]; ts: number } | null = null;
const CACHE_TTL = 60_000; // 1 minute

export async function getCategories(): Promise<CategoryData[]> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) return _cache.data;
  const cats = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, nameAr: true, slug: true, icon: true, imageUrl: true, parentId: true },
  });
  _cache = { data: cats, ts: Date.now() };
  return cats;
}

export function getCatArMap(categories: CategoryData[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const cat of categories) {
    map[cat.slug] = cat.nameAr;
    // Also map common slug variants
    const altSlug = cat.name.toLowerCase().replace(/ /g, "-").replace(/&/g, "").replace(/--/g, "-");
    if (altSlug !== cat.slug) map[altSlug] = cat.nameAr;
  }
  return map;
}

export function getCategoryImageMap(categories: CategoryData[], size: "thumb" | "card" | "full" = "full"): Record<string, string> {
  const map: Record<string, string> = {};
  for (const cat of categories) {
    const base = cat.imageUrl || DEFAULT_IMAGE;
    if (size === "thumb") {
      map[cat.slug] = toUnsplashSize(base, 200, 200);
    } else if (size === "card") {
      map[cat.slug] = toUnsplashSize(base, 400, 250);
    } else {
      map[cat.slug] = base;
    }
  }
  if (!map["others"]) map["others"] = DEFAULT_IMAGE;
  if (!map["other"]) map["other"] = DEFAULT_IMAGE; // legacy fallback
  return map;
}

function toUnsplashSize(url: string, w: number, h: number): string {
  if (url.includes("unsplash.com")) {
    const base = url.split("?")[0];
    return `${base}?w=${w}&h=${h}&fit=crop&q=60`;
  }
  return url;
}

export function getCategoryImage(category: string, imageMap: Record<string, string>): string {
  const slug = category.toLowerCase().replace(/ /g, "-").replace(/&/g, "").replace(/--/g, "-");
  return imageMap[slug] || imageMap["others"] || imageMap["other"] || DEFAULT_IMAGE;
}

export function buildCategoryNormMap(categories: CategoryData[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const cat of categories) {
    // English name and slug
    map[cat.name.toLowerCase()] = cat.name;
    map[cat.slug] = cat.name;
    // Arabic
    map[cat.nameAr] = cat.name;
    // Common short forms
    const words = cat.name.toLowerCase().split(/[\s&]+/).filter(Boolean);
    for (const w of words) {
      if (!map[w] && w.length > 3) map[w] = cat.name;
    }
    const arWords = cat.nameAr.split(/\s+/).filter(Boolean);
    for (const w of arWords) {
      if (!map[w] && w.length > 2) map[w] = cat.name;
    }
  }
  return map;
}
