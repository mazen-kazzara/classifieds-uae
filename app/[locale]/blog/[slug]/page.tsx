/**
 * Public blog article page — full SEO meta + JSON-LD Article schema.
 * Renders Markdown (sanitized via lib/markdown — see comments there for why).
 */
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";
export const revalidate = 600;

const APP_URL = process.env.APP_URL || "https://classifiedsuae.ae";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

async function getArticle(slug: string) {
  // Next.js 15 keeps dynamic-route params URL-encoded; decode for DB lookup
  // since our slugs are stored as raw Unicode (Arabic in particular).
  let decoded: string;
  try { decoded = decodeURIComponent(slug); } catch { decoded = slug; }
  const article = await prisma.blogArticle.findFirst({
    where: { slug: decoded, status: "PUBLISHED" },
    select: {
      id: true, slug: true, language: true, topicSlug: true,
      title: true, metaTitle: true, metaDescription: true,
      keywords: true, excerpt: true, content: true, coverImageUrl: true,
      publishDate: true, updatedAt: true,
    },
  });
  if (!article) console.log(`[blog] not found slug=${decoded.slice(0, 60)}`);
  return article;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Not found" };

  const url = `${APP_URL}/${locale}/blog/${article.slug}`;
  // If a sister-language article exists for the same topic, link via hreflang.
  const sister = article.topicSlug
    ? await prisma.blogArticle.findFirst({
        where: {
          topicSlug: article.topicSlug,
          status: "PUBLISHED",
          language: { not: article.language },
        },
        select: { slug: true, language: true },
      })
    : null;

  const langs: Record<string, string> = { [article.language]: url };
  if (sister) langs[sister.language] = `${APP_URL}/${sister.language}/blog/${sister.slug}`;
  langs["x-default"] = langs.en || url;

  return {
    title: article.metaTitle,
    description: article.metaDescription,
    keywords: article.keywords,
    alternates: { canonical: url, languages: langs },
    openGraph: {
      title: article.metaTitle,
      description: article.metaDescription,
      type: "article",
      url,
      locale: article.language === "ar" ? "ar_AE" : "en_US",
      publishedTime: article.publishDate.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      ...(article.coverImageUrl ? { images: [article.coverImageUrl] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: article.metaTitle,
      description: article.metaDescription,
    },
  };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { locale, slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  // Locale ↔ article-language guard. If the URL locale doesn't match the
  // article's language, redirect to the sister-language article (same topic).
  // Falls through to 404 if no sister exists, so we never serve EN content
  // under /ar/* (or vice versa).
  const expectedLang = locale === "ar" ? "ar" : "en";
  if (article.language !== expectedLang) {
    if (article.topicSlug) {
      const sister = await prisma.blogArticle.findFirst({
        where: { topicSlug: article.topicSlug, language: expectedLang, status: "PUBLISHED" },
        select: { slug: true },
      });
      // Slugs may contain non-ASCII (Arabic) characters; the HTTP Location
      // header must be ASCII-safe.
      if (sister) redirect(`/${locale}/blog/${encodeURIComponent(sister.slug)}`);
    }
    notFound();
  }

  const isAr = article.language === "ar";

  // JSON-LD Article schema for rich Google search results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    inLanguage: article.language,
    datePublished: article.publishDate.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: { "@type": "Organization", name: "Classifieds UAE" },
    publisher: {
      "@type": "Organization",
      name: "Classifieds UAE",
      logo: { "@type": "ImageObject", url: `${APP_URL}/Classifieds_uae_jpg.jpeg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${APP_URL}/${locale}/blog/${article.slug}` },
    keywords: article.keywords?.join(", "),
    ...(article.coverImageUrl ? { image: article.coverImageUrl } : {}),
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }} dir={isAr ? "rtl" : "ltr"}>
      <Header />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="max-w-3xl mx-auto px-4 py-8" style={{ textAlign: isAr ? "right" : "left" }}>
        <nav style={{ marginBottom: "1.25rem" }}>
          <Link href={`/${locale}/blog`} style={{ color: "var(--text-muted)", fontSize: "0.8125rem", textDecoration: "none" }}>
            {isAr ? "← المدوّنة" : "← Blog"}
          </Link>
        </nav>

        <article>
          <header style={{ marginBottom: "1.75rem" }}>
            <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.875rem", lineHeight: 1.3, margin: 0 }}>
              {article.title}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginTop: "0.875rem", alignItems: "center" }}>
              <time style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }} dateTime={article.publishDate.toISOString()}>
                {new Date(article.publishDate).toLocaleDateString(isAr ? "ar-AE" : "en-AE", { year: "numeric", month: "long", day: "numeric" })}
              </time>
              {article.keywords?.slice(0, 4).map(k => (
                <span key={k} style={{
                  fontSize: "0.6875rem", color: "var(--text-muted)",
                  backgroundColor: "var(--surface-2)", padding: "0.125rem 0.5rem",
                  borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
                }}>#{k}</span>
              ))}
            </div>
          </header>

          {/* eslint-disable-next-line react/no-danger */}
          <div className="blog-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }} />
        </article>

        <hr style={{ margin: "2.5rem 0", border: 0, borderTop: "1px solid var(--border)" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <Link href={`/${locale}/blog`} className="btn-ghost" style={{ height: 36, padding: "0 0.875rem", fontSize: "0.8125rem" }}>
            {isAr ? "كل المقالات" : "All articles"}
          </Link>
          <Link href={`/${locale}/new`} className="btn-primary" style={{ height: 36, padding: "0 1rem", fontSize: "0.8125rem" }}>
            {isAr ? "انشر إعلانك الآن" : "Post your ad"}
          </Link>
        </div>
      </main>

      <style>{`
        .blog-prose { color: var(--text); font-size: 1rem; line-height: 1.85; }
        .blog-prose h2 { font-size: 1.375rem; font-weight: 800; margin: 1.75rem 0 0.625rem; color: var(--text); }
        .blog-prose h3 { font-size: 1.125rem; font-weight: 700; margin: 1.25rem 0 0.5rem; color: var(--text); }
        .blog-prose h4 { font-size: 1rem; font-weight: 700; margin: 1rem 0 0.375rem; color: var(--text); }
        .blog-prose p  { margin: 0.625rem 0; color: var(--text); }
        .blog-prose ul, .blog-prose ol { margin: 0.625rem 0; padding-inline-start: 1.5rem; }
        .blog-prose li { margin: 0.25rem 0; }
        .blog-prose a  { color: var(--primary); text-decoration: underline; text-underline-offset: 2px; }
        .blog-prose strong { font-weight: 700; color: var(--text); }
      `}</style>

      <Footer />
    </div>
  );
}
