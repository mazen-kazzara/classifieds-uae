"use client";
import { useEffect, useState } from "react";
import { useAdminLocale } from "../useAdminLocale";

const cardStyle: React.CSSProperties = { backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem" };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)",
  border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)",
  color: "var(--text)", fontSize: "0.8125rem", outline: "none", boxSizing: "border-box",
  letterSpacing: "0.2em", textAlign: "center", fontFamily: "monospace",
};

export default function TwoFactorPage() {
  const { t } = useAdminLocale();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [step, setStep] = useState<"idle" | "setup" | "enabled" | "disabling">("idle");
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadStatus(); }, []);

  async function loadStatus() {
    const res = await fetch("/api/admin/2fa/status");
    const d = await res.json();
    if (d.ok) {
      setEnabled(d.enabled);
      setStep(d.enabled ? "enabled" : "idle");
    }
  }

  async function handleSetup() {
    setLoading(true); setMsg("");
    try {
      const res = await fetch("/api/admin/2fa/setup", { method: "POST" });
      const d = await res.json();
      if (!d.ok) { setMsgType("error"); setMsg(d.message || d.error); return; }
      setSecret(d.secret);
      setOtpauthUrl(d.otpauthUrl);
      setStep("setup");
    } finally { setLoading(false); }
  }

  async function handleEnable() {
    setLoading(true); setMsg("");
    try {
      const res = await fetch("/api/admin/2fa/enable", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await res.json();
      if (!d.ok) { setMsgType("error"); setMsg(d.error === "INVALID_CODE" ? t("Invalid code. Try again.", "رمز غير صالح. حاول مرة أخرى.") : d.error); return; }
      setMsgType("success"); setMsg(t("2FA enabled successfully", "تم تفعيل المصادقة الثنائية"));
      setCode(""); setSecret(""); setOtpauthUrl("");
      setEnabled(true); setStep("enabled");
    } finally { setLoading(false); }
  }

  async function handleDisable() {
    setLoading(true); setMsg("");
    try {
      const res = await fetch("/api/admin/2fa/disable", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await res.json();
      if (!d.ok) { setMsgType("error"); setMsg(d.error === "INVALID_CODE" ? t("Invalid code", "رمز غير صالح") : d.error); return; }
      setMsgType("success"); setMsg(t("2FA disabled", "تم إلغاء المصادقة الثنائية"));
      setCode(""); setEnabled(false); setStep("idle");
    } finally { setLoading(false); }
  }

  // Build Google Charts QR URL (no external lib needed)
  const qrUrl = otpauthUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpauthUrl)}`
    : "";

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.5rem", marginBottom: "1rem" }}>{t("Two-Factor Authentication", "المصادقة الثنائية")}</h1>
      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        {t("Protect your admin account with time-based one-time passcodes (TOTP). Required for sensitive operations like deleting ads or managing users.",
          "احم حسابك الإداري بكلمات مرور لمرة واحدة تعتمد على الوقت. مطلوب للعمليات الحساسة مثل حذف الإعلانات أو إدارة المستخدمين.")}
      </p>

      {msg && (
        <div style={{
          backgroundColor: msgType === "error" ? "color-mix(in srgb, var(--danger) 10%, var(--surface))" : "color-mix(in srgb, var(--primary) 10%, var(--surface))",
          border: `1.5px solid ${msgType === "error" ? "var(--danger)" : "var(--primary)"}`,
          borderRadius: "var(--radius-md)", padding: "0.625rem 1rem", marginBottom: "1rem",
          color: msgType === "error" ? "var(--danger)" : "var(--primary)", fontSize: "0.8125rem",
        }}>{msg}</div>
      )}

      {enabled === null && <p style={{ color: "var(--text-muted)" }}>{t("Loading...", "جارٍ التحميل...")}</p>}

      {/* Disabled state — offer setup */}
      {enabled === false && step === "idle" && (
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: 999, backgroundColor: "color-mix(in srgb, var(--danger) 15%, var(--surface))", color: "var(--danger)" }}>
              {t("DISABLED", "معطّل")}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              {t("2FA is not active on this account.", "المصادقة الثنائية غير مفعّلة.")}
            </span>
          </div>
          <button onClick={handleSetup} disabled={loading}
            style={{ height: 42, padding: "0 1.25rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--primary)", color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? t("Setting up...", "جارٍ الإعداد...") : t("Enable 2FA", "تفعيل المصادقة الثنائية")}
          </button>
        </div>
      )}

      {/* Setup flow — show QR + secret */}
      {step === "setup" && (
        <div style={cardStyle}>
          <h2 style={{ color: "var(--text)", fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>{t("Step 1: Scan QR code", "الخطوة 1: امسح رمز QR")}</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: "1rem" }}>
            {t("Use an authenticator app like Google Authenticator, Authy, or 1Password to scan this QR code.",
              "استخدم تطبيق مصادقة مثل Google Authenticator أو Authy لمسح الرمز.")}
          </p>
          {qrUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt="2FA QR Code" style={{ display: "block", margin: "0 auto 1rem", borderRadius: 8, border: "1px solid var(--border)" }} />
          )}
          <details style={{ marginBottom: "1rem" }}>
            <summary style={{ cursor: "pointer", fontSize: "0.8125rem", color: "var(--text-muted)" }}>{t("Or enter this secret manually", "أو أدخل هذا السر يدوياً")}</summary>
            <code style={{ display: "block", marginTop: "0.5rem", padding: "0.5rem", backgroundColor: "var(--surface-2)", borderRadius: "var(--radius-md)", fontSize: "0.75rem", wordBreak: "break-all", fontFamily: "monospace" }}>
              {secret}
            </code>
          </details>

          <h2 style={{ color: "var(--text)", fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>{t("Step 2: Enter code from app", "الخطوة 2: أدخل الرمز من التطبيق")}</h2>
          <input
            type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000" style={{ ...inputStyle, fontSize: "1.25rem" }}
          />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button onClick={handleEnable} disabled={loading || code.length !== 6}
              style={{ flex: 1, height: 42, borderRadius: "var(--radius-md)", backgroundColor: "var(--primary)", color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", opacity: loading || code.length !== 6 ? 0.5 : 1 }}>
              {loading ? t("Verifying...", "جارٍ التحقق...") : t("Verify & Enable", "تحقق وفعّل")}
            </button>
            <button onClick={() => { setStep("idle"); setCode(""); setSecret(""); setOtpauthUrl(""); }}
              style={{ height: 42, padding: "0 1rem", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-muted)", fontSize: "0.875rem", cursor: "pointer" }}>
              {t("Cancel", "إلغاء")}
            </button>
          </div>
        </div>
      )}

      {/* Enabled state */}
      {enabled === true && step === "enabled" && (
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: 999, backgroundColor: "color-mix(in srgb, #22C55E 15%, var(--surface))", color: "#22C55E" }}>
              {t("ENABLED", "مفعّل")}
            </span>
            <span style={{ color: "var(--text)", fontSize: "0.875rem", fontWeight: 600 }}>
              {t("2FA is active on your account.", "المصادقة الثنائية مفعّلة على حسابك.")}
            </span>
          </div>
          <button onClick={() => setStep("disabling")}
            style={{ height: 42, padding: "0 1.25rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--surface)", color: "var(--danger)", border: "1.5px solid var(--danger)", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}>
            {t("Disable 2FA", "إلغاء المصادقة الثنائية")}
          </button>
        </div>
      )}

      {/* Disabling — confirm with code */}
      {step === "disabling" && (
        <div style={cardStyle}>
          <h2 style={{ color: "var(--text)", fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>{t("Confirm disable", "تأكيد الإلغاء")}</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: "1rem" }}>
            {t("Enter your current 2FA code to disable two-factor authentication.",
              "أدخل رمز المصادقة الحالي لإلغاء تفعيل المصادقة الثنائية.")}
          </p>
          <input
            type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000" style={{ ...inputStyle, fontSize: "1.25rem" }}
          />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button onClick={handleDisable} disabled={loading || code.length !== 6}
              style={{ flex: 1, height: 42, borderRadius: "var(--radius-md)", backgroundColor: "var(--danger)", color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", opacity: loading || code.length !== 6 ? 0.5 : 1 }}>
              {loading ? t("Disabling...", "جارٍ الإلغاء...") : t("Confirm Disable", "تأكيد الإلغاء")}
            </button>
            <button onClick={() => { setStep("enabled"); setCode(""); }}
              style={{ height: 42, padding: "0 1rem", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-muted)", fontSize: "0.875rem", cursor: "pointer" }}>
              {t("Cancel", "إلغاء")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
