/**
 * Social publisher — Facebook, Instagram, X (Twitter)
 * Env vars required:
 *   FB_PAGE_ACCESS_TOKEN  — Page Access Token (needs pages_manage_posts, pages_read_engagement)
 *   FB_PAGE_ID            — numeric page ID
 *   IG_USER_ID            — Instagram Business user ID (linked to the page)
 *   TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET — X/Twitter OAuth 1.0a
 */

import crypto from "crypto";
import { buildHashtags, type SocialPlatform } from "@/lib/hashtags";

const GRAPH = "https://graph.facebook.com/v25.0";

export interface SocialPostOptions {
  title: string;
  description: string;
  category: string;
  adUrl: string;
  imageUrl?: string | null;
  allImageUrls?: string[];
  adPrice?: number | null;
  isNegotiable?: boolean;
  contactLines?: string[];
  publishFacebook?: boolean;
  publishInstagram?: boolean;
  publishX?: boolean;
  /** Hide the 🗂 category line (used for promo posts where "category" is the brand name). */
  hideCategory?: boolean;
  /** Skip auto-appended hashtags — caller manages its own. */
  skipHashtags?: boolean;
  /** Max description length (platform-specific). Default 5000 (generous). */
  descriptionLimit?: number;
}

/**
 * Returns a publicly-accessible fallback image URL for social posts that have no user image.
 * Tries the dynamic OG route first; falls back to a static /og-image.jpg that always works.
 */
async function getFallbackImageUrl(opts: SocialPostOptions): Promise<string | null> {
  const APP_URL = process.env.APP_URL || "https://classifiedsuae.ae";
  const params = new URLSearchParams({ title: opts.title, category: opts.category });
  if (opts.adPrice) params.set("price", String(opts.adPrice));

  // Try dynamic OG first (branded per-ad image)
  try {
    const res = await fetch(`${APP_URL}/api/og?${params.toString()}`);
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      const fs = await import("fs");
      const path = await import("path");
      const filename = `og-${Date.now()}.png`;
      const filepath = path.join(process.cwd(), "public", "uploads", filename);
      fs.writeFileSync(filepath, buffer);
      console.log("OG image generated:", filename);
      return `${APP_URL}/uploads/${filename}`;
    }
    console.warn("Dynamic OG failed (status " + res.status + "), using static fallback");
  } catch (e) {
    console.warn("Dynamic OG error, using static fallback:", e instanceof Error ? e.message : e);
  }

  // Static fallback — always works
  return `${APP_URL}/og-image.jpg`;
}

export interface SocialPublishResult {
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  xUrl?: string | null;
  facebookPostId?: string | null;
  instagramPostId?: string | null;
  xPostId?: string | null;
}

function buildCaption(opts: SocialPostOptions, platform: SocialPlatform = "facebook"): string {
  const lines: string[] = [];
  lines.push(`📢 ${opts.title}`);

  if (!opts.hideCategory) {
    lines.push(`🗂 ${opts.category}`);
  }

  if (opts.adPrice) {
    lines.push(`💰 ${Number(opts.adPrice).toLocaleString("en-AE")} AED${opts.isNegotiable ? " · Negotiable" : ""}`);
  } else if (opts.isNegotiable) {
    lines.push(`💰 Price: Negotiable`);
  }

  // Description — platform-appropriate cap. IG = 2200, FB = ~60k (use 5000 default), X handled separately.
  const descLimit = opts.descriptionLimit ?? (platform === "instagram" ? 2000 : 5000);
  if (opts.description) {
    lines.push(`\n${opts.description.slice(0, descLimit)}`);
  }

  if (opts.contactLines && opts.contactLines.length > 0) {
    lines.push(`\n${opts.contactLines.join("\n")}`);
  }

  lines.push(`\n🔗 ${opts.adUrl}`);

  // Hashtags — auto-append unless caller opts out.
  if (!opts.skipHashtags) {
    const tags = buildHashtags(opts.category, platform);
    if (tags) lines.push(`\n${tags}`);
  }

  return lines.join("\n");
}

// ── Facebook ─────────────────────────────────────────────────────────────────
/**
 * Builds the list of images to post. Deduplicates, preserves order.
 * If no user images, returns [fallbackImage] so every post carries a visual.
 */
