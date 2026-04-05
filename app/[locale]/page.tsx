
const CAT_AR: Record<string, string> = {
  vehicles: "مركبات", "real-estate": "عقارات", electronics: "إلكترونيات",
  jobs: "وظائف", services: "خدمات", salons: "صالونات وتجميل", "salons-beauty": "صالونات وتجميل", "salons-&-beauty": "صالونات وتجميل", "salons & beauty": "صالونات وتجميل",
  clinics: "عيادات", furniture: "أثاث",
  education: "تعليم", other: "أخرى",
};
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getTranslations } from "@/lib/getTranslations";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Classifieds UAE — Buy, Sell & Find Services in UAE",
  description: "Post free classified ads in UAE. Vehicles, real estate, electronics, jobs, services and more.",
};

const CATEGORY_IMAGES: Record<string, string> = {
  vehicles: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80",
  "real-estate": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80",
  electronics: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80",
  jobs: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80",
  services: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80",
  salons: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
  clinics: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80",
  furniture: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
  education: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
  other: "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=800&q=80",
};

function getCategoryImage(category: string): string {
  const slug = category.toLowerCase().replace(/ /g, "-").replace(/&/g, "").replace(/--/g, "-");
  return CATEGORY_IMAGES[slug] || CATEGORY_IMAGES["other"];
}

