export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string; type?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = await prisma.category.findUnique({ where: { slug: decodeURIComponent(slug) } });
  if (!cat) return { title: "Category Not Found" };
  return { title: `${cat.name} | Classifieds UAE`, description: `Browse ${cat.name} ads in UAE.` };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
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
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h1 style={{ color: "var(--text)", fontSize: "1.5rem", fontWeight: 700 }} className="mr-auto">{category.name} <span style={{ color: "var(--text-muted)", fontSize: "1rem", fontWeight: 400 }}>({total})</span></h1>
          <div className="flex gap-2">
            {["all","ad","offer","service"].map((t) => (
              <Link key={t} href={`/category/${slug}?type=${t}`} style={{ padding: "0.375rem 1rem", borderRadius: 999, fontSize: "0.875rem", fontWeight: 500, textDecoration: "none", border: `1.5px solid ${contentType===t ? "var(--primary)" : "var(--border)"}`, backgroundColor: contentType===t ? "var(--primary)" : "var(--surface)", color: contentType===t ? "#fff" : "var(--text-muted)", transition: "all 0.15s" }}>
                {t==="all"?"All":t.charAt(0).toUpperCase()+t.slice(1)+"s"}
              </Link>
            ))}
          </div>
          <Link href="/new" className="btn-primary" style={{ height: 36, padding: "0 1rem", fontSize: "0.875rem", textDecoration: "none" }}>+ Post Ad</Link>
        </div>

        {ads.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 2rem", backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", border: "2px dashed var(--border)" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "1.125rem", marginBottom: "1rem" }}>No ads found in {category.name}</p>
            <Link href="/new" className="btn-primary" style={{ textDecoration: "none" }}>Post the first ad</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ads.map((ad) => {
              const image = ad.media[0];
              const title = ad.title || ad.description.slice(0,60);
              return (
                <Link key={ad.id} href={`/ad/${ad.id}`} style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", textDecoration: "none", display: "block", transition: "all 0.15s" }} className="group hover:border-[var(--primary)]">
                  <div style={{ position: "relative", height: 176, backgroundColor: "var(--surface-2)", overflow: "hidden" }}>
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image.url.startsWith("/") ? image.url : `/uploads/${image.url}`} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", backgroundColor: "var(--surface-2)" }}>{ad.contentType==="offer"?"🔥":ad.contentType==="service"?"🛠️":"📦"}</div>
                    )}
                    <div className="absolute top-2 left-2 flex gap-1">
                      {ad.isPinned && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">📌</span>}
                      {ad.isFeatured && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">⭐</span>}
                      {ad.contentType!=="ad" && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ad.contentType==="offer"?"bg-orange-100 text-orange-700":"bg-green-100 text-green-700"}`}>{ad.contentType==="offer"?"Offer":"Service"}</span>}
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
            {page > 1 && <Link href={`/category/${slug}?type=${contentType}&page=${page-1}`} className="btn-secondary" style={{ textDecoration: "none" }}>← Previous</Link>}
            <span style={{ padding: "0 1rem", fontSize: "0.875rem", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>Page {page} of {totalPages}</span>
            {page < totalPages && <Link href={`/category/${slug}?type=${contentType}&page=${page+1}`} className="btn-secondary" style={{ textDecoration: "none" }}>Next →</Link>}
          </div>
        )}
      </main>
    <Footer />
    </div>
  );
}