async function resolveImages(opts: SocialPostOptions): Promise<string[]> {
  const candidates: string[] = [];
  if (opts.allImageUrls && opts.allImageUrls.length > 0) {
    candidates.push(...opts.allImageUrls.filter(Boolean));
  } else if (opts.imageUrl) {
    candidates.push(opts.imageUrl);
  }
  // Dedupe while preserving order
  const seen = new Set<string>();
  const unique = candidates.filter(u => { if (seen.has(u)) return false; seen.add(u); return true; });
  if (unique.length > 0) return unique;
  const fallback = await getFallbackImageUrl(opts);
  return fallback ? [fallback] : [];
}

async function postToFacebook(opts: SocialPostOptions): Promise<{ url: string | null; postId: string | null }> {
  const token  = process.env.FB_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FB_PAGE_ID;
  if (!token || !pageId) {
    console.log("FB PUBLISH: skipped — FB_PAGE_ACCESS_TOKEN or FB_PAGE_ID not set");
    return { url: null, postId: null };
  }

  const caption = buildCaption(opts, "facebook");
  const images = await resolveImages(opts);

  // Single image → simple /photos post
  if (images.length === 1) {
    return await postFacebookSinglePhoto(images[0], caption, token, pageId, opts);
  }

  // Multiple images → upload each as unpublished, then create a feed post with attached_media
  if (images.length > 1) {
    try {
      const mediaFbids: string[] = [];
      for (const img of images.slice(0, 10)) {
        const p = new URLSearchParams({ url: img, published: "false", access_token: token });
        const r = await fetch(`${GRAPH}/${pageId}/photos`, { method: "POST", body: p });
        const j = await r.json();
        if (j?.id) mediaFbids.push(j.id);
        else console.error("FB unpublished photo upload failed:", JSON.stringify(j));
      }
      if (mediaFbids.length === 0) {
        console.error("FB multi-photo: no images uploaded, falling back to single");
        return await postFacebookSinglePhoto(images[0], caption, token, pageId, opts);
      }
      // Build feed post with attached_media=[{media_fbid: ...}, ...]
      const feedParams = new URLSearchParams({ message: caption, access_token: token });
      mediaFbids.forEach((fbid, i) => {
        feedParams.set(`attached_media[${i}]`, JSON.stringify({ media_fbid: fbid }));
      });
      const feedRes = await fetch(`${GRAPH}/${pageId}/feed`, { method: "POST", body: feedParams });
      const feedJson = await feedRes.json();
      if (feedJson?.error || !feedRes.ok) {
        console.error("FB multi-photo feed post failed:", JSON.stringify(feedJson));
        return await postFacebookSinglePhoto(images[0], caption, token, pageId, opts);
      }
      const postId = feedJson?.id;
      console.log("FB multi-photo post OK, id=", postId, "imageCount=", mediaFbids.length);
      if (postId) {
        return { url: `https://www.facebook.com/${postId.replace("_", "/posts/")}`, postId };
      }
    } catch (e) {
      console.error("FB multi-photo error, falling back:", e);
      return await postFacebookSinglePhoto(images[0], caption, token, pageId, opts);
    }
  }

  return await postToFacebookFeed(opts, caption, token, pageId);
}

async function postFacebookSinglePhoto(imageUrl: string, caption: string, token: string, pageId: string, opts: SocialPostOptions): Promise<{ url: string | null; postId: string | null }> {
  const params = new URLSearchParams({ url: imageUrl, message: caption, access_token: token });
  const res = await fetch(`${GRAPH}/${pageId}/photos`, { method: "POST", body: params });
  const json = await res.json();
  if (json?.error || !res.ok) {
    console.error("FB photos post failed:", JSON.stringify(json));
    return await postToFacebookFeed(opts, caption, token, pageId);
  }
  const postId = json?.post_id || json?.id;
  console.log("FB photos post OK, id=", postId);
  if (postId) {
    return { url: `https://www.facebook.com/${postId.replace("_", "/posts/")}`, postId };
  }
  return { url: process.env.FB_PAGE_URL || null, postId: null };
}

