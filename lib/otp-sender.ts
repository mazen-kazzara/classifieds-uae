/**
 * OTP Sender — multi-channel with graceful fallback.
 *
 * Primary channel:  WhatsApp Cloud API (via approved AUTHENTICATION template).
 * Fallback channel: MSG91 SMS.
 *
 * Modes:
 *   OTP_MOCK=true                       → log + return code (dev only)
 *   WHATSAPP_OTP_TEMPLATE_NAME present  → try WhatsApp first
 *   WHATSAPP_OTP_FALLBACK_TO_SMS=true   → on WhatsApp failure, retry via MSG91
 *   (no WhatsApp template)              → SMS only
 *
 * Required Meta side: a pre-approved AUTHENTICATION-category template with one
 * body parameter (the code) and optionally a copy-code button.
 */

import { sendWhatsAppOtp } from "@/services/whatsapp";

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || "";
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || "";
const OTP_MOCK = process.env.OTP_MOCK === "true";
const WHATSAPP_OTP_ENABLED = !!process.env.WHATSAPP_OTP_TEMPLATE_NAME;
const FALLBACK_TO_SMS = process.env.WHATSAPP_OTP_FALLBACK_TO_SMS !== "false";

export interface SendOtpResult {
  ok: boolean;
  /** Only populated in mock mode — never expose in prod */
  mockCode?: string;
  /** Which channel actually delivered (debug/observability) */
  channel?: "whatsapp" | "sms" | "mock";
  error?: string;
}

async function sendViaSms(phone: string, code: string): Promise<SendOtpResult> {
  if (!MSG91_AUTH_KEY || !MSG91_TEMPLATE_ID) {
    return { ok: false, error: "SMS_NOT_CONFIGURED" };
  }
  try {
    const res = await fetch("https://control.msg91.com/api/v5/otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: MSG91_AUTH_KEY,
      },
      body: JSON.stringify({
        template_id: MSG91_TEMPLATE_ID,
        mobile: phone,
        otp: code,
        otp_length: 6,
        otp_expiry: 10,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (data?.type === "success" || res.ok) return { ok: true, channel: "sms" };
    console.error("[OTP/MSG91] Error:", data);
    return { ok: false, channel: "sms", error: data?.message || "MSG91_ERROR" };
  } catch (err) {
    console.error("[OTP/MSG91] Network error:", err);
    return { ok: false, channel: "sms", error: "NETWORK_ERROR" };
  }
}

export async function sendOtp(phone: string, code: string): Promise<SendOtpResult> {
  // ── MOCK MODE ──────────────────────────────────────────────────────────────
  if (OTP_MOCK) {
    console.log(`[OTP MOCK] phone=${phone} code=${code}`);
    return { ok: true, mockCode: code, channel: "mock" };
  }

  // ── WHATSAPP (primary) ─────────────────────────────────────────────────────
  if (WHATSAPP_OTP_ENABLED) {
    const wa = await sendWhatsAppOtp(phone, code);
    if (wa.ok) {
      console.log(`[OTP] sent via WhatsApp phone=${phone}`);
      return { ok: true, channel: "whatsapp" };
    }
    console.error(`[OTP] WhatsApp send failed phone=${phone} reason=${wa.error}`);
    if (!FALLBACK_TO_SMS) {
      return { ok: false, channel: "whatsapp", error: wa.error };
    }
    // Fall through to SMS
  }

  // ── SMS (primary if no WhatsApp template, or fallback) ────────────────────
  const sms = await sendViaSms(phone, code);
  if (sms.ok) console.log(`[OTP] sent via SMS phone=${phone}`);
  return sms;
}
