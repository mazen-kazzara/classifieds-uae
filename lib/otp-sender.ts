/**
 * OTP Sender
 * Mock mode  → OTP_MOCK=true in .env  (returns code in response, no SMS sent)
 * Production → OTP_MOCK=false         (sends real SMS via MSG91)
 */

const MSG91_AUTH_KEY  = process.env.MSG91_AUTH_KEY  || "";
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || "";
const OTP_MOCK = process.env.OTP_MOCK === "true";

export interface SendOtpResult {
  ok: boolean;
  /** Only populated in mock mode — never expose in prod */
  mockCode?: string;
  error?: string;
}

export async function sendOtp(phone: string, code: string): Promise<SendOtpResult> {
  // ── MOCK MODE ──────────────────────────────────────────────────────────────
  if (OTP_MOCK) {
    console.log(`[OTP MOCK] phone=${phone} code=${code}`);
    return { ok: true, mockCode: code };
  }

  // ── MSG91 PRODUCTION ───────────────────────────────────────────────────────
  try {
    const res = await fetch("https://control.msg91.com/api/v5/otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "authkey": MSG91_AUTH_KEY,
      },
      body: JSON.stringify({
        template_id: MSG91_TEMPLATE_ID,
        mobile: phone,          // format: 9715XXXXXXXX
        otp: code,
        otp_length: 6,
        otp_expiry: 10,         // minutes
      }),
    });

    const data = await res.json();
    if (data.type === "success" || res.ok) return { ok: true };
    console.error("[MSG91] Error:", data);
    return { ok: false, error: data.message || "MSG91_ERROR" };
  } catch (err) {
    console.error("[MSG91] Network error:", err);
    return { ok: false, error: "NETWORK_ERROR" };
  }
}
