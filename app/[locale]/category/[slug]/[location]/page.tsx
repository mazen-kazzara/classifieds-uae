export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { notFound } from "next/navigation";
import { getTranslations } from "@/lib/getTranslations";
import type { Metadata } from "next";
import { getCategories, getCatArMap, getCategoryImageMap, getCategoryImage } from "@/lib/categories";
import { getLocationLabel, getCarBrandLabel, UAE_LOCATIONS } from "@/lib/locations-cars";

interface Props { params: Promise<{ slug: string; locale: string; location: string }>; searchParams: Promise<{ page?: string; type?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale, location } = await params;
  const isAr = locale === "ar";
  const cat = await prisma.category.findUnique({ where: { slug: decodeURIComponent(slug) } });
  if (!cat) return { title: isAr ? "الفئة غير موجودة" : "Category Not Found" };
  const catName = isAr ? cat.nameAr : cat.name;
  const locLabel = getLocationLabel(decodeURIComponent(location), locale);
  const title = isAr ? `${catName} في ${locLabel} | CLASSIFIEDS UAE` : `${cat.name} in ${locLabel} | CLASSIFIEDS UAE`;
  const desc = isAr
    ? `تصفح إعلانات ${catName} في ${locLabel}. بيع، شراء وإعلان مجاني.`
    : `Browse ${cat.name} classified ads in ${locLabel}. Buy, sell & advertise.`;
  const url = `https://classifiedsuae.ae/${locale}/category/${slug}/${location}`;
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, url, siteName: "CLASSIFIEDS UAE", locale: isAr ? "ar_AE" : "en_AE", type: "website" },
    alternates: {
      canonical: url,
      languages: {
        en: `https://classifiedsuae.ae/en/category/${slug}/${location}`,
        ar: `https://classifiedsuae.ae/ar/category/${slug}/${location}`,
      },
    },
  };
}

