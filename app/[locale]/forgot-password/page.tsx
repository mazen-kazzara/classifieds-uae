"use client";
import { useState } from "react";
import { useTranslations, useLocale } from "@/lib/useTranslations";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("forgot");

  const [step, setStep] = useState<"phone" | "otp" | "password">("phone");
  const [phone, setPhone] = useState("971");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)",
    border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)",
    color: "var(--text)", fontSize: "1rem", outline: "none", boxSizing: "border-box",
  };

  function startCooldown() {
    setResendCooldown(60);
    const timer = setInterval(() => setResendCooldown(c => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; }), 1000);
  }

  async function handleSendOtp() {
    setLoading(true); setError("");
    const cleanPhone = phone.replace(/[\s+\-()]/g, "");

    // Check user exists first
    const loginRes = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone, password: "____CHECK_ONLY____" }),
    });
    const loginData = await loginRes.json();
    if (loginData.error === "NOT_REGISTERED") {
      setLoading(false); setError(t("notRegistered")); return;
    }

    // Send OTP
    const res = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone, forceReset: true }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok && data.error !== "RESEND_TOO_SOON") { setError(t("sendFailed")); return; }
    setStep("otp");
    startCooldown();
  }

  async function handleVerifyOtp() {
    setLoading(true); setError("");
    const cleanPhone = phone.replace(/[\s+\-()]/g, "");
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone, code: otp }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) {
      if (data.error === "INVALID_CODE") { setError(t("wrongCode")); return; }
      if (data.error === "OTP_EXPIRED") { setError(t("expired")); return; }
      if (data.error === "TOO_MANY_ATTEMPTS") { setError(t("tooMany")); return; }
      setError(t("failed")); return;
    }
    setStep("password");
  }

  async function handleResetPassword() {
    setLoading(true); setError("");
    const cleanPhone = phone.replace(/[\s+\-()]/g, "");

    if (password.length < 8) { setLoading(false); setError(t("passwordTooShort")); return; }
    if (password !== confirmPassword) { setLoading(false); setError(t("passwordMismatch")); return; }

    const hashed_password = password;
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone, code: otp, password: hashed_password, confirmPassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) {
      if (data.error === "PASSWORD_TOO_SHORT") { setError(t("passwordTooShort")); return; }
      if (data.error === "PASSWORD_MISMATCH") { setError(t("passwordMismatch")); return; }
      setError(t("failed")); return;
    }
    router.push(`/${locale}/login?reset=1`);
  }

  async function handleResend() {
    setLoading(true); setError("");
    const cleanPhone = phone.replace(/[\s+\-()]/g, "");
    await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone, forceReset: true }),
    });
    setLoading(false);
    startCooldown();
  }

  const titles: Record<string, string> = { phone: t("title"), otp: t("otpTitle"), password: t("newPasswordTitle") };
  const subtitles: Record<string, string> = { phone: t("subtitle"), otp: t("otpSubtitle", { phone }), password: t("newPasswordSubtitle") };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }} dir={locale === "ar" ? "rtl" : "ltr"}>
      <Header />
      <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)", padding: "1rem" }}>
        <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "2.5rem", width: "100%", maxWidth: "420px" }}>

          {/* Step indicator */}
          <div style={{ display: "flex", gap: "0.375rem", marginBottom: "1.5rem" }}>
            {(["phone", "otp", "password"] as const).map((s, i) => (
              <div key={s} style={{ flex: 1, height: 3, borderRadius: 999, backgroundColor: ["phone","otp","password"].indexOf(step) >= i ? "var(--primary)" : "var(--border)", transition: "background-color 0.3s" }} />
            ))}
          </div>

          <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.5rem", marginBottom: "0.375rem" }}>{titles[step]}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.75rem" }}>{subtitles[step]}</p>

          {error && (
            <div style={{ backgroundColor: "color-mix(in srgb, var(--danger) 10%, var(--surface))", border: "1.5px solid var(--danger)", borderRadius: "var(--radius-md)", padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--danger)", fontSize: "0.875rem" }}>
              {error}
            </div>
          )}

          {step === "phone" && (
            <>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{t("phoneLabel")}</label>
                <input style={inputStyle} type="tel" inputMode="numeric" value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^0-9+]/g, ""))} placeholder="971501234567"
                  onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.375rem" }}>{t("phoneHint")}</p>
              </div>
              <button onClick={handleSendOtp} disabled={loading || !phone}
                className="btn-primary w-full"
                style={{ width: "100%", height: 48, fontSize: "1rem", justifyContent: "center", marginBottom: "1rem" }}>
                {loading ? t("sending") : t("sendCode")}
              </button>
            </>
          )}

          {step === "otp" && (
            <>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{t("otpLabel")}</label>
                <input style={{ ...inputStyle, textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5rem", fontWeight: 700 }}
                  type="text" inputMode="numeric" maxLength={6} value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000" autoFocus
                  onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6}
                className="btn-primary w-full"
                style={{ width: "100%", height: 48, fontSize: "1rem", justifyContent: "center", marginBottom: "0.75rem" }}>
                {loading ? t("verifying") : t("verify")}
              </button>
              <button onClick={handleResend} disabled={resendCooldown > 0 || loading}
                style={{ width: "100%", height: 44, background: "none", border: "none", color: resendCooldown > 0 ? "var(--text-muted)" : "var(--primary)", fontSize: "0.875rem", cursor: resendCooldown > 0 ? "default" : "pointer", fontWeight: 500 }}>
                {resendCooldown > 0 ? t("resendIn", { seconds: String(resendCooldown) }) : (locale === "ar" ? "↺ إعادة إرسال الرمز" : "↺ Resend code")}
              </button>
            </>
          )}

          {step === "password" && (
            <>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{t("passwordLabel")}</label>
                <div style={{ position: "relative" }}>
                  <input style={{ ...inputStyle, paddingRight: "3rem" }}
                    type={showPassword ? "text" : "password"}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={t("passwordPlaceholder")}
                    onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                  <button onClick={() => setShowPassword(s => !s)}
                    style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem" }}>
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{t("confirmLabel")}</label>
                <input style={inputStyle} type="password" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={t("confirmPlaceholder")}
                  onKeyDown={e => e.key === "Enter" && handleResetPassword()}
                  onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <button onClick={handleResetPassword} disabled={loading || !password || !confirmPassword}
                className="btn-primary w-full"
                style={{ width: "100%", height: 48, fontSize: "1rem", justifyContent: "center", marginBottom: "1rem", opacity: (!password || !confirmPassword) ? 0.5 : 1 }}>
                {loading ? t("saving") : t("save")}
              </button>
            </>
          )}

          <Link href={`/${locale}/login`}
            style={{ display: "block", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem", textDecoration: "none", marginTop: "0.5rem" }}>
            {t("backToLogin")}
          </Link>
        </div>
      </main>
    </div>
  );
}
