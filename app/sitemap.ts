import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE = "https://classifiedsuae.ae";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // ── Static pages — both locales ────────────────────────────────────────────
  for (const locale of ["ar", "en"]) {
    entries.push(
      { url: `${BASE}/${locale}`, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
      { url: `${BASE}/${locale}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
      { url: `${BASE}/${locale}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
      { url: `${BASE}/${locale}/go`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
      { url: `${BASE}/${locale}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
      { url: `${BASE}/${locale}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    );
  }

  // ── Category pages ─────────────────────────────────────────────────────────
  try {
    const categories = await prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } });
    for (const cat of categories) {
      for (const locale of ["ar", "en"]) {
        entries.push({
          url: `${BASE}/${locale}/category/${cat.slug}`,
          lastModified: cat.updatedAt,
          changeFrequency: "hourly",
          priority: 0.9,
        });
      }
    }
  } catch {}

  return entries;
}