export default async function CategoryLocationPage({ params, searchParams }: Props) {
  const { slug, locale, location } = await params;
  const t = getTranslations(locale, "search");
  const allCats = await getCategories();
  const CAT_AR = getCatArMap(allCats);
  const CATEGORY_IMAGES = getCategoryImageMap(allCats);
  const sp = await searchParams;
  const decodedSlug = decodeURIComponent(slug);
  const decodedLocation = decodeURIComponent(location);
  const page = Math.max(parseInt(sp.page || "1"), 1);
  const contentType = sp.type || "all";
  const LIMIT = 20;

  // Validate location
  const validLocation = UAE_LOCATIONS.find(l => l.value === decodedLocation);
  if (!validLocation) notFound();

  const category = await prisma.category.findUnique({ where: { slug: decodedSlug } });
  if (!category) notFound();

  const now = new Date();
  const where: any = {
    status: "PUBLISHED",
    deletedAt: null,
    category: { equals: category.name, mode: "insensitive" },
    location: decodedLocation,
    expiresAt: { gt: now },
    ...(contentType !== "all" ? { contentType } : {}),
  };

  const [ads, total] = await Promise.all([
    prisma.ad.findMany({ where, orderBy: [{ isPinned: "desc" }, { isFeatured: "desc" }, { publishedAt: "desc" }], skip: (page-1)*LIMIT, take: LIMIT, include: { media: { orderBy: { position: "asc" }, take: 1 } } }),
    prisma.ad.count({ where }),
  ]);
  const totalPages = Math.ceil(total / LIMIT);

  const catName = locale === "ar" ? (category as any).nameAr || category.name : category.name;
  const locLabel = locale === "ar" ? validLocation.ar : validLocation.en;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }} dir={locale === "ar" ? "rtl" : "ltr"}>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "1rem", fontSize: "0.8125rem" }}>
          <Link href={`/${locale}`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>{locale === "ar" ? "الرئيسية" : "Home"}</Link>
          <span style={{ color: "var(--text-muted)" }}>›</span>
          <Link href={`/${locale}/category/${slug}`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>{catName}</Link>
          <span style={{ color: "var(--text-muted)" }}>›</span>
          <span style={{ color: "var(--primary)", fontWeight: 600 }}>{locLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h1 style={{ color: "var(--text)", fontSize: "1.5rem", fontWeight: 700 }} className="mr-auto">
            {catName}
            <span style={{ color: "var(--primary)", fontSize: "1.125rem", fontWeight: 600 }}> — {locLabel}</span>
            <span style={{ color: "var(--text-muted)", fontSize: "1rem", fontWeight: 400 }}> ({total})</span>
          </h1>
          <div className="flex gap-2">
            {["all","ad","offer","service"].map((tp) => (
              <Link key={tp} href={`/${locale}/category/${slug}/${decodedLocation}?type=${tp}`} style={{ padding: "0.375rem 1rem", borderRadius: 999, fontSize: "0.875rem", fontWeight: 500, textDecoration: "none", border: `1.5px solid ${contentType===tp ? "var(--primary)" : "var(--border)"}`, backgroundColor: contentType===tp ? "var(--primary)" : "var(--surface)", color: contentType===tp ? "#fff" : "var(--text-muted)", transition: "all 0.15s" }}>
                {tp==="all" ? (locale==="ar"?"الكل":"All") : tp==="ad" ? (locale==="ar"?"إعلانات":"Ads") : tp==="offer" ? (locale==="ar"?"عروض":"Offers") : (locale==="ar"?"خدمات":"Services")}
              </Link>
            ))}
          </div>
          <Link href={`/${locale}/new`} className="btn-primary" style={{ height: 36, padding: "0 1rem", fontSize: "0.875rem", textDecoration: "none" }}>{locale === "ar" ? "+ نشر إعلان" : "+ Post Ad"}</Link>
        </div>

        {/* Location filter pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "1.25rem" }}>
          <Link href={`/${locale}/category/${slug}`} style={{ padding: "0.3rem 0.75rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 500, textDecoration: "none", border: "1.5px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-muted)", transition: "all 0.15s" }}>
            {locale === "ar" ? "كل المواقع" : "All Locations"}
          </Link>
          {UAE_LOCATIONS.map(loc => (
            <Link key={loc.value} href={`/${locale}/category/${slug}/${loc.value}`} style={{ padding: "0.3rem 0.75rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 500, textDecoration: "none", border: `1.5px solid ${decodedLocation === loc.value ? "var(--primary)" : "var(--border)"}`, backgroundColor: decodedLocation === loc.value ? "var(--primary)" : "var(--surface)", color: decodedLocation === loc.value ? "#fff" : "var(--text-muted)", transition: "all 0.15s" }}>
              {locale === "ar" ? loc.ar : loc.en}
            </Link>
          ))}
        </div>

        {ads.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 2rem", backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", border: "2px dashed var(--border)" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "1.125rem", marginBottom: "0.5rem" }}>{locale === "ar" ? `لا توجد إعلانات ${catName} في ${locLabel}` : `No ${category.name} ads in ${locLabel}`}</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
              <Link href={`/${locale}/category/${slug}`} style={{ color: "var(--primary)", textDecoration: "none" }}>{locale === "ar" ? "عرض كل الإعلانات في هذه الفئة" : "View all ads in this category"}</Link>
            </p>
            <Link href={`/${locale}/new`} className="btn-primary" style={{ textDecoration: "none" }}>{locale === "ar" ? "انشر إعلان" : "Post an ad"}</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ads.map((ad) => {
              const image = ad.media[0];
              const title = ad.title || ad.description.slice(0,60);
              return (
                <Link key={ad.id} href={`/${locale}/ad/${ad.id}`} style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", textDecoration: "none", display: "block", transition: "all 0.15s" }} className="group hover:border-[var(--primary)]">
                  <div style={{ position: "relative", height: 176, backgroundColor: "var(--surface-2)", overflow: "hidden" }}>
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
                      {ad.isPinned && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">{locale === "ar" ? "مثبّت" : "Pinned"}</span>}
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
                      <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "capitalize" }}>{catName}</span>
                      {ad.publishedAt && <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{new Date(ad.publishedAt).toLocaleDateString(locale === "ar" ? "ar-AE" : "en-AE")}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {page > 1 && <Link href={`/${locale}/category/${slug}/${decodedLocation}?type=${contentType}&page=${page-1}`} className="btn-secondary" style={{ textDecoration: "none" }}>{locale === "ar" ? "← السابق" : "← Previous"}</Link>}
            <span style={{ padding: "0 1rem", fontSize: "0.875rem", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>{locale === "ar" ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}</span>
            {page < totalPages && <Link href={`/${locale}/category/${slug}/${decodedLocation}?type=${contentType}&page=${page+1}`} className="btn-secondary" style={{ textDecoration: "none" }}>{locale === "ar" ? "التالي →" : "Next →"}</Link>}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
