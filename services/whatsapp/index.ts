/**
 * WhatsApp Bot Service — PREPARED, NOT ACTIVATED
 * Set WHATSAPP_API_TOKEN + WHATSAPP_PHONE_NUMBER_ID in .env to activate.
 */
export function isWhatsAppEnabled(): boolean {
  return !!(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  if (!isWhatsAppEnabled()) return;
  const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}` },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) { console.error("[WhatsApp] Error:", err); }
}

export function verifyWhatsAppWebhook(mode: string, token: string, challenge: string): string | null {
  return mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN ? challenge : null;
}
