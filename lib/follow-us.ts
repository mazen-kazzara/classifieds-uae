/**
 * "Follow us" message builder.
 *
 * After an ad is published, we append a short bilingual snippet inviting the
 * user to follow Classifieds UAE on the *same* social platforms their ad was
 * posted to. URLs come from env where configured (FB_PAGE_URL, IG_PAGE_URL),
 * with sensible production fallbacks.
 *
 * Used by:
 *   - services/whatsapp/bot.ts        (WhatsApp free-publish flow)
 *   - app/api/payments/webhook/route.ts (post-payment DMs)
 *   - app/[locale]/success/page.tsx   (website success screen)
 *
 * The Telegram bot (telegram-bot/index.js, CJS) inlines an equivalent helper
 * — keep both lists in sync.
 */

export type FollowPlatform = "website" | "telegram" | "facebook" | "instagram" | "x";

export interface FollowLink {
  platform: FollowPlatform;
  icon: string;
  label: string;
  url: string;
}

const APP_URL_DEFAULT = "https://classifiedsuae.ae";
const FB_DEFAULT = "https://www.facebook.com/classifiedsuaeofficial";
const IG_DEFAULT = "https://www.instagram.com/classifiedsuae";
const TG_DEFAULT = "https://t.me/classifiedsuaeofficial";
const X_DEFAULT  = "https://x.com/clasifiedsuae";

/** Resolve our brand URL for a given platform. */
function brandUrl(platform: FollowPlatform): string {
  switch (platform) {
    case "website":   return process.env.APP_URL || APP_URL_DEFAULT;
    case "facebook":  return process.env.FB_PAGE_URL || FB_DEFAULT;
    case "instagram": return process.env.IG_PAGE_URL || IG_DEFAULT;
    case "telegram":  return TG_DEFAULT;
    case "x":         return X_DEFAULT;
  }
}

/** Build structured follow links for a list of platforms. Order matches input. */
export function buildFollowLinks(platforms: FollowPlatform[], locale: "ar" | "en"): FollowLink[] {
  const seen = new Set<FollowPlatform>();
  const labels: Record<FollowPlatform, { ar: string; en: string; icon: string }> = {
    website:   { ar: "الموقع",        en: "Website",   icon: "🌍" },
    telegram:  { ar: "تيليغرام",       en: "Telegram",  icon: "📱" },
    facebook:  { ar: "فيسبوك",        en: "Facebook",  icon: "📘" },
    instagram: { ar: "إنستغرام",       en: "Instagram", icon: "📷" },
    x:         { ar: "X",              en: "X",         icon: "✖️" },
  };
  const out: FollowLink[] = [];
  for (const p of platforms) {
    if (seen.has(p) || !labels[p]) continue;
    seen.add(p);
    const meta = labels[p];
    out.push({
      platform: p,
      icon: meta.icon,
      label: locale === "ar" ? meta.ar : meta.en,
      url: brandUrl(p),
    });
  }
  return out;
}

/**
 * Build a plain-text "Follow us" snippet ready to append to a bot reply.
 * Returns "" if no platforms.
 */
export function buildFollowUsText(platforms: FollowPlatform[], locale: "ar" | "en"): string {
  const links = buildFollowLinks(platforms, locale);
  if (links.length === 0) return "";
  const heading = locale === "ar"
    ? "💙 تابعونا على نفس المنصات التي نُشر إعلانكم عليها:"
    : "💙 Follow us on the same platforms your ad was posted to:";
  const lines = links.map(l => `${l.icon} ${l.label}: ${l.url}`);
  return [heading, ...lines].join("\n");
}
