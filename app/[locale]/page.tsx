export const revalidate = 60;
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import { getCategories, getCatArMap, getCategoryImageMap, getCategoryImage } from "@/lib/categories";
import { getLocationLabel, getCarBrandLabel } from "@/lib/locations-cars";
import Footer from "@/components/Footer";
import { getTranslations } from "@/lib/getTranslations";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  return {
    title: isAr
      ? "Classifieds UAE — إعلانات مبوبة مجانية في الإمارات | بيع، شراء وخدمات"
      : "Classifieds UAE — Free Classified Ads in the Emirates | Buy, Sell & Advertise",
    description: isAr
      ? "Classifieds UAE — أكبر منصة إعلانات مبوبة مجانية في الإمارات. انشر إعلانك مجاناً: سيارات، عقارات، وظائف، موبايلات، إلكترونيات، خدمات والمزيد في دبي، أبوظبي، الشارقة وجميع الإمارات السبع."
      : "Classifieds UAE — The #1 free classified ads platform in the United Arab Emirates. Post free ads for cars, real estate, jobs, mobiles, electronics, services & more in Dubai, Abu Dhabi, Sharjah and all 7 Emirates.",
    keywords: isAr
      ? ["إعلانات الإمارات", "بيع وشراء الإمارات", "إعلانات مبوبة دبي", "سوق الإمارات", "سيارات للبيع دبي", "عقارات الإمارات", "وظائف دبي", "إعلانات أبوظبي", "إعلانات الشارقة", "بيع وشراء دبي", "إعلانات مجانية الإمارات"]
      : ["classifieds UAE", "buy sell UAE", "classified ads Dubai", "UAE marketplace", "sell online UAE", "free ads UAE", "cars for sale Dubai", "real estate UAE", "jobs Dubai", "Abu Dhabi classifieds", "Sharjah ads", "Dubai marketplace", "UAE free ads"],
    alternates: {
      canonical: `https://classifiedsuae.ae/${locale}`,
      languages: {
        "en": "https://classifiedsuae.ae/en",
        "ar": "https://classifiedsuae.ae/ar",
        "x-default": "https://classifiedsuae.ae/en",
      },
    },
  };
}


