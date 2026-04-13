export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getTranslations } from "@/lib/getTranslations";
import type { Metadata } from "next";

const CAT_AR: Record<string, string> = {
  vehicles: "مركبات", "real-estate": "عقارات", electronics: "إلكترونيات",
  jobs: "وظائف", services: "خدمات", salons: "صالونات وتجميل", "salons-beauty": "صالونات وتجميل", "salons-&-beauty": "صالونات وتجميل", "salons & beauty": "صالونات وتجميل",
  clinics: "عيادات", furniture: "أثاث", education: "تعليم", other: "أخرى",
};

const CATEGORY_IMAGES: Record<string, string> = {
  vehicles: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80",
  "real-estate": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
  electronics: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&q=80",
  jobs: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80",
  services: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80",
  salons: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
  clinics: "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=800&q=80",
  furniture: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
  education: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80",
  other: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&q=80",
};

function getCategoryImage(category: string): string {
  const slug = category.toLowerCase().replace(/ /g, "-").replace(/&/g, "").replace(/--/g, "-");
  return CATEGORY_IMAGES[slug] || CATEGORY_IMAGES["other"];
}

interface Props { params: Promise<{ adId: string; locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { adId, locale } = await params;
  const isAr = locale === "ar";
  const ad = await prisma.ad.findUnique({ where: { id: decodeURIComponent(adId) }, include: { media: { orderBy: { position: "asc" }, take: 1 } } });
  if (!ad) return { title: isAr ? "الإعلان غير موجود" : "Ad Not Found" };
  const img = ad.media?.[0]?.url;
  const imageUrl = img ? (img.startsWith("/") ? `https://classifiedsuae.ae${img}` : `https://classifiedsuae.ae/uploads/${img}`) : "https://classifiedsuae.ae/og-image.jpg";
  const desc = ad.description.replace(/\n/g, " ").slice(0, 160);
  const title = isAr ? `${ad.title} | CLASSIFIEDS UAE` : `${ad.title} | CLASSIFIEDS UAE`;
  const url = `https://classifiedsuae.ae/${locale}/ad/${adId}`;
  return {
    title,
    description: desc,
    openGraph: {
      title: ad.title || (isAr ? "إعلان" : "Ad"),
      description: desc,
      url,
      images: [{ url: imageUrl }],
      siteName: "CLASSIFIEDS UAE",
      locale: isAr ? "ar_AE" : "en_AE",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: ad.title || (isAr ? "إعلان" : "Ad"), description: desc, images: [imageUrl] },
    alternates: {
      canonical: url,
      languages: {
        en: `https://classifiedsuae.ae/en/ad/${adId}`,
        ar: `https://classifiedsuae.ae/ar/ad/${adId}`,
        "x-default": `https://classifiedsuae.ae/en/ad/${adId}`,
      },
    },
  };
}

export default async function AdPage({ params }: Props) {
  const { adId, locale } = await params;
  const t = getTranslations(locale, "ad");
  const ad = await prisma.ad.findUnique({
    where: { id: decodeURIComponent(adId) },
    include: { media: { orderBy: { position: "asc" } } },
  });
  if (!ad) notFound();

  const now = new Date();
  const expired = ad.expiresAt < now;
  const isOffer = ad.contentType === "offer";
  const isService = ad.contentType === "service";
  const offerExpired = isOffer && ad.offerEndDate && ad.offerEndDate < now;

  prisma.ad.update({ where: { id: ad.id }, data: { viewsCount: { increment: 1 } } }).catch(() => {});

  const waNumber = ad.whatsappNumber?.replace(/\D/g, "") || "";
  const waText = encodeURIComponent(locale === "ar" ? "مرحباً، شاهدت إعلانك على CLASSIFIEDS UAE: " + (ad.title || ad.description.slice(0, 50)) : "Hi, I saw your ad on CLASSIFIEDS UAE: " + (ad.title || ad.description.slice(0, 50)));
  const whatsappUrl = waNumber ? "https://wa.me/" + waNumber + "?text=" + waText : null;

  const adPrice = (ad as any).adPrice as number | null;
  const isNegotiable = (ad as any).isNegotiable as boolean;
  const showPrice = adPrice != null || isNegotiable;
  const currency = locale === "ar" ? "د.إ" : "AED";
  const negLabel = t("negotiable");
  const priceLabel = isNegotiable && adPrice
    ? adPrice.toLocaleString("en-AE") + ` ${currency} · ${negLabel}`
    : isNegotiable ? negLabel : adPrice ? adPrice.toLocaleString("en-AE") + " " + currency : "";

  // Support both legacy single-value ("whatsapp","call","both") and
  // comma-separated format ("whatsapp,call","whatsapp,telegram,call") from the bot
  const rawMethod = ad.contactMethod || "";
  const contactMethods = rawMethod
    ? rawMethod.split(",").map((m: string) => m.trim()).filter(Boolean)
    : whatsappUrl ? ["whatsapp"] : ["call"];
  const showWhatsApp  = contactMethods.some((m: string) => m === "whatsapp" || m === "both") && !!whatsappUrl;
  const showCall      = contactMethods.some((m: string) => m === "call"     || m === "both") && !!ad.contactPhone;
  const tgUsername    = ((ad as any).telegramUsername || "").replace(/^@/, "");
  const showTelegram  = contactMethods.includes("telegram") && !!tgUsername;
  const telegramUrl   = showTelegram ? `https://t.me/${tgUsername}` : null;

  const firstImg = ad.media[0];
  const adImageUrl = firstImg ? (firstImg.url.startsWith("/") ? `https://classifiedsuae.ae${firstImg.url}` : `https://classifiedsuae.ae/uploads/${firstImg.url}`) : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: ad.title || "Ad",
        description: ad.description,
        category: ad.category,
        ...(adImageUrl && { image: adImageUrl }),
        ...(adPrice && {
          offers: {
            "@type": "Offer",
            price: adPrice,
            priceCurrency: "AED",
            availability: expired ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
            url: `https://classifiedsuae.ae/${locale}/ad/${ad.id}`,
          },
        }),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: locale === "ar" ? "الرئيسية" : "Home", item: `https://classifiedsuae.ae/${locale}` },
          { "@type": "ListItem", position: 2, name: ad.category, item: `https://classifiedsuae.ae/${locale}/category/${ad.category.toLowerCase().replace(/ /g, "-").replace(/&/g, "")}` },
          { "@type": "ListItem", position: 3, name: ad.title || "Ad" },
        ],
      },
    ],
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }} dir={locale === "ar" ? "rtl" : "ltr"}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8" style={{ textAlign: locale === "ar" ? "right" : "left" }}>
        {expired && <div style={{ backgroundColor: "color-mix(in srgb, var(--danger) 10%, var(--surface))", border: "1.5px solid var(--danger)", borderRadius: "var(--radius-md)", padding: "0.875rem 1rem", marginBottom: "1rem", color: "var(--danger)", fontSize: "0.875rem", fontWeight: 500 }}>{t("expired")}</div>}
        {offerExpired && <div style={{ backgroundColor: "#FFF7ED", border: "1.5px solid #FDBA74", borderRadius: "var(--radius-md)", padding: "0.875rem 1rem", marginBottom: "1rem", color: "#9A3412", fontSize: "0.875rem", fontWeight: 500 }}>{t("offerEnded")}</div>}

        <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)" }} className="shadow-card overflow-hidden">
          <div style={{ padding: "1.75rem 2rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "1rem" }}>
              {isOffer && <span style={{ backgroundColor: "#FFEDD5", color: "#9A3412", fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.75rem", borderRadius: 999 }}>{t("offer")}</span>}
              {isService && <span style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, var(--surface))", color: "var(--primary)", fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.75rem", borderRadius: 999 }}>{t("service")}</span>}
              {ad.isFeatured && <span style={{ backgroundColor: "#FEF9C3", color: "#854D0E", fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.75rem", borderRadius: 999 }}>{t("featured")}</span>}
              {ad.isPinned && <span style={{ backgroundColor: "#DBEAFE", color: "#1E40AF", fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.75rem", borderRadius: 999 }}>{t("pinned")}</span>}
            </div>

            <h1 style={{ color: "var(--text)", fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.375rem", lineHeight: 1.25 }}>{ad.title || t("untitled")}</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: showPrice ? "0.875rem" : "1.5rem", textTransform: "capitalize" }}>{t("category")}: {locale === "ar" ? (CAT_AR[ad.category.toLowerCase().replace(/ /g,"-")] || ad.category) : ad.category}</p>

            {showPrice && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", backgroundColor: "color-mix(in srgb, var(--primary) 10%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--primary) 25%, transparent)", borderRadius: "var(--radius-md)", padding: "0.5rem 1.25rem", marginBottom: "1.5rem" }}>
                <span style={{ color: "var(--primary)", fontWeight: 800, fontSize: "1.375rem" }}>{priceLabel}</span>
              </div>
            )}

            {isOffer && (ad.offerStartDate || ad.offerEndDate) && (
              <div style={{ backgroundColor: "#FFF7ED", border: "1.5px solid #FDBA74", borderRadius: "var(--radius-md)", padding: "0.875rem 1rem", marginBottom: "1.5rem" }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#9A3412", marginBottom: "0.25rem" }}>{t("offerPeriod")}</p>
                <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.875rem", color: "#C2410C" }}>
                  {ad.offerStartDate && <span>{t("from")}: {new Date(ad.offerStartDate).toLocaleDateString(locale === "ar" ? "ar-AE" : "en-AE")}</span>}
                  {ad.offerEndDate && <span>{t("until")}: {new Date(ad.offerEndDate).toLocaleDateString(locale === "ar" ? "ar-AE" : "en-AE")}</span>}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem", marginBottom: "1.75rem" }}>
              {ad.media.length > 0 ? ad.media.map((m) => {
                const url = m.url.startsWith("/") ? m.url : "/uploads/" + m.url;
                return (
                  <a key={m.id} href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Ad image" style={{ width: "100%", height: 260, objectFit: "cover", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)" }} />
                  </a>
                );
              }) : (
                // eslint-disable-next-line @next/next/no-img-element
                <div style={{ position: "relative" }}>
                  <img src={getCategoryImage(ad.category)} alt={ad.category} style={{ width: "100%", height: 260, objectFit: "cover", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", opacity: 0.5 }} />
                  <span style={{ position: "absolute", bottom: "0.5rem", insetInlineEnd: "0.5rem", fontSize: "0.7rem", fontWeight: 600, padding: "0.2rem 0.5rem", borderRadius: 999, backgroundColor: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.75)" }}>{locale === "ar" ? "صورة توضيحية — لا توجد صورة مرفوعة" : "Illustrative — no image uploaded"}</span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.0625rem", marginBottom: "0.625rem" }}>{t("description")}</h2>
              <p style={{ color: "var(--text-muted)", whiteSpace: "pre-line", lineHeight: 1.7, fontSize: "0.9375rem" }}>{ad.description}</p>
            </div>

            {!expired && (
              <div style={{ borderTop: "1.5px solid var(--border)", paddingTop: "1.5rem" }}>
                <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.0625rem", marginBottom: "1rem" }}>{isService ? t("bookContact") : t("contactSeller")}</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                  {showWhatsApp && (
                    <a href={whatsappUrl!} target="_blank" rel="noopener noreferrer" data-track="whatsapp" data-ad-id={ad.id}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0 1.25rem", height: 46, backgroundColor: "#25D366", color: "#fff", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "0.9375rem", textDecoration: "none" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      {t("whatsapp")}
                    </a>
                  )}
                  {showCall && (
                    <a href={"tel:" + ad.contactPhone} data-track="call" data-ad-id={ad.id}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0 1.25rem", height: 46, backgroundColor: "var(--primary)", color: "#fff", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "0.9375rem", textDecoration: "none" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
                      {t("call")}
                    </a>
                  )}
                  {showTelegram && (
                    <a href={telegramUrl!} target="_blank" rel="noopener noreferrer" data-track="telegram" data-ad-id={ad.id}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0 1.25rem", height: 46, backgroundColor: "#229ED9", color: "#fff", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "0.9375rem", textDecoration: "none" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                      {locale === "ar" ? "تيليغرام" : "Telegram"}
                    </a>
                  )}
                  {isService && ad.bookingEnabled && whatsappUrl && (
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" data-track="booking" data-ad-id={ad.id}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0 1.25rem", height: 46, backgroundColor: "#7C3AED", color: "#fff", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "0.9375rem", textDecoration: "none" }}>
                      {t("bookNow")}
                    </a>
                  )}
                </div>
              </div>
            )}

            <div style={{ borderTop: "1.5px solid var(--border)", marginTop: "2rem", paddingTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", textAlign: "center" }}>
              <div><p style={{ fontSize: "1.375rem", fontWeight: 800, color: "var(--text)" }}>{ad.viewsCount}</p><p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{t("views")}</p></div>
              <div><p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{t("adId")}</p><p style={{ fontSize: "0.7rem", fontFamily: "monospace", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.id}</p></div>
              <div><p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{t("posted")}</p><p style={{ fontSize: "0.8125rem", color: "var(--text)" }}>{ad.publishedAt ? new Date(ad.publishedAt).toLocaleDateString(locale === "ar" ? "ar-AE" : "en-AE") : "—"}</p></div>
              <div><p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{t("expires")}</p><p style={{ fontSize: "0.8125rem", color: expired ? "var(--danger)" : "var(--text)" }}>{new Date(ad.expiresAt).toLocaleDateString(locale === "ar" ? "ar-AE" : "en-AE")}</p></div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <Link href={`/${locale}`} style={{ color: "var(--primary)", textDecoration: "none", fontSize: "0.9375rem", fontWeight: 500 }}>{t("backToListings")}</Link>
        </div>
      </main>
      <Footer />
      <script dangerouslySetInnerHTML={{ __html: "document.querySelectorAll('[data-track]').forEach(el=>{el.addEventListener('click',()=>{const id=el.getAttribute('data-ad-id');const t=el.getAttribute('data-track');if(!id||!t)return;fetch('/api/ads/'+id+'/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:t})}).catch(()=>{});});});" }} />
    </div>
  );
}
