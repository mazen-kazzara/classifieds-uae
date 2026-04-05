export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getTranslations } from "@/lib/getTranslations";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Search | Classifieds UAE" };

interface Props { searchParams: Promise<{ q?: string; type?: string; category?: string; featured?: string; page?: string }>; params: Promise<{ locale: string }> }


const CAT_AR: Record<string, string> = {
  vehicles: "مركبات", "real-estate": "عقارات", electronics: "إلكترونيات",
  jobs: "وظائف", services: "خدمات", salons: "صالونات وتجميل", "salons-beauty": "صالونات وتجميل", "salons-&-beauty": "صالونات وتجميل", "salons & beauty": "صالونات وتجميل",
  clinics: "عيادات", furniture: "أثاث", education: "تعليم", other: "أخرى",
};
export default async function SearchPage({ searchParams, params }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const query = (sp.q || "").trim();
  const contentType = sp.type || "all";
  const categorySlug = sp.category || "";
  const featuredOnly = sp.featured === "true";
  const page = Math.max(parseInt(sp.page || "1"), 1);
  const LIMIT = 20;
  const now = new Date();

  let categoryName: string | undefined;
  if (categorySlug) {
    const cat = await prisma.category.findUnique({ where: { slug: categorySlug }, select: { name: true } });
    categoryName = cat?.name;
  }

  const where: any = {
    status: "PUBLISHED", expiresAt: { gt: now },
    ...(query ? { OR: [{ title: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }] } : {}),
    ...(contentType !== "all" ? { contentType } : {}),
    ...(categoryName ? { category: { equals: categoryName, mode: "insensitive" } } : {}),
    ...(featuredOnly ? { isFeatured: true } : {}),
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
    params.set("page", "1");
    for (const [k, v] of Object.entries(overrides)) { if (v) params.set(k, v); else params.delete(k); }
    return `/search?${params.toString()}`;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <form action="/search" method="GET" className="flex gap-2 mb-6">
          <input name="q" type="text" defaultValue={query} placeholder={locale === "ar" ? "ابحث عن إعلانات..." : "Search ads..."} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-blue-400 bg-white shadow-sm" />
          <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition">{locale === "ar" ? "بحث" : "Search"}</button>
        </form>
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-5">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">{locale === "ar" ? "النوع" : "Type"}</p>
                <div className="space-y-1">
                  {["all","ad","offer","service"].map((t) => (
                    <Link key={t} href={buildUrl({ type: t==="all"?"":t, page:"1" })} className={`block px-3 py-1.5 rounded-lg text-sm transition ${(contentType==="all"&&t==="all")||contentType===t ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>
                      {t==="all" ? (locale==="ar"?"الكل":"All") : t==="ad" ? (locale==="ar"?"إعلانات":"Ads") : t==="offer" ? (locale==="ar"?"عروض":"Offers") : (locale==="ar"?"خدمات":"Services")}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">{locale === "ar" ? "الفئة" : "Category"}</p>
                <div className="space-y-1">
                  <Link href={buildUrl({ category:"", page:"1" })} className={`block px-3 py-1.5 rounded-lg text-sm transition ${!categorySlug?"bg-blue-50 text-blue-700 font-semibold":"text-gray-600 hover:bg-gray-50"}`}>{locale === "ar" ? "كل الفئات" : "All Categories"}</Link>
                  {categories.map((cat) => (
                    <Link key={cat.id} href={buildUrl({ category: cat.slug, page:"1" })} className={`block px-3 py-1.5 rounded-lg text-sm transition ${categorySlug===cat.slug?"bg-blue-50 text-blue-700 font-semibold":"text-gray-600 hover:bg-gray-50"}`}>{locale === "ar" ? (CAT_AR[cat.slug] || cat.name) : cat.name}</Link>
                  ))}
                </div>
              </div>
              <Link href={buildUrl({ featured: featuredOnly?"":"true", page:"1" })} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${featuredOnly?"bg-yellow-50 text-yellow-700 font-semibold":"text-gray-600 hover:bg-gray-50"}`}>{locale === "ar" ? "⭐ المميزة فقط" : "⭐ Featured only"}</Link>
            </div>
          </aside>
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-4">{locale === "ar" ? `${total} نتيجة` : `${total} result${total!==1?"s":""}`}{query ? ` for "${query}"`:""}</p>
            {ads.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-400 text-lg mb-4">{locale === "ar" ? "لا توجد نتائج" : "No results found"}</p>
                <Link href="/new" className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-semibold">{locale === "ar" ? "انشر إعلاناً" : "Post an ad"}</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {ads.map((ad) => {
                  const image = ad.media[0];
                  const title = ad.title || ad.description.slice(0,60);
                  return (
                    <Link key={ad.id} href={`/ad/${ad.id}`} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-blue-200 transition group">
                      <div className="relative h-40 bg-gray-100 overflow-hidden">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image.url.startsWith("/") ? image.url : `/uploads/${image.url}`} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-gray-50 to-gray-200">{ad.contentType==="offer"?"🔥":ad.contentType==="service"?"🛠️":"📦"}</div>
                        )}
                        <div className="absolute top-2 left-2 flex gap-1">
                          {ad.isFeatured && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">⭐</span>}
                          {ad.contentType!=="ad" && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ad.contentType==="offer"?"bg-orange-100 text-orange-700":"bg-green-100 text-green-700"}`}>{ad.contentType==="offer" ? (locale==="ar"?"عرض":"Offer") : (locale==="ar"?"خدمة":"Service")}</span>}
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-gray-900 text-sm line-clamp-1 group-hover:text-blue-600 transition">{title}</p>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{ad.description.slice(0,100)}</p>
                        <div className="flex justify-between mt-2">
                          <span className="text-xs text-gray-400 capitalize">{locale === "ar" ? (CAT_AR[ad.category.toLowerCase().replace(/ /g,"-")] || ad.category) : ad.category}</span>
                          {ad.publishedAt && <span className="text-xs text-gray-400">{new Date(ad.publishedAt).toLocaleDateString("en-AE")}</span>}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {page > 1 && <Link href={buildUrl({ page: String(page-1) })} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:border-blue-400">{locale === "ar" ? "التالي →" : "← Previous"}</Link>}
                <span className="px-4 py-2 text-sm text-gray-500">Page {page} of {totalPages}</span>
                {page < totalPages && <Link href={buildUrl({ page: String(page+1) })} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:border-blue-400">{locale === "ar" ? "→ السابق" : "Next →"}</Link>}
              </div>
            )}
          </div>
        </div>
      </main>
    <Footer />
    </div>
  );
}
