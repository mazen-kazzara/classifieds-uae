/**
 * Public blog listing page — paginated list of published articles in the
 * current locale. Server-rendered for SEO; the URL is the canonical entry.
 */
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5-minute ISR fallback for fast loads

const APP_URL = process.env.APP_URL || "https://classifiedsuae.ae";
const PAGE_SIZE = 12;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  const title = isAr
    ? "المدوّنة | Classifieds UAE — نصائح ودروس للبيع والإعلان في الإمارات"
    : "Blog | Classifieds UAE — Selling, advertising & business tips for the UAE";
  const description = isAr
    ? "نصائح عملية، استراتيجيات تسويق، واتجاهات سوق الإمارات لمساعدتك على بيع وشراء أفضل عبر الإعلانات المبوّبة."
    : "Practical tips, marketing strategies, and UAE-market trends to help you buy and sell better with classifieds.";
  return {
    title,
    description,
    alternates: {
      canonical: `${APP_URL}/${locale}/blog`,
      languages: {
        en: `${APP_URL}/en/blog`,
        ar: `${APP_URL}/ar/blog`,
        "x-default": `${APP_URL}/en/blog`,
      },
    },
    openGraph: { title, description, type: "website", url: `${APP_URL}/${locale}/blog`, locale: isAr ? "ar_AE" : "en_US" },
  };
}

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function BlogIndex({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page: pageStr } = await searchParams;
  const isAr = locale === "ar";
  const page = Math.max(1, parseInt(pageStr || "1", 10) || 1);

  const where = { status: "PUBLISHED", language: isAr ? "ar" : "en" };
  const [total, articles] = await Promise.all([
    prisma.blogArticle.count({ where }),
    prisma.blogArticle.findMany({
      where,
      orderBy: { publishDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        slug: true, title: true, excerpt: true, publishDate: true,
        coverImageUrl: true, keywords: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }} dir={isAr ? "rtl" : "ltr"}>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8" style={{ textAlign: isAr ? "right" : "left" }}>
        <header style={{ marginBottom: "2rem" }}>
          <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "2rem", margin: 0 }}>
            {isAr ? "المدوّنة" : "Blog"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", marginTop: "0.5rem" }}>
            {isAr
              ? "نصائح ومقالات عن البيع والشراء والتسويق في سوق الإمارات."
              : "Tips and guides on selling, buying, and marketing in the UAE."}
          </p>
        </header>

        {articles.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>
            {isAr ? "لا توجد مقالات بعد." : "No articles yet."}
          </p>
        ) : (
          <ul style={{ display: "grid", gap: "1.25rem", listStyle: "none", padding: 0 }}>
            {articles.map(a => (
              <li key={a.slug} style={{
                backgroundColor: "var(--surface)", border: "1.5px solid var(--border)",
                borderRadius: "var(--radius-lg)", padding: "1.25rem",
              }}>
                <Link href={`/${locale}/blog/${a.slug}`} style={{ textDecoration: "none" }}>
                  <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.25rem", margin: 0, lineHeight: 1.4 }}>
                    {a.title}
                  </h2>
                </Link>
                {a.excerpt && (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", marginTop: "0.625rem", lineHeight: 1.6 }}>
                    {a.excerpt}
                  </p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.875rem", alignItems: "center" }}>
                  <time style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                    {new Date(a.publishDate).toLocaleDateString(isAr ? "ar-AE" : "en-AE", { year: "numeric", month: "long", day: "numeric" })}
                  </time>
                  {a.keywords?.slice(0, 3).map(k => (
                    <span key={k} style={{
                      fontSize: "0.6875rem", color: "var(--text-muted)",
                      backgroundColor: "var(--surface-2)", padding: "0.125rem 0.5rem",
                      borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
                    }}>
                      #{k}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <nav style={{ marginTop: "2rem", display: "flex", justifyContent: "center", gap: "0.5rem", alignItems: "center" }}>
            {page > 1 && (
              <Link href={`/${locale}/blog?page=${page - 1}`} className="btn-ghost" style={{ height: 36, padding: "0 0.875rem", fontSize: "0.8125rem" }}>
                {isAr ? "السابق →" : "← Previous"}
              </Link>
            )}
            <span style={{ color: "var(--text-muted)", fontSize: "0.8125rem", padding: "0 0.5rem" }}>
              {isAr ? `${page} من ${totalPages}` : `${page} of ${totalPages}`}
            </span>
            {page < totalPages && (
              <Link href={`/${locale}/blog?page=${page + 1}`} className="btn-ghost" style={{ height: 36, padding: "0 0.875rem", fontSize: "0.8125rem" }}>
                {isAr ? "← التالي" : "Next →"}
              </Link>
            )}
          </nav>
        )}
      </main>
      <Footer />
    </div>
  );
}
