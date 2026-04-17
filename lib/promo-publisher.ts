/**
 * Orchestrates daily promotional ads on Facebook, Instagram, X, and Telegram channel.
 *
 * Scheduling model:
 *  - Each platform has a target UAE hour (local time, UAE = UTC+4).
 *  - The cron route is hit every 15 min (host crontab). When the current UAE hour
 *    matches a platform's target AND we haven't posted to that platform in the last 20h,
 *    we publish.
 *  - Times are configurable via env for easy tuning (see constants below).
 *
 * Research-based UAE peak hours (Meta/X/Telegram engagement data):
 *  - Facebook: 19:00 (7 PM)
 *  - Instagram: 20:00 (8 PM)
 *  - X (Twitter): 13:00 (1 PM) — lunch scroll + fits GCC daytime audience
 *  - Telegram: 19:00 (7 PM)
 */

import { prisma } from "@/lib/prisma";
import { publishToSocial } from "@/lib/social-publisher";
import { pickPromoContent, getPromoImageUrl, formatBilingualPost, buildFooter, buildFooterShort, SOCIAL_LINKS, type PromoContent } from "@/lib/promo-content";

export type PromoPlatform = "facebook" | "instagram" | "x" | "telegram";

// Hours in UAE local time (UTC+4). Env override: PROMO_HOUR_<PLATFORM>
const DEFAULT_HOURS: Record<PromoPlatform, number> = {
  facebook: 19,
  instagram: 20,
  x: 13,
  telegram: 19,
};

function targetHour(platform: PromoPlatform): number {
  const envKey = `PROMO_HOUR_${platform.toUpperCase()}`;
  const v = process.env[envKey];
  if (v) {
    const n = parseInt(v, 10);
    if (Number.isFinite(n) && n >= 0 && n <= 23) return n;
  }
  return DEFAULT_HOURS[platform];
}

/** Returns the current hour in UAE local time (UTC+4). */
function uaeHour(now: Date = new Date()): number {
  // Convert to UAE: add 4h to UTC hours.
  const utcH = now.getUTCHours();
  return (utcH + 4) % 24;
}

/** Is this platform "due" right now? */
function isDue(platform: PromoPlatform, now: Date = new Date()): boolean {
  return uaeHour(now) === targetHour(platform);
}

/** Have we already published to this platform in the last 20 hours? */
async function alreadyPublishedToday(platform: PromoPlatform): Promise<boolean> {
  const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const recent = await prisma.promoLog.findFirst({
    where: { platform, status: "SUCCESS", publishedAt: { gte: twentyHoursAgo } },
  });
  return !!recent;
}

/** Publishes one promo to the given platform. Idempotent wrt the 20h window. */
export async function publishPromo(platform: PromoPlatform, opts: { force?: boolean } = {}): Promise<{ ok: boolean; skipped?: string; postId?: string | null; postUrl?: string | null; contentIndex?: number }> {
  if (!opts.force) {
    if (await alreadyPublishedToday(platform)) {
      return { ok: false, skipped: "ALREADY_PUBLISHED_TODAY" };
    }
  }

  const { index, content } = pickPromoContent(platform);
  const imageUrl = getPromoImageUrl();
  const APP_URL = process.env.APP_URL || "https://classifiedsuae.ae";

  // For FB/IG/X we reuse publishToSocial; Telegram channel needs direct Bot API.
  if (platform === "telegram") {
    return await publishTelegramPromo(content, imageUrl, index);
  }

  // Build bilingual post (Arabic first, English second, social footer).
  let title: string;
  let body: string;
  if (platform === "x") {
    // X: Arabic title as main, English title in body + compact footer (auto-threads if >280)
    title = content.title;
    body = [
      content.descriptionAr,
      content.ctaAr,
      "",
      `📢 ${content.titleEn}`,
      content.descriptionEn,
      content.ctaEn,
      "",
      buildFooterShort(),
    ].join("\n");
  } else {
    const formatted = formatBilingualPost(content);
    title = formatted.title;
    body = formatted.body;
  }

  // Promo posts control their own layout — no auto category line, no extra hashtags mid-post.
  const socialResult = await publishToSocial({
    title,
    description: body,
    category: "Classifieds UAE",
    adUrl: APP_URL,
    imageUrl,
    contactLines: [],
    hideCategory: true,
    skipHashtags: false, // keep the brand hashtags at the bottom
    descriptionLimit: platform === "instagram" ? 2000 : 5000,
    publishFacebook: platform === "facebook",
    publishInstagram: platform === "instagram",
    publishX: platform === "x",
  });

  let postId: string | null = null;
  let postUrl: string | null = null;
  if (platform === "facebook") { postId = socialResult.facebookPostId || null; postUrl = socialResult.facebookUrl || null; }
  else if (platform === "instagram") { postId = socialResult.instagramPostId || null; postUrl = socialResult.instagramUrl || null; }
  else if (platform === "x") { postId = socialResult.xPostId || null; postUrl = socialResult.xUrl || null; }

  const status = postId ? "SUCCESS" : "FAILED";
  await prisma.promoLog.create({
    data: { platform, contentIndex: index, postId, postUrl, status, errorMessage: status === "FAILED" ? "no postId returned" : null },
  });

  return { ok: status === "SUCCESS", postId, postUrl, contentIndex: index };
}