const ICONS: Record<string, string> = {
  vehicles: "🚗", "real-estate": "🏠", electronics: "💻", jobs: "💼",
  services: "🔧", salons: "💈", clinics: "🏥", furniture: "🛋️", education: "📚", other: "📦",
};

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getTranslations(locale, "home");
  const now = new Date();
  const [categories, featuredAds, latestAds, activeOffers] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.ad.findMany({ where: { status: "PUBLISHED", isFeatured: true, expiresAt: { gt: now } }, orderBy: { publishedAt: "desc" }, take: 6, include: { media: { orderBy: { position: "asc" }, take: 1 } } }),
    prisma.ad.findMany({ where: { status: "PUBLISHED", contentType: { in: ["ad","service"] }, expiresAt: { gt: now } }, orderBy: { publishedAt: "desc" }, take: 12, include: { media: { orderBy: { position: "asc" }, take: 1 } } }),
    prisma.ad.findMany({ where: { status: "PUBLISHED", contentType: "offer", expiresAt: { gt: now }, offerEndDate: { gt: now } }, orderBy: { publishedAt: "desc" }, take: 6, include: { media: { orderBy: { position: "asc" }, take: 1 } } }),
  ]);

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh" }}>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">

        {/* Hero */}
        <section style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)" }} className="p-8 text-center shadow-card">
          <h1 style={{ color: "var(--text)" }} className="text-3xl sm:text-4xl font-extrabold mb-3">
            {t("hero")}
          </h1>
          <p style={{ color: "var(--text-muted)" }} className="mb-8 text-base max-w-lg mx-auto">
            {t("heroSub")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            <Link href="/new?type=ad" className="btn-primary justify-center" style={{ minWidth: 160, height: 48, fontSize: "0.9375rem" }}>
              {`📢 ${t("postAd")}`}
            </Link>
            <Link href="/new?type=offer" className="btn-secondary justify-center" style={{ minWidth: 160, height: 48, fontSize: "0.9375rem" }}>
              {`🔥 ${t("postOffer")}`}
            </Link>
            <Link href="/new?type=service" className="btn-secondary justify-center" style={{ minWidth: 160, height: 48, fontSize: "0.9375rem" }}>
              {`🛠️ ${t("postService")}`}
            </Link>
          </div>
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section>
            <h2 style={{ color: "var(--text)" }} className="text-xl font-bold mb-4">{t("browseCategories")}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-3">
              {categories.map((cat) => (
                <Link key={cat.id} href={`/category/${cat.slug}`}
                  style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)" }}
                  className="flex flex-col items-center gap-1.5 p-3 hover:border-[var(--primary)] transition-colors text-center group">
                  <span className="text-2xl">{ICONS[cat.slug] ?? "📦"}</span>
                  <span style={{ color: "var(--text-muted)" }} className="text-xs font-medium group-hover:text-[var(--primary)] transition-colors leading-tight">{locale === "ar" ? (CAT_AR[cat.slug] || cat.name) : cat.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured Ads */}
        {featuredAds.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ color: "var(--text)" }} className="text-xl font-bold">{`⭐ ${t("featuredAds")}`}</h2>
              <Link href="/search?featured=true" style={{ color: "var(--primary)" }} className="text-sm font-medium hover:underline">{t("viewAll")}</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredAds.map((ad) => <AdCard key={ad.id} ad={ad} {...{} as any} badge={t("featured")} badgeStyle={{ backgroundColor: "#FEF9C3", color: "#854D0E" }} locale={locale} />)}
            </div>
          </section>
        )}

        {/* Active Offers */}
        {activeOffers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ color: "var(--text)" }} className="text-xl font-bold">{`🔥 ${t("activeOffers")}`}</h2>
              <Link href="/search?type=offer" style={{ color: "var(--primary)" }} className="text-sm font-medium hover:underline">{t("viewAll")}</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeOffers.map((ad) => <AdCard key={ad.id} ad={ad} badge={locale === "ar" ? "عرض" : "Offer"} badgeStyle={{ backgroundColor: "#FFEDD5", color: "#9A3412" }} showOfferExpiry locale={locale} />)}
            </div>
          </section>
        )}

        {/* Latest Ads */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ color: "var(--text)" }} className="text-xl font-bold">{`🕐 ${t("latestAds")}`}</h2>
            <Link href="/search" style={{ color: "var(--primary)" }} className="text-sm font-medium hover:underline">{t("viewAll")}</Link>
          </div>
          {latestAds.length === 0 ? (
            <div style={{ backgroundColor: "var(--surface)", border: "1.5px dashed var(--border)", borderRadius: "var(--radius-lg)" }} className="text-center py-16">
              <p style={{ color: "var(--text-muted)" }} className="text-lg mb-4">{t("noAds")}</p>
              <Link href="/new" className="btn-primary">Be the first to post!</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {latestAds.map((ad) => <AdCard key={ad.id} ad={ad} locale={locale} />)}
            </div>
          )}
        </section>

        {/* Pricing CTA */}
        <section style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)" }} className="p-8 text-center shadow-card">
          <h2 style={{ color: "var(--text)" }} className="text-2xl font-bold mb-2">{t("boostTitle")}</h2>
          <p style={{ color: "var(--text-muted)" }} className="mb-6">{t("boostSub")}</p>
          <Link href="/pricing" className="btn-primary" style={{ height: 48, padding: "0 2rem", fontSize: "0.9375rem" }}>{t("viewPricing")}</Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function AdCard({
  ad, badge, badgeStyle, showOfferExpiry = false, locale = "en",
}: {
  ad: {
    id: string; title?: string | null; description: string; category: string;
    contentType: string; isFeatured: boolean; offerEndDate?: Date | null;
    publishedAt?: Date | null; media: { url: string; position: number }[];
    adPrice?: number | null; isNegotiable?: boolean | null;
  };
  badge?: string;
  badgeStyle?: React.CSSProperties;
  showOfferExpiry?: boolean;
  locale?: string;
}) {
  const t = getTranslations(locale, "home");
  const image = ad.media[0];
  const title = ad.title || ad.description.slice(0, 60);
  const imgSrc = image
    ? (image.url.startsWith("/") ? image.url : `/uploads/${image.url}`)
    : getCategoryImage(ad.category);

  return (
    <Link href={`/ad/${ad.id}`}
      style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)" }}
      className="block overflow-hidden hover:border-[var(--primary)] hover:shadow-card transition-all group">
      {/* Image */}
      <div className="relative h-44 overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {badge && badgeStyle && (
            <span className="badge" style={badgeStyle}>{badge}</span>
          )}
          {ad.isFeatured && !badge && (
            <span className="badge" style={{ backgroundColor: "#FEF9C3", color: "#854D0E" }}>{`⭐ ${t("featured")}`}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <p style={{ color: "var(--text)" }} className="font-semibold text-sm line-clamp-1 mb-1">{title}</p>
        <p style={{ color: "var(--text-muted)" }} className="text-xs line-clamp-2 mb-2">{ad.description.slice(0, 100)}</p>

        <div className="flex items-center justify-between">
          <span style={{ color: "var(--text-muted)" }} className="text-xs capitalize">{locale === "ar" ? (CAT_AR[ad.category.toLowerCase().replace(/ /g,"-")] || ad.category) : ad.category}</span>
          {showOfferExpiry && ad.offerEndDate
            ? <span style={{ color: "#EA580C" }} className="text-xs font-medium">Ends {new Date(ad.offerEndDate).toLocaleDateString("en-AE")}</span>
            : ad.publishedAt
              ? <span style={{ color: "var(--text-muted)" }} className="text-xs">{new Date(ad.publishedAt).toLocaleDateString(locale === "ar" ? "ar-AE" : "en-AE")}</span>
              : null}
        </div>

        {/* Price */}
        {(ad.adPrice != null || ad.isNegotiable) && (
          <span>
            {ad.adPrice != null && `${ad.adPrice.toLocaleString("en-AE")} ${locale === "ar" ? "د.إ" : "AED"}`}
            {ad.adPrice != null && ad.isNegotiable && " · "}
            {ad.isNegotiable && t("negotiable")}
          </span>
          
        )}
      </div>
    </Link>
  );
}
