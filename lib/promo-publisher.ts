/**
 * Daily promotional ads on Facebook, Instagram, and Telegram channel.
 * Arabic only. Website URL only. 30-50 words. SEO hashtags.
 *
 * Optimal UAE peak hours per platform (UTC+4):
 *   Facebook:  12:00 PM — lunch break, high engagement
 *   Instagram:  9:00 PM — evening peak, highest UAE engagement
 *   Telegram:   6:00 PM — commute/after-work peak
 */

import { prisma } from "@/lib/prisma";
import { publishToSocial } from "@/lib/social-publisher";
import { pickPromoContent, getPromoImageUrl, buildPromoPost, getHashtags, type PromoContent } from "@/lib/promo-content";

export type PromoPlatform = "facebook" | "instagram" | "telegram";

// UAE peak hours (UTC+4) — optimized for each platform's peak engagement in UAE
const DEFAULT_HOURS: Record<PromoPlatform, number> = { facebook: 12, instagram: 21, telegram: 18 };

function targetHour(platform: PromoPlatform): number {
  const v = process.env[`PROMO_HOUR_${platform.toUpperCase()}`];
  if (v) { const n = parseInt(v, 10); if (Number.isFinite(n) && n >= 0 && n <= 23) return n; }
  return DEFAULT_HOURS[platform];
}

function uaeHour(now: Date = new Date()): number { return (now.getUTCHours() + 4) % 24; }
function isDue(platform: PromoPlatform, now: Date = new Date()): boolean { return uaeHour(now) === targetHour(platform); }

async function alreadyPublishedToday(platform: PromoPlatform): Promise<boolean> {
  // Use UAE calendar day (UTC+4) instead of rolling window
  const nowUTC = new Date();
  const uaeNow = new Date(nowUTC.getTime() + 4 * 60 * 60 * 1000);
  const uaeTodayStart = new Date(Date.UTC(uaeNow.getUTCFullYear(), uaeNow.getUTCMonth(), uaeNow.getUTCDate()));
  const uaeTodayStartUTC = new Date(uaeTodayStart.getTime() - 4 * 60 * 60 * 1000);
  const recent = await prisma.promoLog.findFirst({
    where: { platform, status: "SUCCESS", publishedAt: { gte: uaeTodayStartUTC } },
  });
  return !!recent;
}

export async function publishPromo(platform: PromoPlatform, opts: { force?: boolean } = {}) {
  if (!opts.force && await alreadyPublishedToday(platform)) return { ok: false, skipped: "ALREADY_PUBLISHED_TODAY" };

  const { index, content } = pickPromoContent(platform);
  const imageUrl = getPromoImageUrl();
  const post = buildPromoPost(content);
  const APP_URL = process.env.APP_URL || "https://classifiedsuae.ae";

  if (platform === "telegram") return await publishTelegramPromo(content, imageUrl, index);

  const socialResult = await publishToSocial({
    title: "",
    description: post,
    category: "Classifieds UAE",
    adUrl: APP_URL,
    imageUrl,
    hideCategory: true,
    skipHashtags: true,
    descriptionLimit: platform === "instagram" ? 2000 : 5000,
    publishFacebook: platform === "facebook",
    publishInstagram: platform === "instagram",
  });

  let postId: string | null = null;
  let postUrl: string | null = null;
  if (platform === "facebook") { postId = socialResult.facebookPostId || null; postUrl = socialResult.facebookUrl || null; }
  else if (platform === "instagram") { postId = socialResult.instagramPostId || null; postUrl = socialResult.instagramUrl || null; }

  await prisma.promoLog.create({
    data: { platform, contentIndex: index, postId, postUrl, status: postId ? "SUCCESS" : "FAILED", errorMessage: postId ? null : "no postId" },
  });
  return { ok: !!postId, postId, postUrl, contentIndex: index };
}

async function publishTelegramPromo(content: PromoContent, imageUrl: string, index: number) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!botToken || !channelId) {
    await prisma.promoLog.create({ data: { platform: "telegram", contentIndex: index, status: "FAILED", errorMessage: "not configured" } });
    return { ok: false, skipped: "NOT_CONFIGURED" };
  }

  const APP_URL = process.env.APP_URL || "https://classifiedsuae.ae";
  const caption = buildPromoPost(content).slice(0, 1024);

  const replyMarkup = { inline_keyboard: [[{ text: "🌐 classifiedsuae.ae", url: APP_URL }]] };

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: channelId, photo: imageUrl, caption, reply_markup: replyMarkup }),
    });
    const json = await res.json();
    const messageId = json?.result?.message_id ? String(json.result.message_id) : null;
    await prisma.promoLog.create({
      data: { platform: "telegram", contentIndex: index, postId: messageId, status: json?.ok ? "SUCCESS" : "FAILED", errorMessage: json?.ok ? null : JSON.stringify(json).slice(0, 300) },
    });
    return { ok: !!json?.ok, postId: messageId, contentIndex: index };
  } catch (e: any) {
    await prisma.promoLog.create({ data: { platform: "telegram", contentIndex: index, status: "FAILED", errorMessage: e?.message?.slice(0, 300) } });
    return { ok: false, skipped: "ERROR" };
  }
}

export async function runScheduledPromos(opts: { force?: boolean } = {}): Promise<Record<string, any>> {
  const platforms: PromoPlatform[] = ["facebook", "instagram", "telegram"];
  const results: Record<string, any> = {};
  for (const p of platforms) {
    if (opts.force || isDue(p)) {
      results[p] = await publishPromo(p, { force: opts.force });
    } else {
      results[p] = { skipped: "NOT_DUE", currentUAEHour: uaeHour(), targetHour: targetHour(p) };
    }
  }
  return results;
}

export async function publishPromoNow(platform: PromoPlatform) {
  return publishPromo(platform, { force: true });
}
