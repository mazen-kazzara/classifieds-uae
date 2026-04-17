import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE = "https://classifiedsuae.ae";

export async function GET() {
  const ads = await prisma.ad.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    select: { id: true, updatedAt: true },
    orderBy: { publishedAt: "desc" },
    take: 10000,
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;

  for (const ad of ads) {
    const lastmod = ad.updatedAt.toISOString().split("T")[0];
    for (const locale of ["ar", "en"]) {
      const altLocale = locale === "ar" ? "en" : "ar";
      xml += `  <url>\n`;
      xml += `    <loc>${BASE}/${locale}/ad/${ad.id}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;
      xml += `    <xhtml:link rel="alternate" hreflang="${locale}" href="${BASE}/${locale}/ad/${ad.id}"/>\n`;
      xml += `    <xhtml:link rel="alternate" hreflang="${altLocale}" href="${BASE}/${altLocale}/ad/${ad.id}"/>\n`;
      xml += `  </url>\n`;
    }
  }

  xml += `</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
