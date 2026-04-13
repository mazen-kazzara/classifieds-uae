"use client";
import { useState } from "react";
import { useTranslations, useLocale } from "@/lib/useTranslations";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";

type AuthMethod = "choose" | "phone" | "email" | "phone-otp" | "email-otp";

export default function RegisterPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("register");

  const [method, setMethod] = useState<AuthMethod>("choose");
  const [phone, setPhone] = useState("971");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)",
    border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)",
    color: "var(--text)", fontSize: "1rem", outline: "none", boxSizing: "border-box",
  };

  const socialBtnStyle: React.CSSProperties = {
    width: "100%", height: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
    borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", backgroundColor: "var(--surface)",
    color: "var(--text)", fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
  };

  const methodBtnStyle = (active?: boolean): React.CSSProperties => ({
    flex: 1, height: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
    borderRadius: "var(--radius-md)", border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
    backgroundColor: active ? "color-mix(in srgb, var(--primary) 10%, var(--surface))" : "var(--surface)",
    color: active ? "var(--primary)" : "var(--text-muted)", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
  });

  function startCooldown() {
    setResendCooldown(60);
    const timer = setInterval(() => setResendCooldown(c => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; }), 1000);
  }

  function resetForm() {
    setError(""); setOtp(""); setPassword(""); setConfirmPassword(""); setShowPassword(false);
  }

  // ── Phone registration ──
  async function handlePhoneRegister() {
    setLoading(true); setError("");
    const cleanPhone = phone.replace(/[\s+\-()]/g, "");
    const res = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone, password, confirmPassword }),
    });
    const data = await res.json();
    if (!data.ok) {
      setLoading(false);
      if (data.error === "INVALID_PHONE") { setError(t("invalidPhone")); return; }
      if (data.error === "PASSWORD_TOO_SHORT") { setError(t("passwordTooShort")); return; }
      if (data.error === "PASSWORD_MISMATCH") { setError(t("passwordMismatch")); return; }
      if (data.error === "ALREADY_REGISTERED") { setError(t("alreadyRegisteredError")); return; }
      setError(t("failed")); return;
    }
    const otpRes = await fetch("/api/auth/otp/request", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone }),
    });
    setLoading(false);
    if (!(await otpRes.json()).ok) { setError(t("sendFailed")); return; }
    setMethod("phone-otp"); startCooldown();
  }

  async function handlePhoneVerify() {
    setLoading(true); setError("");
    const cleanPhone = phone.replace(/[\s+\-()]/g, "");
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone, code: otp }),
    });
    const data = await res.json();
    if (!data.ok) {
      setLoading(false);
      if (data.error === "INVALID_CODE") { setError(t("wrongCode")); return; }
      if (data.error === "OTP_EXPIRED") { setError(t("expired")); return; }
      if (data.error === "TOO_MANY_ATTEMPTS") { setError(t("tooMany")); return; }
      setError(t("failed")); return;
    }
    const result = await signIn("phone-password", { phone: cleanPhone, password, redirect: false });
    setLoading(false);
    if (result?.error) { setError(t("failed")); return; }
    router.push(`/${locale}/my-ads`);
  }

  async function handlePhoneResend() {
    setLoading(true); setError("");
    const cleanPhone = phone.replace(/[\s+\-()]/g, "");
    await fetch("/api/auth/otp/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: cleanPhone }) });
    setLoading(false); startCooldown();
  }

  // ── Email registration ──
  async function handleEmailRegister() {
    setLoading(true); setError("");
    const e = email.trim().toLowerCase();
    const res = await fetch("/api/auth/email/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: e, password, confirmPassword }),
    });
    const data = await res.json();
    if (!data.ok) {
      setLoading(false);
      if (data.error === "INVALID_EMAIL") { setError(locale === "ar" ? "بريد إلكتروني غير صالح" : "Invalid email address"); return; }
      if (data.error === "PASSWORD_TOO_SHORT") { setError(t("passwordTooShort")); return; }
      if (data.error === "PASSWORD_MISMATCH") { setError(t("passwordMismatch")); return; }
      if (data.error === "ALREADY_REGISTERED") { setError(t("alreadyRegisteredError")); return; }
      setError(t("failed")); return;
    }
    const otpRes = await fetch("/api/auth/otp/email/request", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: e }),
    });
    setLoading(false);
    if (!(await otpRes.json()).ok) { setError(locale === "ar" ? "فشل في إرسال رمز التحقق" : "Failed to send verification code"); return; }
    setMethod("email-otp"); startCooldown();
  }

  async function handleEmailVerify() {
    setLoading(true); setError("");
    const e = email.trim().toLowerCase();
    const res = await fetch("/api/auth/otp/email/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: e, code: otp }),
    });
    const data = await res.json();
    if (!data.ok) {
      setLoading(false);
      if (data.error === "INVALID_CODE") { setError(t("wrongCode")); return; }
      if (data.error === "OTP_EXPIRED") { setError(t("expired")); return; }
      if (data.error === "TOO_MANY_ATTEMPTS") { setError(t("tooMany")); return; }
      setError(t("failed")); return;
    }
    const result = await signIn("email-password", { email: e, password, redirect: false });
    setLoading(false);
    if (result?.error) { setError(t("failed")); return; }
    router.push(`/${locale}/my-ads`);
  }

  async function handleEmailResend() {
    setLoading(true); setError("");
    await fetch("/api/auth/otp/email/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim().toLowerCase() }) });
    setLoading(false); startCooldown();
  }

  // ── OAuth ──
  function handleGoogle() { signIn("google", { callbackUrl: `/${locale}/my-ads` }); }
  function handleFacebook() { signIn("facebook", { callbackUrl: `/${locale}/my-ads` }); }

  const isOtpStep = method === "phone-otp" || method === "email-otp";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }} dir={locale === "ar" ? "rtl" : "ltr"}>
      <Header />
      <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)", padding: "1rem" }}>
        <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "2.5rem", width: "100%", maxWidth: "420px" }}>

          <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.5rem", marginBottom: "0.375rem" }}>
            {isOtpStep ? t("otpTitle") : t("title")}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.75rem" }}>
            {isOtpStep
              ? (method === "phone-otp" ? t("otpSubtitle", { phone }) : (locale === "ar" ? `أدخل الرمز المرسل إلى ${email}` : `Enter the code sent to ${email}`))
              : t("subtitle")}
          </p>

          {error && (
            <div style={{ backgroundColor: "color-mix(in srgb, var(--danger) 10%, var(--surface))", border: "1.5px solid var(--danger)", borderRadius: "var(--radius-md)", padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--danger)", fontSize: "0.875rem" }}>
              {error}
            </div>
          )}

          {/* ── METHOD CHOOSER ── */}
          {method === "choose" && (
            <>
              {/* OAuth buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1.25rem" }}>
                <button onClick={handleGoogle} style={{ ...socialBtnStyle }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}>
                  <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  {locale === "ar" ? "التسجيل بحساب Google" : "Sign up with Google"}
                </button>
                <button onClick={handleFacebook} style={{ ...socialBtnStyle, backgroundColor: "#1877F2", color: "#fff", border: "none" }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.9"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  {locale === "ar" ? "التسجيل بحساب Facebook" : "Sign up with Facebook"}
                </button>
              </div>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.25rem 0" }}>
                <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 500 }}>{locale === "ar" ? "أو" : "OR"}</span>
                <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
              </div>

              {/* Phone / Email buttons */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
                <button onClick={() => { resetForm(); setMethod("phone"); }} style={methodBtnStyle()}>
                  {locale === "ar" ? "رقم الهاتف" : "Phone"}
                </button>
                <button onClick={() => { resetForm(); setMethod("email"); }} style={methodBtnStyle()}>
                  {locale === "ar" ? "البريد الإلكتروني" : "Email"}
                </button>
              </div>

              <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                {t("alreadyRegistered")}{" "}
                <Link href={`/${locale}/login`} style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>{t("loginLink")}</Link>
              </p>
            </>
          )}

          {/* ── PHONE REGISTER FORM ── */}
          {method === "phone" && (
            <>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{t("phoneLabel")}</label>
                <input style={inputStyle} type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9+]/g, ""))} placeholder="971501234567"
                  onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.375rem" }}>{t("phoneHint")}</p>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{t("passwordLabel")}</label>
                <div style={{ position: "relative" }}>
                  <input style={{ ...inputStyle, paddingRight: "3rem" }} type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={t("passwordPlaceholder")}
                    onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                  <button onClick={() => setShowPassword(s => !s)} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem" }}>
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{t("confirmLabel")}</label>
                <input style={inputStyle} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t("confirmPlaceholder")}
                  onKeyDown={e => e.key === "Enter" && handlePhoneRegister()} onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div style={{ marginBottom: "1.25rem", display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                <input type="checkbox" id="terms" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                  style={{ width: 16, height: 16, marginTop: "0.15rem", accentColor: "var(--primary)", flexShrink: 0, cursor: "pointer" }} />
                <label htmlFor="terms" style={{ fontSize: "0.8125rem", color: "var(--text-muted)", cursor: "pointer", lineHeight: 1.5 }}>
                  {locale === "ar" ? "أوافق على " : "I agree to the "}
                  <a href={`/${locale}/terms`} target="_blank" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>{locale === "ar" ? "الشروط والأحكام" : "Terms & Conditions"}</a>
                  {locale === "ar" ? " و" : " and "}
                  <a href={`/${locale}/privacy`} target="_blank" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>{locale === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}</a>
                </label>
              </div>
              <button onClick={handlePhoneRegister} disabled={loading || !phone || !password || !confirmPassword || !termsAccepted}
                className="btn-primary w-full" style={{ width: "100%", height: 48, fontSize: "1rem", justifyContent: "center", marginBottom: "0.75rem", opacity: (!phone || !password || !confirmPassword || !termsAccepted) ? 0.5 : 1 }}>
                {loading ? t("registering") : `→ ${t("register")}`}
              </button>
              <button onClick={() => { resetForm(); setMethod("choose"); }} style={{ width: "100%", height: 40, background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.8125rem", cursor: "pointer" }}>
                {locale === "ar" ? "← رجوع" : "← Back"}
              </button>
            </>
          )}

          {/* ── EMAIL REGISTER FORM ── */}
          {method === "email" && (
            <>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{locale === "ar" ? "البريد الإلكتروني" : "Email"}</label>
                <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"
                  onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{t("passwordLabel")}</label>
                <div style={{ position: "relative" }}>
                  <input style={{ ...inputStyle, paddingRight: "3rem" }} type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={t("passwordPlaceholder")}
                    onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                  <button onClick={() => setShowPassword(s => !s)} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem" }}>
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{t("confirmLabel")}</label>
                <input style={inputStyle} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t("confirmPlaceholder")}
                  onKeyDown={e => e.key === "Enter" && handleEmailRegister()} onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div style={{ marginBottom: "1.25rem", display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                <input type="checkbox" id="terms2" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                  style={{ width: 16, height: 16, marginTop: "0.15rem", accentColor: "var(--primary)", flexShrink: 0, cursor: "pointer" }} />
                <label htmlFor="terms2" style={{ fontSize: "0.8125rem", color: "var(--text-muted)", cursor: "pointer", lineHeight: 1.5 }}>
                  {locale === "ar" ? "أوافق على " : "I agree to the "}
                  <a href={`/${locale}/terms`} target="_blank" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>{locale === "ar" ? "الشروط والأحكام" : "Terms & Conditions"}</a>
                  {locale === "ar" ? " و" : " and "}
                  <a href={`/${locale}/privacy`} target="_blank" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>{locale === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}</a>
                </label>
              </div>
              <button onClick={handleEmailRegister} disabled={loading || !email || !password || !confirmPassword || !termsAccepted}
                className="btn-primary w-full" style={{ width: "100%", height: 48, fontSize: "1rem", justifyContent: "center", marginBottom: "0.75rem", opacity: (!email || !password || !confirmPassword || !termsAccepted) ? 0.5 : 1 }}>
                {loading ? t("registering") : `→ ${t("register")}`}
              </button>
              <button onClick={() => { resetForm(); setMethod("choose"); }} style={{ width: "100%", height: 40, background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.8125rem", cursor: "pointer" }}>
                {locale === "ar" ? "← رجوع" : "← Back"}
              </button>
            </>
          )}

          {/* ── OTP VERIFICATION (shared for phone & email) ── */}
          {isOtpStep && (
            <>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{t("otpLabel")}</label>
                <input style={{ ...inputStyle, textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5rem", fontWeight: 700 }}
                  type="text" inputMode="numeric" maxLength={6} value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="000000" autoFocus
                  onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <button onClick={method === "phone-otp" ? handlePhoneVerify : handleEmailVerify} disabled={loading || otp.length !== 6}
                className="btn-primary w-full" style={{ width: "100%", height: 48, fontSize: "1rem", justifyContent: "center", marginBottom: "0.75rem" }}>
                {loading ? t("verifying") : t("verify")}
              </button>
              <button onClick={method === "phone-otp" ? handlePhoneResend : handleEmailResend} disabled={resendCooldown > 0 || loading}
                style={{ width: "100%", height: 44, background: "none", border: "none", color: resendCooldown > 0 ? "var(--text-muted)" : "var(--primary)", fontSize: "0.875rem", cursor: resendCooldown > 0 ? "default" : "pointer", fontWeight: 500, marginBottom: "0.5rem" }}>
                {resendCooldown > 0 ? t("resendIn", { seconds: String(resendCooldown) }) : (locale === "ar" ? "↺ إعادة إرسال الرمز" : "↺ Resend code")}
              </button>
              <button onClick={() => { setMethod(method === "phone-otp" ? "phone" : "email"); setOtp(""); setError(""); }}
                style={{ width: "100%", height: 40, background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.8125rem", cursor: "pointer" }}>
                {method === "phone-otp" ? t("changeNumber") : (locale === "ar" ? "← تغيير البريد" : "← Change email")}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