async function postToFacebookFeed(opts: SocialPostOptions, caption: string, token: string, pageId: string): Promise<{ url: string | null; postId: string | null }> {
  const params = new URLSearchParams({
    message: caption,
    link: opts.adUrl,
    access_token: token,
  });
  const res = await fetch(`${GRAPH}/${pageId}/feed`, {
    method: "POST",
    body: params,
  });
  const json = await res.json();
  if (json?.error || !res.ok) {
    console.error("FB feed post failed:", JSON.stringify(json));
    return { url: null, postId: null };
  }
  const postId = json?.id;
  console.log("FB feed post OK, id=", postId);
  if (postId) {
    return { url: `https://www.facebook.com/${postId.replace("_", "/posts/")}`, postId };
  }
  return { url: process.env.FB_PAGE_URL || null, postId: null };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Instagram ────────────────────────────────────────────────────────────────
async function waitForIgContainer(creationId: string, token: string, label: string): Promise<boolean> {
  for (let i = 0; i < 6; i++) {
    await sleep(5000);
    const statusRes = await fetch(`${GRAPH}/${creationId}?fields=status_code&access_token=${token}`);
    const status = await statusRes.json();
    console.log(`IG ${label} status:`, JSON.stringify(status));
    if (status?.status_code === "FINISHED") return true;
    if (status?.status_code === "ERROR") {
      console.error(`IG ${label} processing failed:`, JSON.stringify(status));
      return false;
    }
  }
  return false;
}

async function postToInstagram(opts: SocialPostOptions): Promise<{ url: string | null; postId: string | null }> {
  const token    = process.env.FB_PAGE_ACCESS_TOKEN;
  const igUserId = process.env.IG_USER_ID;
  if (!token || !igUserId) {
    console.log("IG PUBLISH: skipped — FB_PAGE_ACCESS_TOKEN or IG_USER_ID not set");
    return { url: null, postId: null };
  }

  const images = await resolveImages(opts);
  if (images.length === 0) {
    console.log("IG PUBLISH: skipped — no image available");
    return { url: null, postId: null };
  }

  const caption = buildCaption(opts, "instagram");
  const mainCreationId = images.length === 1
    ? await igCreateSingleContainer(images[0], caption, token, igUserId)
    : await igCreateCarousel(images.slice(0, 10), caption, token, igUserId);

  if (!mainCreationId) return { url: null, postId: null };

  if (!(await waitForIgContainer(mainCreationId, token, images.length > 1 ? "carousel" : "single"))) {
    return { url: null, postId: null };
  }

  // Publish
  const publishParams = new URLSearchParams({ creation_id: mainCreationId, access_token: token });
  const publishRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, { method: "POST", body: publishParams });
  const published = await publishRes.json();
  if (published?.error || !publishRes.ok) {
    console.error("IG publish failed:", JSON.stringify(published));
    return { url: null, postId: null };
  }
  const igPostId = published?.id || null;
  console.log("IG publish OK, id=", igPostId, "imageCount=", images.length);

  if (igPostId) {
    try {
      const permalinkRes = await fetch(`${GRAPH}/${igPostId}?fields=permalink&access_token=${token}`);
      const permalinkData = await permalinkRes.json();
      if (permalinkData?.permalink) return { url: permalinkData.permalink, postId: igPostId };
    } catch (e) { console.error("IG permalink fetch error:", e); }
  }
  return { url: process.env.IG_PAGE_URL || null, postId: igPostId };
}

async function igCreateSingleContainer(imageUrl: string, caption: string, token: string, igUserId: string): Promise<string | null> {
  const params = new URLSearchParams({ image_url: imageUrl, caption, access_token: token });
  const res = await fetch(`${GRAPH}/${igUserId}/media`, { method: "POST", body: params });
  const json = await res.json();
  if (json?.error || !res.ok) {
    console.error("IG single container create failed:", JSON.stringify(json));
    return null;
  }
  return json?.id || null;
}

async function igCreateCarousel(imageUrls: string[], caption: string, token: string, igUserId: string): Promise<string | null> {
  // Step 1: create an unpublished container for each image with is_carousel_item=true
  const childIds: string[] = [];
  for (const url of imageUrls) {
    const p = new URLSearchParams({ image_url: url, is_carousel_item: "true", access_token: token });
    const r = await fetch(`${GRAPH}/${igUserId}/media`, { method: "POST", body: p });
    const j = await r.json();
    if (j?.id) {
      // Wait for each child container to be ready before using it in the carousel
      if (await waitForIgContainer(j.id, token, `carousel-child[${childIds.length + 1}]`)) {
        childIds.push(j.id);
      }
    } else {
      console.error("IG carousel child create failed:", JSON.stringify(j));
    }
  }
  if (childIds.length === 0) {
    console.error("IG carousel: no child containers created");
    return null;
  }
  // Fallback to single if only 1 child ended up ready
  if (childIds.length === 1) {
    return await igCreateSingleContainer(imageUrls[0], caption, token, igUserId);
  }
  console.log("IG carousel: creating parent with", childIds.length, "children:", childIds.join(","));
  // Step 2: create the carousel container.
  // IMPORTANT: use GET-style querystring URL (Graph API treats the `children` param differently
  // in body vs. URL). Comma-separated child IDs in the URL is the proven format.
  const qs = new URLSearchParams();
  qs.set("media_type", "CAROUSEL");
  qs.set("children", childIds.join(","));
  qs.set("caption", caption);
  qs.set("access_token", token);
  const res = await fetch(`${GRAPH}/${igUserId}/media?${qs.toString()}`, { method: "POST" });
  const json = await res.json();
  if (json?.error || !res.ok) {
    console.error("IG carousel container create failed:", JSON.stringify(json));
    return null;
  }
  console.log("IG carousel container created:", json?.id);
  return json?.id || null;
}

