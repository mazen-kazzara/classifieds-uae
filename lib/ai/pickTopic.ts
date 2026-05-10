/**
 * Pick the next blog topic to publish.
 * Excludes topics whose topicSlug appears in BlogArticle within the last
 * EXCLUSION_DAYS days. If every topic is "recent", picks the least-recently
 * used (oldest publishDate) so the rotation stays bounded.
 */
import { prisma } from "@/lib/prisma";
import { TOPICS, EXCLUSION_DAYS, type BlogTopic } from "./topics";

export async function pickNextTopic(): Promise<BlogTopic | null> {
  if (TOPICS.length === 0) return null;

  const cutoff = new Date(Date.now() - EXCLUSION_DAYS * 24 * 60 * 60 * 1000);

  const recent = await prisma.blogArticle.findMany({
    where: { publishDate: { gte: cutoff }, topicSlug: { not: null } },
    select: { topicSlug: true },
  });
  const recentSet = new Set(recent.map(r => r.topicSlug).filter(Boolean) as string[]);

  const fresh = TOPICS.filter(t => !recentSet.has(t.slug));
  if (fresh.length > 0) {
    // Pick the topic with the oldest last-use (or never used).
    const allUses = await prisma.blogArticle.findMany({
      where: { topicSlug: { in: fresh.map(t => t.slug) } },
      select: { topicSlug: true, publishDate: true },
      orderBy: { publishDate: "desc" },
    });
    const lastUseBySlug = new Map<string, Date>();
    for (const u of allUses) {
      if (u.topicSlug && !lastUseBySlug.has(u.topicSlug)) lastUseBySlug.set(u.topicSlug, u.publishDate);
    }
    fresh.sort((a, b) => {
      const aTs = lastUseBySlug.get(a.slug)?.getTime() ?? 0;
      const bTs = lastUseBySlug.get(b.slug)?.getTime() ?? 0;
      return aTs - bTs;
    });
    return fresh[0] ?? null;
  }

  // All topics are recent — fall back to the oldest one.
  const oldest = await prisma.blogArticle.findFirst({
    where: { topicSlug: { not: null } },
    orderBy: { publishDate: "asc" },
    select: { topicSlug: true },
  });
  if (!oldest?.topicSlug) return TOPICS[0];
  return TOPICS.find(t => t.slug === oldest.topicSlug) ?? TOPICS[0];
}