async function publishTelegramPromo(content: PromoContent, imageUrl: string, index: number) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!botToken || !channelId) {
    await prisma.promoLog.create({ data: { platform: "telegram", contentIndex: index, status: "FAILED", errorMessage: "telegram env vars missing" } });
    return { ok: false, skipped: "TELEGRAM_NOT_CONFIGURED" };
  }

  const { title, body } = formatBilingualPost(content);
  const caption = [
    `📢 ${title}`,
    "",
    body,
    "",
    "#classifiedsuae #UAE_Ads #Classifieds_Ads #UAE",
  ].join("\n");

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: "🌐 Website", url: SOCIAL_LINKS.website },
        { text: "🤖 Bot", url: SOCIAL_LINKS.bot },
      ],
      [
        { text: "📘 Facebook", url: SOCIAL_LINKS.facebook },
        { text: "📷 Instagram", url: SOCIAL_LINKS.instagram },
      ],
      [
        { text: "✖️ X", url: SOCIAL_LINKS.x },
        { text: "💬 WhatsApp", url: SOCIAL_LINKS.whatsapp },
      ],
    ],
  };

  try {
    // Caption limit is 1024 chars. If body is longer, send a short teaser with the photo,
    // then send the full body as a follow-up text message (up to 4096 chars).
    const teaser = [
      `📢 ${title}`,
      "",
      content.descriptionAr.slice(0, 300),
      "",
      "👇 التفاصيل الكاملة بالأسفل | Full details below 👇",
    ].join("\n").slice(0, 1024);

    const photoRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channelId,
        photo: imageUrl,
        caption: caption.length <= 1024 ? caption : teaser,
        reply_markup: caption.length <= 1024 ? replyMarkup : undefined,
      }),
    });
    const photoJson = await photoRes.json();
    if (!photoJson?.ok) {
      await prisma.promoLog.create({ data: { platform: "telegram", contentIndex: index, status: "FAILED", errorMessage: JSON.stringify(photoJson).slice(0, 500) } });
      return { ok: false, skipped: "TELEGRAM_API_ERROR" };
    }
    const messageId = photoJson.result?.message_id ? String(photoJson.result.message_id) : null;

    // If we had to split, send the full body as a follow-up with the buttons
    if (caption.length > 1024) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channelId,
          text: caption.slice(0, 4096),
          reply_markup: replyMarkup,
          disable_web_page_preview: true,
        }),
      }).catch(() => null);
    }

    await prisma.promoLog.create({
      data: { platform: "telegram", contentIndex: index, postId: messageId, postUrl: null, status: "SUCCESS" },
    });
    return { ok: true, postId: messageId, postUrl: null, contentIndex: index };
  } catch (e: any) {
    await prisma.promoLog.create({ data: { platform: "telegram", contentIndex: index, status: "FAILED", errorMessage: e?.message?.slice(0, 500) || "unknown" } });
    return { ok: false, skipped: "TELEGRAM_ERROR" };
  }
}

/** Publishes to every platform whose scheduled hour matches current UAE hour. */
export async function runScheduledPromos(opts: { force?: boolean } = {}): Promise<Record<string, any>> {
  const platforms: PromoPlatform[] = ["facebook", "instagram", "x", "telegram"];
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

/** Test helper: publish to one specific platform immediately, ignoring schedule. */
export async function publishPromoNow(platform: PromoPlatform) {
  return publishPromo(platform, { force: true });
}
