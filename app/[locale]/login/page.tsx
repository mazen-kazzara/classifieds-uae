"use client";
import { useState } from "react";
import { useTranslations, useLocale } from "@/lib/useTranslations";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";

type LoginMethod = "choose" | "phone" | "email";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const locale = useLocale();
  const redirect = sp.get("redirect") || "/my-ads";
  const t = useTranslations("login");

  const [method, setMethod] = useState<LoginMethod>("choose");
  const [phone, setPhone] = useState("971");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const resetSuccess = sp.get("reset") === "1";

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

  const redirectPath = `/${locale}${redirect.startsWith("/") ? redirect : "/" + redirect}`;

  async function handlePhoneSignIn() {
    setLoading(true); setError("");
    const cleanPhone = phone.replace(/[\s+\-()]/g, "");
    const res = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone, password }),
    });
    const data = await res.json();
    if (!data.ok) {
      setLoading(false);
      if (data.error === "NOT_REGISTERED") { setError(t("notRegisteredError")); return; }
      if (data.error === "WRONG_PASSWORD") { setError(t("wrongPassword", { remaining: String(data.remainingAttempts ?? 0) })); return; }
      if (data.error === "TOO_MANY_ATTEMPTS") { setError(t("tooMany", { seconds: String(data.retryAfter) })); return; }
      if (data.error === "PHONE_NOT_VERIFIED") { setError(locale === "ar" ? "الهاتف غير مؤكد. يرجى التسجيل مرة أخرى." : "Phone not verified. Please register again."); return; }
      setError(t("failed")); return;
    }
    const result = await signIn("phone-password", { phone: cleanPhone, password, redirect: false });
    setLoading(false);
    if (result?.error) { setError(t("failed")); return; }
    router.push(redirectPath);
  }

  async function handleEmailSignIn() {
    setLoading(true); setError("");
    const e = email.trim().toLowerCase();
    const res = await fetch("/api/auth/email/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: e, password }),
    });
    const data = await res.json();
    if (!data.ok) {
      setLoading(false);
      if (data.error === "NOT_REGISTERED") { setError(locale === "ar" ? "البريد غير مسجل" : "Email not registered"); return; }
      if (data.error === "WRONG_PASSWORD") { setError(t("wrongPassword", { remaining: String(data.remainingAttempts ?? 0) })); return; }
      if (data.error === "TOO_MANY_ATTEMPTS") { setError(t("tooMany", { seconds: String(data.retryAfter) })); return; }
      if (data.error === "EMAIL_NOT_VERIFIED") { setError(locale === "ar" ? "البريد غير مؤكد. يرجى التسجيل مرة أخرى." : "Email not verified. Please register again."); return; }
      setError(t("failed")); return;
    }
    const result = await signIn("email-password", { email: e, password, redirect: false });
    setLoading(false);
    if (result?.error) { setError(t("failed")); return; }
    router.push(redirectPath);
  }

  function handleGoogle() { signIn("google", { callbackUrl: redirectPath }); }
  function handleFacebook() { signIn("facebook", { callbackUrl: redirectPath }); }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }} dir={locale === "ar" ? "rtl" : "ltr"}>
      <Header />
      <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)", padding: "1rem" }}>
        <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "2.5rem", width: "100%", maxWidth: "420px" }}>
          <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.5rem", marginBottom: "0.375rem" }}>{t("title")}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.75rem" }}>{t("subtitle")}</p>

          {resetSuccess && (
            <div style={{ backgroundColor: "color-mix(in srgb, var(--primary) 10%, var(--surface))", border: "1.5px solid var(--primary)", borderRadius: "var(--radius-md)", padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--primary)", fontSize: "0.875rem" }}>
              {locale === "ar" ? "✅ تم إعادة تعيين كلمة المرور بنجاح! سجّل دخولك." : "✅ Password reset successfully! Please sign in."}
            </div>
          )}

          {error && (
            <div style={{ backgroundColor: "color-mix(in srgb, var(--danger) 10%, var(--surface))", border: "1.5px solid var(--danger)", borderRadius: "var(--radius-md)", padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--danger)", fontSize: "0.875rem" }}>
              {error}
            </div>
          )}

          {/* ── METHOD CHOOSER ── */}
          {method === "choose" && (
            <>
              {/* OAuth */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1.25rem" }}>
                <button onClick={handleGoogle} style={socialBtnStyle}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}>
                  <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  {locale === "ar" ? "تسجيل الدخول بـ Google" : "Sign in with Google"}
                </button>
                <button onClick={handleFacebook} style={{ ...socialBtnStyle, backgroundColor: "#1877F2", color: "#fff", border: "none" }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.9"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  {locale === "ar" ? "تسجيل الدخول بـ Facebook" : "Sign in with Facebook"}
                </button>
              </div>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.25rem 0" }}>
                <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 500 }}>{locale === "ar" ? "أو" : "OR"}</span>
                <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
              </div>

              {/* Phone / Email */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
                <button onClick={() => { setError(""); setMethod("phone"); }}
                  style={{ flex: 1, height: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-muted)", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                  {locale === "ar" ? "رقم الهاتف" : "Phone"}
                </button>
                <button onClick={() => { setError(""); setMethod("email"); }}
                  style={{ flex: 1, height: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-muted)", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                  {locale === "ar" ? "البريد الإلكتروني" : "Email"}
                </button>
              </div>

              <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                {t("notRegistered")}{" "}
                <Link href={`/${locale}/register`} style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>{t("registerLink")}</Link>
              </p>
            </>
          )}

          {/* ── PHONE LOGIN ── */}
          {method === "phone" && (
            <>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{t("phoneLabel")}</label>
                <input style={inputStyle} type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9+]/g, ""))} placeholder="971501234567"
                  onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.375rem" }}>{t("phoneHint")}</p>
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{t("passwordLabel")}</label>
                <div style={{ position: "relative" }}>
                  <input style={{ ...inputStyle, paddingRight: "3rem" }} type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={t("passwordPlaceholder")}
                    onKeyDown={e => e.key === "Enter" && handlePhoneSignIn()} onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                  <button onClick={() => setShowPassword(s => !s)} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem" }}>
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <button onClick={handlePhoneSignIn} disabled={loading || !phone || !password}
                className="btn-primary w-full" style={{ width: "100%", height: 48, fontSize: "1rem", justifyContent: "center", marginBottom: "0.75rem" }}>
                {loading ? t("signingIn") : t("signIn")}
              </button>
              <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
                <Link href={`/${locale}/forgot-password`} style={{ color: "var(--text-muted)", fontSize: "0.875rem", textDecoration: "none" }}>
                  {locale === "ar" ? "نسيت كلمة المرور؟" : "Forgot password?"}
                </Link>
              </div>
              <button onClick={() => { setError(""); setMethod("choose"); }} style={{ width: "100%", height: 40, background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.8125rem", cursor: "pointer" }}>
                {locale === "ar" ? "← رجوع" : "← Back"}
              </button>
            </>
          )}

          {/* ── EMAIL LOGIN ── */}
          {method === "email" && (
            <>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{locale === "ar" ? "البريد الإلكتروني" : "Email"}</label>
                <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"
                  onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{t("passwordLabel")}</label>
                <div style={{ position: "relative" }}>
                  <input style={{ ...inputStyle, paddingRight: "3rem" }} type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={t("passwordPlaceholder")}
                    onKeyDown={e => e.key === "Enter" && handleEmailSignIn()} onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                  <button onClick={() => setShowPassword(s => !s)} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem" }}>
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <button onClick={handleEmailSignIn} disabled={loading || !email || !password}
                className="btn-primary w-full" style={{ width: "100%", height: 48, fontSize: "1rem", justifyContent: "center", marginBottom: "0.75rem" }}>
                {loading ? t("signingIn") : t("signIn")}
              </button>
              <button onClick={() => { setError(""); setMethod("choose"); }} style={{ width: "100%", height: 40, background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.8125rem", cursor: "pointer" }}>
                {locale === "ar" ? "← رجوع" : "← Back"}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
