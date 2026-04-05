export type N8nEvent = "ad.published" | "ad.expired" | "ad.paid" | "ad.rejected" | "payment.success" | "payment.failed";

export async function sendToN8n(event: N8nEvent, data: Record<string, unknown>): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(process.env.N8N_WEBHOOK_SECRET ? { "x-webhook-secret": process.env.N8N_WEBHOOK_SECRET } : {}) },
      body: JSON.stringify({ event, timestamp: new Date().toISOString(), data }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) { console.error("[n8n] Webhook error:", err); }
}
