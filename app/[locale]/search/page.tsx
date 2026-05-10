export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getTranslations } from "@/lib/getTranslations";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Search Ads | Classifieds UAE",
  description: "Search classified ads in UAE. Find vehicles, real estate, electronics, jobs, services and more.",
  robots: { index: false },
};

import { getCategories, getCatArMap, getCategoryImageMap, getCategoryImage } from "@/lib/categories";
import { getLocationLabel, getCarBrandLabel } from "@/lib/locations-cars";
import { PixelSearch } from "@/components/PixelEvents";

interface Props { searchParams: Promise<{ q?: string; type?: string; category?: string; featured?: string; page?: string; location?: string }>; params: Promise<{ locale: string }> }
export default async function SearchPage({ searchParams, params }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const query = (sp.q || "").trim();
  const contentType = sp.type || "all";
  const categorySlug = sp.category || "";
  const featuredOnly = sp.featured === "true";
  const locationFilter = sp.location || "";
  const page = Math.max(parseInt(sp.page || "1"), 1);
  const LIMIT = 20;
  const now = new Date();
  const allCats = await getCategories();
  const CAT_AR = getCatArMap(allCats);
  const CATEGORY_IMAGES = getCategoryImageMap(allCats);

  let categoryName: string | undefined;
  if (categorySlug) {
    const cat = await prisma.category.findUnique({ where: { slug: categorySlug }, select: { name: true } });
    categoryName = cat?.name;
  }

  const where: any = {
    status: "PUBLISHED", expiresAt: { gt: now }, deletedAt: null,
    ...(query ? { OR: [{ title: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }] } : {}),
    ...(contentType !== "all" ? { contentType } : {}),
    ...(categoryName ? { category: { equals: categoryName, mode: "insensitive" } } : {}),
    ...(featuredOnly ? { isFeatured: true } : {}),
    ...(locationFilter ? { location: locationFilter } : {}),
  };

  const [ads, total, categories] = await Promise.all([
    prisma.ad.findMany({ where, orderBy: [{ isPinned: "desc" }, { isFeatured: "desc" }, { publishedAt: "desc" }], skip: (page-1)*LIMIT, take: LIMIT, include: { media: { orderBy: { position: "asc" }, take: 1 } } }),
    prisma.ad.count({ where }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true } }),
  ]);
  const totalPages = Math.ceil(total / LIMIT);

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (contentType !== "all") params.set("type", contentType);
    if (categorySlug) params.set("category", categorySlug);
    if (featuredOnly) params.set("featured", "true");
    if (locationFilter) params.set("location", locationFilter);
    params.set("page", "1");
    for (const [k, v] of Object.entries(overrides)) { if (v) params.set(k, v); else params.delete(k); }
    return `/search?${params.toString()}`;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }} dir={locale === "ar" ? "rtl" : "ltr"}>
      {query && <PixelSearch searchString={query} />}
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <form action={`/${locale}/search`} method="GET" className="flex gap-2 mb-6">
          <input name="q" type="text" defaultValue={query} placeholder={locale === "ar" ? "ابحث عن إعلانات..." : "Search ads..."} style={{ flex: 1, padding: "0.75rem 1rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", outline: "none", backgroundColor: "var(--surface)", color: "var(--text)", fontSize: "0.875rem" }} />
          <button type="submit" className="btn-primary" style={{ padding: "0.75rem 1.5rem", fontSize: "0.875rem" }}>{locale === "ar" ? "بحث" : "Search"}</button>
        </form>
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-56 flex-shrink-0">
            <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1rem" }} className="space-y-5">
              <div>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>{locale === "ar" ? "النوع" : "Type"}</p>
                <div className="space-y-1">
                  {["all","ad","offer","service"].map((tp) => {
                    const isActive = (contentType==="all"&&tp==="all")||contentType===tp;
                    return (
                      <Link key={tp} href={buildUrl({ type: tp==="all"?"":tp, page:"1" })} style={{ display: "block", padding: "0.375rem 0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.8125rem", textDecoration: "none", fontWeight: isActive ? 600 : 400, backgroundColor: isActive ? "color-mix(in srgb, var(--primary) 10%, var(--surface))" : "transparent", color: isActive ? "var(--primary)" : "var(--text-muted)", transition: "all 0.15s" }}>
                        {tp==="all" ? (locale==="ar"?"الكل":"All") : tp==="ad" ? (locale==="ar"?"إعلانات":"Ads") : tp==="offer" ? (locale==="ar"?"عروض":"Offers") : (locale==="ar"?"خدمات":"Services")}
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>{locale === "ar" ? "الفئة" : "Category"}</p>
                <div className="space-y-1">
                  <Link href={buildUrl({ category:"", page:"1" })} style={{ display: "block", padding: "0.375rem 0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.8125rem", textDecoration: "none", fontWeight: !categorySlug ? 600 : 400, backgroundColor: !categorySlug ? "color-mix(in srgb, var(--primary) 10%, var(--surface))" : "transparent", color: !categorySlug ? "var(--primary)" : "var(--text-muted)", transition: "all 0.15s" }}>{locale === "ar" ? "كل الفئات" : "All Categories"}</Link>
                  {categories.map((cat) => {
                    const isActive = categorySlug===cat.slug;
                    return (
                      <Link key={cat.id} href={buildUrl({ category: cat.slug, page:"1" })} style={{ display: "block", padding: "0.375rem 0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.8125rem", textDecoration: "none", fontWeight: isActive ? 600 : 400, backgroundColor: isActive ? "color-mix(in srgb, var(--primary) 10%, var(--surface))" : "transparent", color: isActive ? "var(--primary)" : "var(--text-muted)", transition: "all 0.15s" }}>{locale === "ar" ? (CAT_AR[cat.slug] || cat.name) : cat.name}</Link>
                    );
                  })}
                </div>
              </div>
              <Link href={buildUrl({ featured: featuredOnly?"":"true", page:"1" })} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.375rem 0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.8125rem", textDecoration: "none", fontWeight: featuredOnly ? 600 : 400, backgroundColor: featuredOnly ? "color-mix(in srgb, #F59E0B 10%, var(--surface))" : "transparent", color: featuredOnly ? "#F59E0B" : "var(--text-muted)", transition: "all 0.15s" }}>{locale === "ar" ? "المميزة فقط" : "Featured only"}</Link>
            </div>
          </aside>
          <div className="flex-1">
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1rem" }}>{locale === "ar" ? `${total} نتيجة` : `${total} result${total!==1?"s":""}`}{query ? ` for "${query}"`:""}</p>
            {ads.length === 0 ? (
              <div style={{ textAlign: "center", padding: "5rem 2rem", backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", border: "2px dashed var(--border)" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "1.125rem", marginBottom: "1rem" }}>{locale === "ar" ? "لا توجد نتائج" : "No results found"}</p>
                <Link href={`/${locale}/new`} className="btn-primary" style={{ textDecoration: "none" }}>{locale === "ar" ? "انشر إعلاناً" : "Post an ad"}</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {ads.map((ad) => {
                  const image = ad.media[0];
                  const title = ad.title || ad.description.slice(0,60);
                  return (
                    <Link key={ad.id} href={`/${locale}/ad/${ad.id}`} style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", display: "block", textDecoration: "none", transition: "all 0.15s" }} className="group hover:border-[var(--primary)]">
                      <div style={{ position: "relative", height: 160, backgroundColor: "var(--surface-2)", overflow: "hidden" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image ? (image.url.startsWith("/") ? image.url : `/uploads/${image.url}`) : getCategoryImage(ad.category, CATEGORY_IMAGES)}
                          alt={title}
                          loading="eager"
                          style={image ? {} : { opacity: 0.5 }}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        {!image && <span style={{ position: "absolute", bottom: "0.375rem", insetInlineEnd: "0.375rem", fontSize: "0.55rem", fontWeight: 600, padding: "0.125rem 0.375rem", borderRadius: 999, backgroundColor: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.75)" }}>{locale === "ar" ? "صورة توضيحية" : "Illustrative"}</span>}
                        <div className="absolute top-2 flex gap-1" style={{ insetInlineStart: "0.5rem" }}>
                          {ad.isFeatured && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{locale === "ar" ? "مميز" : "Featured"}</span>}
                          {ad.contentType!=="ad" && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ad.contentType==="offer"?"bg-orange-100 text-orange-700":"bg-green-100 text-green-700"}`}>{ad.contentType==="offer" ? (locale==="ar"?"عرض":"Offer") : (locale==="ar"?"خدمة":"Service")}</span>}
                        </div>
                      </div>
                      <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                        <p style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.875rem", overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 1, margin: 0 }}>{title}</p>
                        {((ad as any).adPrice != null || (ad as any).isNegotiable) && (
                          <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 700, color: "var(--primary)" }}>
                            {(ad as any).adPrice != null && (ad as any).adPrice > 0 ? `${(ad as any).adPrice.toLocaleString("en-AE")} ${locale === "ar" ? "د.إ" : "AED"}` : ""}
                            {(ad as any).adPrice > 0 && (ad as any).isNegotiable ? " · " : ""}
                            {(ad as any).isNegotiable && <span style={{ fontWeight: 600, fontSize: "0.75rem" }}>{locale === "ar" ? "قابل للتفاوض" : "Negotiable"}</span>}
                          </p>
                        )}
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, margin: 0 }}>{ad.description.slice(0,100)}</p>
                        {((ad as any).location || (ad as any).subCategory) && (
                          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.25rem" }}>
                            {(ad as any).location && (
                              <span style={{ fontSize: "0.625rem", fontWeight: 500, padding: "0.125rem 0.375rem", borderRadius: 999, backgroundColor: "color-mix(in srgb, var(--primary) 8%, var(--surface))", color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: "0.15rem" }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                {getLocationLabel((ad as any).location, locale)}
                              </span>
                            )}
                            {(ad as any).subCategory && (
                              <span style={{ fontSize: "0.625rem", fontWeight: 500, padding: "0.125rem 0.375rem", borderRadius: 999, backgroundColor: "color-mix(in srgb, var(--text-muted) 10%, var(--surface))", color: "var(--text-muted)", marginInlineStart: "auto" }}>
                                {getCarBrandLabel((ad as any).subCategory, locale)}
                              </span>
                            )}
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "0.375rem", marginTop: "0.125rem" }}>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "capitalize" }}>{locale === "ar" ? (CAT_AR[ad.category.toLowerCase().replace(/ /g,"-").replace(/&/g,"").replace(/--/g,"-")] || ad.category) : ad.category}</span>
                          {ad.publishedAt && <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{new Date(ad.publishedAt).toLocaleDateString("en-AE")}</span>}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {page > 1 && <Link href={buildUrl({ page: String(page-1) })} style={{ padding: "0.5rem 1rem", backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "none" }}>{locale === "ar" ? "← السابق" : "← Previous"}</Link>}
                <span style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>{locale === "ar" ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}</span>
                {page < totalPages && <Link href={buildUrl({ page: String(page+1) })} style={{ padding: "0.5rem 1rem", backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "none" }}>{locale === "ar" ? "التالي →" : "Next →"}</Link>}
              </div>
            )}
          </div>
        </div>
      </main>
    <Footer />
    </div>
  );
}