// ── X (Twitter) OAuth 1.0a ──────────────────────────────────────────────────
// signatureParams: ONLY include form-encoded params that are part of the request body
// For JSON body or multipart, pass empty {} — body is NOT included in signature
function buildOAuthHeader(method: string, url: string, signatureParams: Record<string, string> = {}): string {
  const apiKey = process.env.TWITTER_API_KEY || "";
  const apiSecret = process.env.TWITTER_API_SECRET || "";
  const token = process.env.TWITTER_ACCESS_TOKEN || "";
  const tokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET || "";

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(32).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: token,
    oauth_version: "1.0",
  };

  // Combine oauth params + any form body params for signature (NOT multipart or JSON body)
  const allParams = { ...oauthParams, ...signatureParams };
  const paramStr = Object.keys(allParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join("&");
  const baseStr = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`;
  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(tokenSecret)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseStr).digest("base64");

  oauthParams.oauth_signature = signature;
  return "OAuth " + Object.keys(oauthParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(", ");
}

// X counts any URL as 23 chars due to t.co shortening
const X_URL_LEN = 23;
const X_MAX = 280;

// Measure a tweet the way X does: every URL → 23 chars
function measureTweet(text: string): number {
  // Match http(s) URLs
  const urls = text.match(/https?:\/\/\S+/g) || [];
  let len = [...text].length; // Unicode-aware char count
  for (const u of urls) {
    len = len - [...u].length + X_URL_LEN;
  }
  return len;
}

async function postSingleTweet(text: string, mediaIds: string[] = [], replyToId?: string): Promise<{ id: string | null; raw: any }> {
  const tweetUrl = "https://api.twitter.com/2/tweets";
  const body: any = { text };
  if (mediaIds.length > 0) body.media = { media_ids: mediaIds };
  if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };

  const authHeader = buildOAuthHeader("POST", tweetUrl, {});
  const res = await fetch(tweetUrl, {
    method: "POST",
    headers: { "Authorization": authHeader, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json?.errors) {
    console.error("X tweet failed:", res.status, JSON.stringify(json));
    return { id: null, raw: json };
  }
  return { id: json?.data?.id ?? null, raw: json };
}

async function postToX(opts: SocialPostOptions): Promise<{ url: string | null; postId: string | null }> {
  const apiKey = process.env.TWITTER_API_KEY;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  if (!apiKey || !accessToken) {
    console.log("X PUBLISH: skipped — TWITTER_API_KEY or TWITTER_ACCESS_TOKEN not set");
    return { url: null, postId: null };
  }

  const priceStr = opts.adPrice ? `💰 ${Number(opts.adPrice).toLocaleString("en-AE")} AED${opts.isNegotiable ? " · Negotiable" : ""}` : opts.isNegotiable ? `💰 Negotiable` : "";
  const hashtags = buildHashtags(opts.category, "x");

  // Build the FULL ideal tweet (title + category + price + full description + link + hashtags)
  const fullParts = [
    `📢 ${opts.title}`,
    `🗂 ${opts.category}`,
    priceStr,
    opts.description || "",
    `🔗 ${opts.adUrl}`,
    hashtags,
  ].filter(Boolean);
  const fullTweet = fullParts.join("\n");

  // ── Upload media (up to 4 images — X's limit per tweet) ─────────────────
  const images = await resolveImages(opts);
  const toUpload = images.slice(0, 4);
  const mediaIds: string[] = [];
  for (const img of toUpload) {
    try {
      const mediaId = await uploadMediaToX(img);
      if (mediaId) mediaIds.push(mediaId);
    } catch (e) { console.error("X media upload error:", e); }
  }
  console.log("X media uploaded:", mediaIds.length, "/", toUpload.length);

  // ── Branch: fits in one tweet vs needs a thread ──────────────────────────
  if (measureTweet(fullTweet) <= X_MAX) {
    const result = await postSingleTweet(fullTweet, mediaIds);
    if (!result.id) return { url: null, postId: null };
    const handle = process.env.TWITTER_HANDLE || "clasifiedsuae";
    console.log("X tweet OK (single), id=", result.id);
    return { url: `https://x.com/${handle}/status/${result.id}`, postId: result.id };
  }

  // ── Thread mode: first tweet = teaser, reply = full text ─────────────────
  // Teaser: title + category + price + link + hashtags (skip description)
  const teaserParts = [
    `📢 ${opts.title}`,
    `🗂 ${opts.category}`,
    priceStr,
    `🧵 Full details below ↓`,
    `🔗 ${opts.adUrl}`,
    hashtags,
  ].filter(Boolean);
  let teaser = teaserParts.join("\n");
  // If even the teaser is too long, truncate the title
  if (measureTweet(teaser) > X_MAX) {
    const overshoot = measureTweet(teaser) - X_MAX + 4;
    const shorterTitle = [...opts.title].slice(0, Math.max(10, [...opts.title].length - overshoot)).join("").trim() + "...";
    teaser = [
      `📢 ${shorterTitle}`,
      `🗂 ${opts.category}`,
      priceStr,
      `🧵 Full details below ↓`,
      `🔗 ${opts.adUrl}`,
      hashtags,
    ].filter(Boolean).join("\n");
  }

  const first = await postSingleTweet(teaser, mediaIds);
  if (!first.id) return { url: null, postId: null };
  console.log("X tweet OK (thread head), id=", first.id);

  // Build reply chunks from the full tweet (split if reply itself > 280)
  // Reply content = description + hashtags (no URL to keep budget cleaner)
  const replyHashtags = hashtags;
  const chunks = splitForX(opts.description || "", replyHashtags);
  let prevId: string | null = first.id;
  for (const chunk of chunks) {
    const r = await postSingleTweet(chunk, [], prevId!);
    if (!r.id) {
      console.error("X thread reply failed at chunk, stopping");
      break;
    }
    prevId = r.id;
  }

  if (prevId === first.id) {
    console.log("X thread: no reply chunks (description empty?)");
  } else {
    console.log("X thread: replies posted, last id=", prevId);
  }
  const handle = process.env.TWITTER_HANDLE || "clasifiedsuae";
  return { url: `https://x.com/${handle}/status/${first.id}`, postId: first.id };
}

