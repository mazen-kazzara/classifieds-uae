import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

// Sitemap reads live data (categories + blog articles) — must rebuild per request.
export const dynamic = "force-dynamic";
export const revalidate = 300;

const BASE = "https://classifiedsuae.ae";

const LOCATIONS = ["dubai", "abu-dhabi", "abu-dhabi-al-ain", "sharjah", "ajman", "ras-al-khaimah", "fujairah", "umm-al-quwain"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // ── Static pages — both locales ────────────────────────────────────────────
  for (const locale of ["ar", "en"]) {
    entries.push(
      { url: `${BASE}/${locale}`, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
      { url: `${BASE}/${locale}/new`, lastModified: new Date("2026-04-01"), changeFrequency: "monthly", priority: 0.8 },
      { url: `${BASE}/${locale}/pricing`, lastModified: new Date("2026-04-01"), changeFrequency: "monthly", priority: 0.7 },
      { url: `${BASE}/${locale}/faq`, lastModified: new Date("2026-04-01"), changeFrequency: "monthly", priority: 0.6 },
      { url: `${BASE}/${locale}/about`, lastModified: new Date("2026-04-01"), changeFrequency: "monthly", priority: 0.5 },
      { url: `${BASE}/${locale}/classified`, lastModified: new Date("2026-04-01"), changeFrequency: "monthly", priority: 0.6 },
      { url: `${BASE}/${locale}/search`, lastModified: new Date("2026-04-01"), changeFrequency: "daily", priority: 0.5 },
      { url: `${BASE}/${locale}/terms`, lastModified: new Date("2026-04-01"), changeFrequency: "yearly", priority: 0.3 },
      { url: `${BASE}/${locale}/privacy`, lastModified: new Date("2026-04-01"), changeFrequency: "yearly", priority: 0.3 },
      { url: `${BASE}/${locale}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    );
  }

  // ── Blog articles (per language) ──────────────────────────────────────────
  try {
    const articles = await prisma.blogArticle.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, language: true, updatedAt: true },
      orderBy: { publishDate: "desc" },
      take: 1000,
    });
    for (const a of articles) {
      entries.push({
        url: `${BASE}/${a.language}/blog/${a.slug}`,
        lastModified: a.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {}

  // ── Category pages + Category+Location pages ──────────────────────────────
  try {
    const categories = await prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } });
    for (const cat of categories) {
      for (const locale of ["ar", "en"]) {
        // Main category page
        entries.push({
          url: `${BASE}/${locale}/category/${cat.slug}`,
          lastModified: cat.updatedAt,
          changeFrequency: "daily",
          priority: 0.9,
        });
        // Category + Location pages (high value for local SEO)
        for (const loc of LOCATIONS) {
          entries.push({
            url: `${BASE}/${locale}/category/${cat.slug}/${loc}`,
            lastModified: cat.updatedAt,
            changeFrequency: "daily",
            priority: 0.8,
          });
        }
      }
    }
  } catch {}

  return entries;
}
