export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { notFound } from "next/navigation";
import { getTranslations } from "@/lib/getTranslations";
import type { Metadata } from "next";

const CATEGORY_IMAGES: Record<string, string> = {
  vehicles: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80",
  "real-estate": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
  electronics: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&q=80",
  jobs: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80",
  services: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80",
  salons: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
  "salons--beauty": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
  clinics: "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=800&q=80",
  furniture: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
  education: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80",
  other: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&q=80",
};
function getCategoryImage(category: string): string {
  const s = category.toLowerCase().replace(/ /g, "-").replace(/&/g, "").replace(/--/g, "-");
  return CATEGORY_IMAGES[s] || CATEGORY_IMAGES["other"];
}

interface Props { params: Promise<{ slug: string; locale: string }>; searchParams: Promise<{ page?: string; type?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const isAr = locale === "ar";
  const cat = await prisma.category.findUnique({ where: { slug: decodeURIComponent(slug) } });
  if (!cat) return { title: isAr ? "الفئة غير موجودة" : "Category Not Found" };
  const name = isAr ? cat.nameAr : cat.name;
  const title = isAr ? `${name} | CLASSIFIEDS UAE` : `${name} | CLASSIFIEDS UAE`;
  const desc = isAr
    ? `تصفح إعلانات ${name} المبوبة في الإمارات. اعثر على أفضل العروض — بيع، شراء وإعلان مجاني.`
    : `Browse ${cat.name} classified ads in UAE. Find the best deals on ${cat.name.toLowerCase()} — buy, sell & advertise for free.`;
  const url = `https://classifiedsuae.ae/${locale}/category/${slug}`;
  return {
    title,
    description: desc,
    openGraph: {
      title: `${name} — CLASSIFIEDS UAE`,
      description: desc,
      url,
      siteName: "CLASSIFIEDS UAE",
      locale: isAr ? "ar_AE" : "en_AE",
      type: "website",
    },
    alternates: {
      canonical: url,
      languages: {
        en: `https://classifiedsuae.ae/en/category/${slug}`,
        ar: `https://classifiedsuae.ae/ar/category/${slug}`,
        "x-default": `https://classifiedsuae.ae/en/category/${slug}`,
      },
    },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug, locale } = await params;
  const t = getTranslations(locale, "search");
  const CAT_AR: Record<string, string> = {
    vehicles: "مركبات", "real-estate": "عقارات", electronics: "إلكترونيات",
    jobs: "وظائف", services: "خدمات", salons: "صالونات وتجميل", "salons-beauty": "صالونات وتجميل", "salons-&-beauty": "صالونات وتجميل", "salons & beauty": "صالونات وتجميل",
    clinics: "عيادات", furniture: "أثاث", education: "تعليم", other: "أخرى",
  };
  const sp = await searchParams;
  const decodedSlug = decodeURIComponent(slug);
  const page = Math.max(parseInt(sp.page || "1"), 1);
  const contentType = sp.type || "all";
  const LIMIT = 20;

  const category = await prisma.category.findUnique({ where: { slug: decodedSlug } });
  if (!category) notFound();

  const now = new Date();
  const where: any = {
    status: "PUBLISHED",
    category: { equals: category.name, mode: "insensitive" },
    expiresAt: { gt: now },
    ...(contentType !== "all" ? { contentType } : {}),
  };

  const [ads, total] = await Promise.all([
    prisma.ad.findMany({ where, orderBy: [{ isPinned: "desc" }, { isFeatured: "desc" }, { publishedAt: "desc" }], skip: (page-1)*LIMIT, take: LIMIT, include: { media: { orderBy: { position: "asc" }, take: 1 } } }),
    prisma.ad.count({ where }),
  ]);
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }} dir={locale === "ar" ? "rtl" : "ltr"}>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h1 style={{ color: "var(--text)", fontSize: "1.5rem", fontWeight: 700 }} className="mr-auto">{locale === "ar" ? (CAT_AR[category.slug] || category.name) : category.name} <span style={{ color: "var(--text-muted)", fontSize: "1rem", fontWeight: 400 }}>({total})</span></h1>
          <div className="flex gap-2">
            {["all","ad","offer","service"].map((t) => (
              <Link key={t} href={`/category/${slug}?type=${t}`} style={{ padding: "0.375rem 1rem", borderRadius: 999, fontSize: "0.875rem", fontWeight: 500, textDecoration: "none", border: `1.5px solid ${contentType===t ? "var(--primary)" : "var(--border)"}`, backgroundColor: contentType===t ? "var(--primary)" : "var(--surface)", color: contentType===t ? "#fff" : "var(--text-muted)", transition: "all 0.15s" }}>
                {t==="all" ? (locale==="ar"?"الكل":"All") : t==="ad" ? (locale==="ar"?"إعلانات":"Ads") : t==="offer" ? (locale==="ar"?"عروض":"Offers") : (locale==="ar"?"خدمات":"Services")}
              </Link>
            ))}
          </div>
          <Link href={`/${locale}/new`} className="btn-primary" style={{ height: 36, padding: "0 1rem", fontSize: "0.875rem", textDecoration: "none" }}>{locale === "ar" ? "+ نشر إعلان" : "+ Post Ad"}</Link>
        </div>

        {ads.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 2rem", backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", border: "2px dashed var(--border)" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "1.125rem", marginBottom: "1rem" }}>{locale === "ar" ? `لا توجد إعلانات في ${CAT_AR[category.slug] || category.name}` : `No ads found in ${category.name}`}</p>
            <Link href={`/${locale}/new`} className="btn-primary" style={{ textDecoration: "none" }}>{locale === "ar" ? "انشر أول إعلان" : "Post the first ad"}</Link>
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
                      src={image ? (image.url.startsWith("/") ? image.url : `/uploads/${image.url}`) : getCategoryImage(ad.category)}
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
                  <div style={{ padding: "0.75rem" }}>
                    <p style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.875rem", overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 1 }}>{title}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem", overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}>{ad.description.slice(0,100)}</p>
                    {ad.publishedAt && <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>{new Date(ad.publishedAt).toLocaleDateString("en-AE")}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {page > 1 && <Link href={`/${locale}/category/${slug}?type=${contentType}&page=${page-1}`} className="btn-secondary" style={{ textDecoration: "none" }}>{locale === "ar" ? "← السابق" : "← Previous"}</Link>}
            <span style={{ padding: "0 1rem", fontSize: "0.875rem", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>{locale === "ar" ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}</span>
            {page < totalPages && <Link href={`/${locale}/category/${slug}?type=${contentType}&page=${page+1}`} className="btn-secondary" style={{ textDecoration: "none" }}>{locale === "ar" ? "التالي →" : "Next →"}</Link>}
          </div>
        )}
      </main>
    <Footer />
    </div>
  );
}
