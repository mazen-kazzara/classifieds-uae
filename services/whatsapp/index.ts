/**
 * WhatsApp Cloud API Service
 * Handles sending messages, interactive buttons, lists, and media via Meta Graph API.
 */

const GRAPH_URL = "https://graph.facebook.com/v21.0";

function getConfig() {
  return {
    token: process.env.WHATSAPP_API_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  };
}

export function isWhatsAppEnabled(): boolean {
  const c = getConfig();
  return !!(c.token && c.phoneNumberId);
}

async function callAPI(payload: Record<string, unknown>): Promise<any> {
  const { token, phoneNumberId } = getConfig();
  if (!token || !phoneNumberId) return null;
  const url = `${GRAPH_URL}/${phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (!res.ok) console.error("[WA API] Error:", JSON.stringify(data));
    return data;
  } catch (err) {
    console.error("[WA API] Fetch error:", err);
    return null;
  }
}

/** Send a plain text message */
export async function sendText(to: string, body: string): Promise<void> {
  await callAPI({ to, type: "text", text: { body } });
}

/** Send interactive buttons (max 3 buttons) */
export async function sendButtons(to: string, body: string, buttons: { id: string; title: string }[]): Promise<void> {
  await callAPI({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map(b => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}

/** Send interactive list (for categories, subcategories, locations, etc.) */
export async function sendList(
  to: string,
  body: string,
  buttonText: string,
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
): Promise<void> {
  await callAPI({
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: body },
      action: {
        button: buttonText.slice(0, 20),
        sections: sections.map(s => ({
          title: s.title.slice(0, 24),
          rows: s.rows.map(r => ({
            id: r.id.slice(0, 200),
            title: r.title.slice(0, 24),
            ...(r.description ? { description: r.description.slice(0, 72) } : {}),
          })),
        })),
      },
    },
  });
}

/** Send image with optional caption */
export async function sendImage(to: string, imageUrl: string, caption?: string): Promise<void> {
  await callAPI({
    to,
    type: "image",
    image: { link: imageUrl, ...(caption ? { caption: caption.slice(0, 1024) } : {}) },
  });
}

/**
 * Send an OTP via a pre-approved WhatsApp AUTHENTICATION template.
 * Required env: WHATSAPP_OTP_TEMPLATE_NAME (the template's name) and
 * optional WHATSAPP_OTP_TEMPLATE_LANG (default "en").
 *
 * The template must declare exactly one body parameter (the OTP code) and
 * one URL/COPY_CODE button parameter that receives the same code, per Meta's
 * AUTHENTICATION template spec. We send the code in both slots so the same
 * template works whether or not the button is configured.
 */
export async function sendWhatsAppOtp(
  to: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME || "";
  const lang = process.env.WHATSAPP_OTP_TEMPLATE_LANG || "en";
  if (!templateName) {
    return { ok: false, error: "TEMPLATE_NOT_CONFIGURED" };
  }
  const { token, phoneNumberId } = getConfig();
  if (!token || !phoneNumberId) {
    return { ok: false, error: "WHATSAPP_NOT_CONFIGURED" };
  }
  try {
    const url = `${GRAPH_URL}/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: lang },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: code }],
            },
            {
              // AUTHENTICATION-category templates require a button param with the OTP.
              // If the template has no button, Meta ignores this component cleanly.
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: code }],
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[WA OTP] Template send failed:", JSON.stringify(data));
      return { ok: false, error: data?.error?.message || `HTTP_${res.status}` };
    }
    return { ok: true };
  } catch (err: any) {
    console.error("[WA OTP] Network error:", err);
    return { ok: false, error: err?.message || "NETWORK_ERROR" };
  }
}

/** Download media from WhatsApp (user-uploaded images) */
export async function downloadMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const { token } = getConfig();
  if (!token) {
    console.error("[WA Media] Missing WHATSAPP_API_TOKEN");
    return null;
  }
  // curl-style User-Agent — Meta's lookaside CDN accepts this reliably; some custom UAs trigger 500.
  const UA = "curl/8.5.0";
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  try {
    // Step 1: Get media URL + mime type
    const metaRes = await fetch(`${GRAPH_URL}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": UA },
      signal: AbortSignal.timeout(10000),
    });
    const metaText = await metaRes.text();
    if (!metaRes.ok) {
      console.error(`[WA Media] Meta lookup failed (${metaRes.status}) for id=${mediaId}:`, metaText.slice(0, 500));
      return null;
    }
    let meta: any;
    try { meta = JSON.parse(metaText); } catch { meta = {}; }
    if (!meta.url) {
      console.error(`[WA Media] Meta response missing url for id=${mediaId}:`, metaText.slice(0, 500));
      return null;
    }
    // Step 2: Download from CDN. lookaside.fbsbx.com sometimes returns 5xx while the
    // file is still being scanned/processed — retry with backoff.
    const MAX_ATTEMPTS = 4;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const fileRes = await fetch(meta.url, {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": UA, Accept: "*/*" },
        signal: AbortSignal.timeout(20000),
      });
      if (fileRes.ok) {
        const buffer = Buffer.from(await fileRes.arrayBuffer());
        if (buffer.length === 0) {
          console.error(`[WA Media] Empty buffer for id=${mediaId}`);
          return null;
        }
        if (attempt > 1) console.log(`[WA Media] Downloaded id=${mediaId} on attempt ${attempt}`);
        return { buffer, mimeType: meta.mime_type || "image/jpeg" };
      }
      const errBody = await fileRes.text().catch(() => "");
      const headers: Record<string, string> = {};
      fileRes.headers.forEach((v, k) => { headers[k] = v; });
      console.error(`[WA Media] File download failed attempt ${attempt}/${MAX_ATTEMPTS} (${fileRes.status}) for id=${mediaId}: body=${errBody.slice(0, 300)} headers=${JSON.stringify(headers).slice(0, 400)}`);
      // Only retry on 5xx (transient). 4xx means we won't recover.
      if (fileRes.status < 500 || attempt === MAX_ATTEMPTS) return null;
      await sleep(500 * Math.pow(2, attempt - 1)); // 500ms, 1s, 2s
    }
    return null;
  } catch (err) {
    console.error(`[WA Media] Download exception for id=${mediaId}:`, err);
    return null;
  }
}

/** Mark message as read */
export async function markRead(to: string, messageId: string): Promise<void> {
  await callAPI({ to, status: "read", message_id: messageId } as any);
}

// Re-export for backward compat
export const sendWhatsAppMessage = sendText;
export function verifyWhatsAppWebhook(mode: string, token: string, challenge: string): string | null {
  return mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN ? challenge : null;
}