/**
 * Splits a long text into 280-char-safe chunks, always ending the last chunk with the hashtag block.
 * Breaks on word boundaries where possible.
 */
function splitForX(text: string, hashtags: string): string[] {
  const out: string[] = [];
  const tagLen = hashtags ? measureTweet("\n\n" + hashtags) : 0;

  // Reserve space for hashtags only on the LAST chunk; intermediate chunks use the full 280.
  const mainBudget = X_MAX - 8;   // leave room for "(n/N) " prefix
  const lastBudget = X_MAX - tagLen - 8;

  let remaining = (text || "").trim();
  if (!remaining) {
    return hashtags ? [hashtags] : [];
  }

  // First pass: split into pieces ignoring numbering; cap sizes.
  const pieces: string[] = [];
  while (remaining.length > 0) {
    const isLastCandidate = measureTweet(remaining) <= lastBudget;
    const budget = isLastCandidate ? lastBudget : mainBudget;
    if (measureTweet(remaining) <= budget) {
      pieces.push(remaining);
      break;
    }
    // Find last whitespace within budget
    let cut = budget;
    // Convert char budget back to approximate JS index (URL-adjusted)
    // Simpler approach: iterate string and respect measureTweet
    let slice = "";
    for (const ch of remaining) {
      const next = slice + ch;
      if (measureTweet(next) > budget) break;
      slice = next;
    }
    // Rewind to last whitespace
    const lastSpace = slice.lastIndexOf(" ");
    const lastNewline = slice.lastIndexOf("\n");
    const breakAt = Math.max(lastSpace, lastNewline);
    if (breakAt > budget * 0.6) slice = slice.slice(0, breakAt);
    pieces.push(slice.trim());
    remaining = remaining.slice(slice.length).trim();
  }

  // Add (n/N) numbering + attach hashtags to final chunk
  const total = pieces.length;
  for (let i = 0; i < pieces.length; i++) {
    const numbering = total > 1 ? `(${i + 1}/${total}) ` : "";
    let chunk = numbering + pieces[i];
    if (i === pieces.length - 1 && hashtags) {
      chunk += "\n\n" + hashtags;
    }
    out.push(chunk);
  }

  return out;
}

