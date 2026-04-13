import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/_next/", "/success", "/cancel"],
      },
    ],
    sitemap: [
      "https://classifiedsuae.ae/sitemap.xml",
      "https://classifiedsuae.ae/sitemap-ads.xml",
    ],
  };
}