export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getTranslations(locale, "home");
  // Round to nearest minute so ISR caching (revalidate=60) works effectively
  const now = new Date(Math.floor(Date.now() / 60000) * 60000);
  const allCats = await getCategories();
  const CAT_AR = getCatArMap(allCats);
  const CATEGORY_THUMBS = getCategoryImageMap(allCats, "thumb");
  const CATEGORY_IMAGES = getCategoryImageMap(allCats, "card");
  const [categories, featuredAds, latestAds, activeOffers, bannerSetting] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.ad.findMany({ where: { status: "PUBLISHED", deletedAt: null, isFeatured: true, expiresAt: { gt: now } }, orderBy: { publishedAt: "desc" }, take: 6, include: { media: { orderBy: { position: "asc" }, take: 1 } } }),
    prisma.ad.findMany({ where: { status: "PUBLISHED", deletedAt: null, contentType: { in: ["ad","service"] }, expiresAt: { gt: now } }, orderBy: { publishedAt: "desc" }, take: 12, include: { media: { orderBy: { position: "asc" }, take: 1 } } }),
    prisma.ad.findMany({ where: { status: "PUBLISHED", deletedAt: null, contentType: "offer", expiresAt: { gt: now }, offerEndDate: { gt: now } }, orderBy: { publishedAt: "desc" }, take: 6, include: { media: { orderBy: { position: "asc" }, take: 1 } } }),
    prisma.siteSetting.findUnique({ where: { key: "hero_banner" } }),
  ]);
  const bannerUrl = bannerSetting?.value || null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://classifiedsuae.ae/#website",
        name: "Classifieds UAE",
        alternateName: ["إعلانات مبوبة الإمارات", "Classifieds UAE", "ClassifiedsUAE"],
        url: "https://classifiedsuae.ae",
        description: "The #1 free classified ads platform in the United Arab Emirates. Post free ads for cars, real estate, jobs, electronics & services across all 7 Emirates.",
        inLanguage: ["en", "ar"],
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: "https://classifiedsuae.ae/en/search?q={search_term_string}" },
          "query-input": "required name=search_term_string",
        },
        publisher: { "@id": "https://classifiedsuae.ae/#organization" },
      },
      {
        "@type": "Organization",
        "@id": "https://classifiedsuae.ae/#organization",
        name: "Classifieds UAE",
        alternateName: "إعلانات مبوبة الإمارات",
        url: "https://classifiedsuae.ae",
        logo: {
          "@type": "ImageObject",
          url: "https://classifiedsuae.ae/Classifieds_uae_jpg.jpeg",
          width: 256,
          height: 256,
        },
        image: "https://classifiedsuae.ae/og-image.jpg",
        description: "Free classified ads platform in the UAE. Buy, sell & advertise cars, real estate, jobs, electronics, services and more across Dubai, Abu Dhabi, Sharjah and all Emirates.",
        foundingDate: "2025",
        sameAs: [
          "https://facebook.com/classifiedsuaeofficial",
          "https://instagram.com/classifiedsuaeofficial",
          "https://www.youtube.com/@classifiedsuaeofficial",
          "https://www.threads.com/@classifiedsuaeofficial",
          "https://t.me/classifiedsuaeofficial",
          "https://x.com/clasifiedsuae",
        ],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer service",
          availableLanguage: ["English", "Arabic"],
          email: "info@classifiedsuae.ae",
          areaServed: { "@type": "Country", name: "AE" },
        },
        areaServed: [
          { "@type": "City", name: "Dubai" },
          { "@type": "City", name: "Abu Dhabi" },
          { "@type": "City", name: "Sharjah" },
          { "@type": "City", name: "Ajman" },
          { "@type": "City", name: "Ras Al Khaimah" },
          { "@type": "City", name: "Fujairah" },
          { "@type": "City", name: "Umm Al Quwain" },
        ],
        address: {
          "@type": "PostalAddress",
          addressCountry: "AE",
          addressLocality: "Dubai",
          addressRegion: "Dubai",
        },
        knowsAbout: ["classified ads", "buy and sell", "real estate UAE", "cars UAE", "jobs UAE"],
      },
      {
        "@type": "WebPage",
        "@id": `https://classifiedsuae.ae/${locale}/#webpage`,
        url: `https://classifiedsuae.ae/${locale}`,
        name: locale === "ar" ? "Classifieds UAE — إعلانات مبوبة مجانية في الإمارات" : "Classifieds UAE — Free Classified Ads in the Emirates",
        isPartOf: { "@id": "https://classifiedsuae.ae/#website" },
        about: { "@id": "https://classifiedsuae.ae/#organization" },
        inLanguage: locale === "ar" ? "ar-AE" : "en-AE",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: locale === "ar" ? "الرئيسية" : "Home", item: `https://classifiedsuae.ae/${locale}` },
        ],
      },
    ],
  };

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh" }} dir={locale === "ar" ? "rtl" : "ltr"}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">

        {/* Hero */}
        <section style={{
          backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden",
          position: "relative",
        }} className="shadow-card">
          {bannerUrl && (
            <Image src={bannerUrl} alt="Classifieds UAE — Buy, Sell & Advertise in the Emirates" fill priority fetchPriority="high" sizes="100vw" style={{ objectFit: "cover" }} />
          )}
          <div className="p-8 text-center" style={{ position: "relative", zIndex: 1, ...(bannerUrl ? { backgroundColor: "rgba(0,0,0,0.35)" } : {}) }}>
            <h1 style={{ color: bannerUrl ? "#fff" : "var(--text)", ...(bannerUrl ? { textShadow: "0 2px 8px rgba(0,0,0,0.6)" } : {}) }} className="text-3xl sm:text-4xl font-extrabold mb-3">
              {t("hero")}
            </h1>
            <p style={{ color: bannerUrl ? "rgba(255,255,255,0.9)" : "var(--text-muted)", ...(bannerUrl ? { textShadow: "0 1px 4px rgba(0,0,0,0.5)" } : {}) }} className="mb-8 text-base max-w-lg mx-auto">
              {t("heroSub")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center mx-auto" style={{ maxWidth: "32rem", width: "100%" }}>
              <Link href={`/${locale}/new?type=ad`} className="btn-primary justify-center" style={{ minWidth: 0, flex: "1 1 0%", height: 44, fontSize: "0.875rem" }}>
                {t("postAd")}
              </Link>
              <Link href={`/${locale}/new?type=offer`} className="btn-secondary justify-center" style={{ minWidth: 0, flex: "1 1 0%", height: 44, fontSize: "0.875rem" }}>
                {t("postOffer")}
              </Link>
              <Link href={`/${locale}/new?type=service`} className="btn-secondary justify-center" style={{ minWidth: 0, flex: "1 1 0%", height: 44, fontSize: "0.875rem" }}>
                {t("postService")}
              </Link>
            </div>
          </div>
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section>
            <h2 style={{ color: "var(--text)" }} className="text-xl font-bold mb-4">{t("browseCategories")}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
              {categories.filter(c => !(c as any).parentId).map((cat) => (
                <Link key={cat.id} href={`/${locale}/category/${cat.slug}`}
                  style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}
                  className="flex flex-col hover:border-[var(--primary)] transition-colors text-center group">
                  <div style={{ position: "relative", width: "100%", aspectRatio: "1", overflow: "hidden" }}>
                    <Image src={CATEGORY_THUMBS[cat.slug] || CATEGORY_THUMBS["others"] || CATEGORY_THUMBS["other"]} alt={cat.name} width={200} height={200} sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 20vw" style={{ width: "100%", height: "100%", objectFit: "cover" }} className="group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <span style={{ color: "var(--text)", padding: "0.375rem 0.25rem", fontSize: "0.7rem", fontWeight: 600, lineHeight: 1.2 }} className="group-hover:text-[var(--primary)] transition-colors">{locale === "ar" ? (CAT_AR[cat.slug] || cat.name) : cat.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured Ads */}
        {featuredAds.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ color: "var(--text)" }} className="text-xl font-bold">{t("featuredAds")}</h2>
              <Link href={`/${locale}/search?featured=true`} style={{ color: "var(--primary)" }} className="text-sm font-medium hover:underline">{t("viewAll")}</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredAds.map((ad) => <AdCard key={ad.id} ad={ad} {...{} as any} badge={t("featured")} badgeStyle={{ backgroundColor: "#FEF9C3", color: "#854D0E" }} locale={locale} categoryImages={CATEGORY_IMAGES} catAr={CAT_AR} />)}
            </div>
          </section>
        )}

        {/* Active Offers */}
        {activeOffers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ color: "var(--text)" }} className="text-xl font-bold">{t("activeOffers")}</h2>
              <Link href={`/${locale}/search?type=offer`} style={{ color: "var(--primary)" }} className="text-sm font-medium hover:underline">{t("viewAll")}</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeOffers.map((ad) => <AdCard key={ad.id} ad={ad} badge={locale === "ar" ? "عرض" : "Offer"} badgeStyle={{ backgroundColor: "#FFEDD5", color: "#9A3412" }} showOfferExpiry locale={locale} categoryImages={CATEGORY_IMAGES} catAr={CAT_AR} />)}
            </div>
          </section>
        )}

        {/* Latest Ads */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ color: "var(--text)" }} className="text-xl font-bold">{`🕐 ${t("latestAds")}`}</h2>
            <Link href={`/${locale}/search`} style={{ color: "var(--primary)" }} className="text-sm font-medium hover:underline">{t("viewAll")}</Link>
          </div>
          {latestAds.length === 0 ? (
            <div style={{ backgroundColor: "var(--surface)", border: "1.5px dashed var(--border)", borderRadius: "var(--radius-lg)" }} className="text-center py-16">
              <p style={{ color: "var(--text-muted)" }} className="text-lg mb-4">{t("noAds")}</p>
              <Link href={`/${locale}/new`} className="btn-primary">{locale === "ar" ? "كن أول من ينشر إعلاناً!" : "Be the first to post!"}</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {latestAds.map((ad) => <AdCard key={ad.id} ad={ad} locale={locale} categoryImages={CATEGORY_IMAGES} catAr={CAT_AR} />)}
            </div>
          )}
        </section>

        {/* Pricing CTA */}
        <section style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)" }} className="p-8 text-center shadow-card">
          <h2 style={{ color: "var(--text)" }} className="text-2xl font-bold mb-2">{t("boostTitle")}</h2>
          <p style={{ color: "var(--text-muted)" }} className="mb-6">{t("boostSub")}</p>
          <Link href={`/${locale}/pricing`} className="btn-primary" style={{ height: 48, padding: "0 2rem", fontSize: "0.9375rem" }}>{t("viewPricing")}</Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function AdCard({
  ad, badge, badgeStyle, showOfferExpiry = false, locale = "en", categoryImages = {}, catAr = {},
}: {
  ad: {
    id: string; title?: string | null; description: string; category: string;
    contentType: string; isFeatured: boolean; offerEndDate?: Date | null;
    publishedAt?: Date | null; media: { url: string; position: number }[];
    adPrice?: number | null; isNegotiable?: boolean | null;
    location?: string | null; subCategory?: string | null;
  };
  badge?: string;
  badgeStyle?: React.CSSProperties;
  showOfferExpiry?: boolean;
  locale?: string;
  categoryImages?: Record<string, string>;
  catAr?: Record<string, string>;
}) {
  const t = getTranslations(locale, "home");
  const image = ad.media[0];
  const title = ad.title || ad.description.slice(0, 60);
  const imgSrc = image
    ? (image.url.startsWith("/") ? image.url : `/uploads/${image.url}`)
    : getCategoryImage(ad.category, categoryImages);

  return (
    <Link href={`/${locale}/ad/${ad.id}`}
      style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)" }}
      className="block overflow-hidden hover:border-[var(--primary)] hover:shadow-card transition-all group">
      {/* Image */}
      <div className="relative h-44 overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Image src={imgSrc} alt={title} width={400} height={250} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" style={{ ...(image ? {} : { opacity: 0.5 }), objectFit: "cover" }} className="w-full h-full group-hover:scale-105 transition-transform duration-300" />
        {!image && <span style={{ position: "absolute", bottom: "0.375rem", insetInlineEnd: "0.375rem", fontSize: "0.55rem", fontWeight: 600, padding: "0.125rem 0.375rem", borderRadius: 999, backgroundColor: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.75)" }}>{locale === "ar" ? "صورة توضيحية" : "Illustrative"}</span>}
        {/* Badges */}
        <div className="absolute top-2 flex gap-1" style={{ insetInlineStart: "0.5rem" }}>
          {badge && badgeStyle && (
            <span className="badge" style={badgeStyle}>{badge}</span>
          )}
          {ad.isFeatured && !badge && (
            <span className="badge" style={{ backgroundColor: "#FEF9C3", color: "#854D0E" }}>{t("featured")}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        {/* Title */}
        <p style={{ color: "var(--text)", fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 1, margin: 0 }}>{title}</p>

        {/* Price */}
        {(ad.adPrice != null || ad.isNegotiable) && (
          <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 700, color: "var(--primary)" }}>
            {ad.adPrice != null && ad.adPrice > 0 ? `${ad.adPrice.toLocaleString("en-AE")} ${locale === "ar" ? "د.إ" : "AED"}` : ""}
            {ad.adPrice != null && ad.adPrice > 0 && ad.isNegotiable ? " · " : ""}
            {ad.isNegotiable && <span style={{ fontWeight: 600, fontSize: "0.75rem" }}>{t("negotiable")}</span>}
          </p>
        )}

        {/* Description */}
        <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, margin: 0 }}>{ad.description.slice(0, 100)}</p>

        {/* Tags: Location + Sub-category */}
        {(ad.location || ad.subCategory) && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.25rem" }}>
            {ad.location && (
              <span style={{ fontSize: "0.625rem", fontWeight: 500, padding: "0.125rem 0.375rem", borderRadius: 999, backgroundColor: "color-mix(in srgb, var(--primary) 8%, var(--surface))", color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: "0.15rem" }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {getLocationLabel(ad.location, locale)}
              </span>
            )}
            {ad.subCategory && (
              <span style={{ fontSize: "0.625rem", fontWeight: 500, padding: "0.125rem 0.375rem", borderRadius: 999, backgroundColor: "color-mix(in srgb, var(--text-muted) 10%, var(--surface))", color: "var(--text-muted)", marginInlineStart: "auto" }}>
                {getCarBrandLabel(ad.subCategory, locale)}
              </span>
            )}
          </div>
        )}

        {/* Footer: Category · Date */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "0.375rem", marginTop: "0.125rem" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "capitalize" }}>{locale === "ar" ? (catAr[ad.category.toLowerCase().replace(/ /g,"-").replace(/&/g,"").replace(/--/g,"-")] || ad.category) : ad.category}</span>
          {showOfferExpiry && ad.offerEndDate
            ? <span style={{ color: "#EA580C", fontSize: "0.7rem", fontWeight: 500 }}>{locale === "ar" ? "ينتهي" : "Ends"} {new Date(ad.offerEndDate).toLocaleDateString(locale === "ar" ? "ar-AE" : "en-AE")}</span>
            : ad.publishedAt
              ? <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{new Date(ad.publishedAt).toLocaleDateString(locale === "ar" ? "ar-AE" : "en-AE")}</span>
              : null}
        </div>
      </div>
    </Link>
  );
}