async function uploadMediaToX(imageUrl: string): Promise<string | null> {
  // Download image
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) { console.error("X media download failed:", imgRes.status); return null; }
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const base64 = buffer.toString("base64");

  // Upload via v1.1 media upload — multipart/form-data
  // IMPORTANT: media_data in multipart is NOT included in OAuth signature
  const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";
  const authHeader = buildOAuthHeader("POST", uploadUrl, {}); // empty — multipart body excluded from sig

  // Build multipart form
  const boundary = `----TwitterUpload${crypto.randomBytes(8).toString("hex")}`;
  const bodyParts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="media_data"\r\n\r\n${base64}\r\n`,
    `--${boundary}--\r\n`,
  ];
  const bodyStr = bodyParts.join("");

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: bodyStr,
  });

  const json = await res.json();
  if (!res.ok || !json?.media_id_string) {
    console.error("X media upload failed:", res.status, JSON.stringify(json));
    return null;
  }
  console.log("X media upload OK, media_id=", json.media_id_string);
  return json.media_id_string;
}

// ── Delete helpers ───────────────────────────────────────────────────────────
export async function deleteFromFacebook(postId: string): Promise<boolean> {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token || !postId) return false;
  try {
    const res = await fetch(`${GRAPH}/${postId}?access_token=${token}`, { method: "DELETE" });
    const json = await res.json();
    if (json?.success || json?.ok) { console.log("FB DELETE OK, postId=", postId); return true; }
    console.error("FB DELETE failed:", JSON.stringify(json));
    return false;
  } catch (e) { console.error("FB DELETE ERROR:", e); return false; }
}

export async function deleteFromInstagram(postId: string): Promise<boolean> {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token || !postId) return false;
  try {
    const res = await fetch(`${GRAPH}/${postId}?access_token=${token}`, { method: "DELETE" });
    const json = await res.json();
    if (json?.success || json?.ok) { console.log("IG DELETE OK, postId=", postId); return true; }
    console.error("IG DELETE failed:", JSON.stringify(json));
    return false;
  } catch (e) { console.error("IG DELETE ERROR:", e); return false; }
}

export async function deleteFromX(postId: string): Promise<boolean> {
  const apiKey = process.env.TWITTER_API_KEY;
  if (!apiKey || !postId) return false;
  try {
    const url = `https://api.twitter.com/2/tweets/${postId}`;
    const authHeader = buildOAuthHeader("DELETE", url);
    const res = await fetch(url, { method: "DELETE", headers: { "Authorization": authHeader } });
    const json = await res.json();
    if (json?.data?.deleted) { console.log("X DELETE OK, postId=", postId); return true; }
    console.error("X DELETE failed:", JSON.stringify(json));
    return false;
  } catch (e) { console.error("X DELETE ERROR:", e); return false; }
}

// ── Main publisher ───────────────────────────────────────────────────────────
export async function publishToSocial(opts: SocialPostOptions): Promise<SocialPublishResult> {
  const result: SocialPublishResult = {};

  const tasks: Promise<void>[] = [];
  if (opts.publishFacebook) {
    tasks.push(
      postToFacebook(opts)
        .then(r => { result.facebookUrl = r.url; result.facebookPostId = r.postId; })
        .catch(e => { console.error("FB PUBLISH ERROR:", e); })
    );
  }
  if (opts.publishInstagram) {
    tasks.push(
      postToInstagram(opts)
        .then(r => { result.instagramUrl = r.url; result.instagramPostId = r.postId; })
        .catch(e => { console.error("IG PUBLISH ERROR:", e); })
    );
  }
  if (opts.publishX) {
    tasks.push(
      postToX(opts)
        .then(r => { result.xUrl = r.url; result.xPostId = r.postId; })
        .catch(e => { console.error("X PUBLISH ERROR:", e); })
    );
  }
  if (tasks.length === 0) {
    console.log("SOCIAL PUBLISH: skipped — no platforms selected");
  }
  await Promise.allSettled(tasks);
  return result;
}
