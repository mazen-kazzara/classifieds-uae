// OTP Sender — swap sendWhatsApp() body when WhatsApp API is ready
export async function sendOtp(phone: string, code: string): Promise<void> {
  const msg = `Your ClassifiedsUAE verification code is: ${code}. Valid for 10 minutes.`;

  // ── WhatsApp (enable when WHATSAPP_PHONE_NUMBER_ID is set) ──
  if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_API_TOKEN) {
    await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: msg },
        }),
      }
    );
    return;
  }

  // ── Fallback: log to console (development / no WhatsApp yet) ──
  console.log(`[OTP] Phone: ${phone} | Code: ${code}`);
}
