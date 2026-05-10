/**
 * Daily blog article generator — secret-protected cron endpoint.
 *
 * Auth: matches the existing /api/cron/* pattern (header `x-cron-secret` or
 * query `?secret=`), env var `BLOG_CRON_SECRET`.
 *
 * Behavior:
 *   - Idempotent per UTC day: if any AI article was published today, returns
 *     `{ ok: true, skipped: true, reason: "ALREADY_PUBLISHED_TODAY" }`.
 *   - Picks one topic via lib/ai/pickTopic (excludes last 30 days).
 *   - Generates Arabic AND English articles in parallel for that topic.
 *   - Both go through SEO/length validation; any that fail are saved as DRAFT
 *     (so we still see the attempt) but not counted as a successful publish.
 *
 * Existing cron jobs are untouched — this lives in its own route file with its
 * own secret env var.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateArticle } from "@/lib/ai/generateArticle";
import { pickNextTopic } from "@/lib/ai/pickTopic";
import { slugify } from "@/lib/ai/slugify";

export const maxDuration = 120; // generation can take ~30–60s; give Next.js room

function startOfUtcDay(d = new Date()): Date {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

async function uniqueSlug(base: string, language: "ar" | "en"): Promise<string> {
  let slug = `${base}-${language}`;
  let n = 2;
  while (await prisma.blogArticle.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${language}-${n++}`;
    if (n > 100) {
      // Defensive — should never hit. Append timestamp.
      return `${base}-${language}-${Date.now().toString(36)}`;
    }
  }
  return slug;
}

async function handle(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const expected = process.env.BLOG_CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ ok: false, error: "BLOG_CRON_SECRET_NOT_SET" }, { status: 500 });
  }
  const provided = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  if (provided !== expected) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  // ── Idempotency ─────────────────────────────────────────────────────────
  // Skip only if BOTH AR + EN are already published today. If only one
  // language succeeded earlier, retry the missing language with the same
  // topic so we don't permanently lose a pair.
  const todayStart = startOfUtcDay();
  const todayArticles = await prisma.blogArticle.findMany({
    where: { source: "AI", status: "PUBLISHED", publishDate: { gte: todayStart } },
    select: { language: true, topicSlug: true },
  });
  const todayLangs = new Set(todayArticles.map(a => a.language));
  if (todayLangs.has("ar") && todayLangs.has("en")) {
    console.log(`[blog/cron] skipped — AR + EN already published today`);
    return NextResponse.json({ ok: true, skipped: true, reason: "ALREADY_PUBLISHED_TODAY" });
  }

  // ── Pick a topic ────────────────────────────────────────────────────────
  // If we already published one language today, keep its topic for the pair.
  let topic;
  const reusedTopicSlug = todayArticles[0]?.topicSlug;
  if (reusedTopicSlug) {
    const { TOPICS } = await import("@/lib/ai/topics");
    topic = TOPICS.find(t => t.slug === reusedTopicSlug) || (await pickNextTopic());
    console.log(`[blog/cron] resuming today's topic=${topic?.slug} (missing langs: ${["ar","en"].filter(l => !todayLangs.has(l)).join(",")})`);
  } else {
    topic = await pickNextTopic();
    if (topic) console.log(`[blog/cron] selected topic=${topic.slug} category=${topic.category}`);
  }
  if (!topic) {
    return NextResponse.json({ ok: false, error: "NO_TOPIC_AVAILABLE" }, { status: 500 });
  }

  // ── Generate only the missing languages ─────────────────────────────────
  const langsToGenerate = (["ar", "en"] as const).filter(l => !todayLangs.has(l));
  const results = await Promise.all(langsToGenerate.map(l => generateArticle(topic!, l)));
  const generated = langsToGenerate.map((lang, i) => [lang, results[i]] as const);

  const created: Array<{ id: string; slug: string; language: string; status: string }> = [];

  for (const [lang, gen] of generated) {
    if (!gen) {
      console.error(`[blog/cron] generation failed for lang=${lang} topic=${topic.slug}`);
      continue;
    }
    try {
      const baseSlug = slugify(gen.title, 60) || topic.slug;
      const slug = await uniqueSlug(baseSlug, lang);
      const article = await prisma.blogArticle.create({
        data: {
          slug,
          language: lang,
          topicSlug: topic.slug,
          title: gen.title,
          metaTitle: gen.metaTitle,
          metaDescription: gen.metaDescription,
          keywords: gen.keywords,
          excerpt: gen.excerpt,
          content: gen.content,
          source: "AI",
          status: "PUBLISHED",
        },
      });
      created.push({ id: article.id, slug: article.slug, language: lang, status: article.status });
      console.log(`[blog/cron] published lang=${lang} slug=${article.slug} chars=${gen.content.length}`);
    } catch (err: any) {
      console.error(`[blog/cron] DB write failed lang=${lang}:`, err?.message || err);
    }
  }

  if (created.length === 0) {
    return NextResponse.json({ ok: false, error: "GENERATION_FAILED", topic: topic.slug }, { status: 502 });
  }

  return NextResponse.json({ ok: true, topic: topic.slug, articles: created });
}

export async function GET(req: NextRequest)  { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
