/**
 * Facebook Page + Instagram publisher
 * Env vars required:
 *   FB_PAGE_ACCESS_TOKEN  — Page Access Token (needs pages_manage_posts, pages_read_engagement)
 *   FB_PAGE_ID            — numeric page ID
 *   IG_USER_ID            — Instagram Business user ID (linked to the page)
 */

const GRAPH = "https://graph.facebook.com/v25.0";

export interface SocialPostOptions {
  title: string;
  description: string;
  category: string;
  adUrl: string;
  imageUrl?: string | null;
  adPrice?: number | null;
  isNegotiable?: boolean;
  contactLines?: string[];
  publishFacebook?: boolean;
  publishInstagram?: boolean;
}

export interface SocialPublishResult {
  facebookUrl?: string | null;
  instagramUrl?: string | null;
}

function buildCaption(opts: SocialPostOptions): string {
  const lines: string[] = [];
  lines.push(`📢 ${opts.title}`);
  lines.push(`🗂 ${opts.category}`);

  if (opts.adPrice) {
    lines.push(`💰 ${Number(opts.adPrice).toLocaleString("en-AE")} AED${opts.isNegotiable ? " · Negotiable" : ""}`);
  } else if (opts.isNegotiable) {
    lines.push(`💰 Price: Negotiable`);
  }

  if (opts.description) {
    lines.push(`\n${opts.description.slice(0, 500)}`);
  }

  if (opts.contactLines && opts.contactLines.length > 0) {
    lines.push(`\n${opts.contactLines.join("\n")}`);
  }

  lines.push(`\n🔗 ${opts.adUrl}`);
  return lines.join("\n");
}

async function postToFacebook(opts: SocialPostOptions): Promise<string | null> {
  const token  = process.env.FB_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FB_PAGE_ID;
  if (!token || !pageId) {
    console.log("FB PUBLISH: skipped — FB_PAGE_ACCESS_TOKEN or FB_PAGE_ID not set");
    return null;
  }

  const caption = buildCaption(opts);

  const params = new URLSearchParams({
    message: caption,
    access_token: token,
  });
  if (opts.imageUrl) {
    params.set("link", opts.imageUrl);
  } else {
    params.set("link", opts.adUrl);
  }
  const res = await fetch(`${GRAPH}/${pageId}/feed`, {
    method: "POST",
    body: params,
  });
  const json = await res.json();
  if (json?.error || !res.ok) {
    console.error("FB feed post failed:", JSON.stringify(json));
    return null;
  }
  // json.id is like "pageId_postId"
  const postId = json?.id;
  console.log("FB feed post OK, id=", postId);
  if (postId) {
    return `https://www.facebook.com/${postId.replace("_", "/posts/")}`;
  }
  return process.env.FB_PAGE_URL || null;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function postToInstagram(opts: SocialPostOptions): Promise<string | null> {
  const token    = process.env.FB_PAGE_ACCESS_TOKEN;
  const igUserId = process.env.IG_USER_ID;
  if (!token || !igUserId) {
    console.log("IG PUBLISH: skipped — FB_PAGE_ACCESS_TOKEN or IG_USER_ID not set");
    return null;
  }
  if (!opts.imageUrl) {
    console.log("IG PUBLISH: skipped — no image (Instagram requires an image)");
    return null;
  }

  const caption = buildCaption(opts);

  // Step 1 — create media container
  const containerParams = new URLSearchParams({
    image_url: opts.imageUrl,
    caption,
    access_token: token,
  });
  const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
    method: "POST",
    body: containerParams,
  });
  const container = await containerRes.json();
  if (container?.error || !containerRes.ok) {
    console.error("IG container create failed:", JSON.stringify(container));
    return null;
  }

  const creationId = container?.id;
  if (!creationId) { console.error("IG container: no id returned"); return null; }

  // Step 2 — wait for container to be ready (poll up to 30s)
  for (let i = 0; i < 6; i++) {
    await sleep(5000);
    const statusRes = await fetch(
      `${GRAPH}/${creationId}?fields=status_code&access_token=${token}`
    );
    const status = await statusRes.json();
    console.log("IG container status:", JSON.stringify(status));
    if (status?.status_code === "FINISHED") break;
    if (status?.status_code === "ERROR") {
      console.error("IG container processing failed:", JSON.stringify(status));
      return null;
    }
  }

  // Step 3 — publish
  const publishParams = new URLSearchParams({
    creation_id: creationId,
    access_token: token,
  });
  const publishRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
    method: "POST",
    body: publishParams,
  });
  const published = await publishRes.json();
  if (published?.error || !publishRes.ok) {
    console.error("IG publish failed:", JSON.stringify(published));
    return null;
  }
  console.log("IG publish OK, id=", published?.id);

  // Get the permalink
  if (published?.id) {
    try {
      const permalinkRes = await fetch(
        `${GRAPH}/${published.id}?fields=permalink&access_token=${token}`
      );
      const permalinkData = await permalinkRes.json();
      if (permalinkData?.permalink) return permalinkData.permalink;
    } catch (e) { console.error("IG permalink fetch error:", e); }
  }
  return process.env.IG_PAGE_URL || null;
}

/** Posts to Facebook and/or Instagram based on flags. Returns URLs. Never throws. */
export async function publishToSocial(opts: SocialPostOptions): Promise<SocialPublishResult> {
  const result: SocialPublishResult = {};

  const tasks: Promise<void>[] = [];
  if (opts.publishFacebook) {
    tasks.push(
      postToFacebook(opts)
        .then(url => { result.facebookUrl = url; })
        .catch(e => { console.error("FB PUBLISH ERROR:", e); })
    );
  }
  if (opts.publishInstagram) {
    tasks.push(
      postToInstagram(opts)
        .then(url => { result.instagramUrl = url; })
        .catch(e => { console.error("IG PUBLISH ERROR:", e); })
    );
  }
  if (tasks.length === 0) {
    console.log("SOCIAL PUBLISH: skipped — neither Facebook nor Instagram selected");
  }
  await Promise.allSettled(tasks);
  return result;
}
