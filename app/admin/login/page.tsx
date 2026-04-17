"use client";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [need2FA, setNeed2FA] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [locale, setLocale] = useState("ar");

  useEffect(() => {
    const match = document.cookie.match(/locale=(\w+)/);
    if (match) setLocale(match[1]);
    const theme = localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  }, []);
  const isAr = locale === "ar";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");

    // Step 1 (first submit): pre-check credentials. If 2FA is required, show the OTP field
    // and stop — don't call signIn yet, since NextAuth would just return a generic error.
    if (!need2FA) {
      try {
        const pre = await fetch("/api/auth/admin-precheck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const preData = await pre.json();
        if (!preData.ok) {
          if (preData.error === "RATE_LIMIT_EXCEEDED") {
            setError(isAr ? "محاولات كثيرة، حاول بعد قليل" : "Too many attempts, try again later");
          } else {
            setError(isAr ? "البريد أو كلمة المرور غير صحيحة" : "Invalid email or password");
          }
          setLoading(false);
          return;
        }
        if (preData.need2FA) {
          setNeed2FA(true);
          setError("");
          setLoading(false);
          return;
        }
        // No 2FA required → fall through to signIn below
      } catch {
        setError(isAr ? "تعذّر الاتصال بالخادم" : "Could not reach the server");
        setLoading(false);
        return;
      }
    }

    // Step 2: run NextAuth signIn (with OTP if applicable)
    const res = await signIn("admin-credentials", {
      email,
      password,
      otp: otp || undefined,
      redirect: false,
    });

    if (res?.error) {
      // NextAuth returns generic "CredentialsSignin" for any failure in production.
      // At this point, the only reason signIn can fail is: wrong OTP (or creds changed mid-flow).
      setError(need2FA
        ? (isAr ? "رمز 2FA غير صالح" : "Invalid 2FA code")
        : (isAr ? "البريد أو كلمة المرور غير صحيحة" : "Invalid email or password"));
      setLoading(false);
      return;
    }
    router.push("/admin/dashboard");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)",
    border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)",
    color: "var(--text)", fontSize: "0.9375rem", outline: "none", boxSizing: "border-box",
    textAlign: "inherit",
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} dir={isAr ? "rtl" : "ltr"}>
      <form onSubmit={handleSubmit} style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "2.5rem", width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Classifieds_uae_jpg.jpeg" alt="Logo" style={{ width: 48, height: 48, borderRadius: 12, margin: "0 auto 0.75rem" }} />
          <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.5rem", marginBottom: "0.25rem" }}>{isAr ? "لوحة الإدارة" : "Admin Panel"}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>{isAr ? "سجّل دخولك لإدارة المنصة" : "Sign in to manage your platform"}</p>
        </div>

        {error && (
          <div style={{ backgroundColor: "color-mix(in srgb, var(--danger) 10%, var(--surface))", border: "1.5px solid var(--danger)", borderRadius: "var(--radius-md)", padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--danger)", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{isAr ? "البريد الإلكتروني" : "Email"}</label>
          <input style={inputStyle} type="email" placeholder="admin@classifiedsuae.ae" value={email} onChange={e => setEmail(e.target.value)} required disabled={need2FA} />
        </div>

        <div style={{ marginBottom: need2FA ? "1rem" : "1.5rem" }}>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{isAr ? "كلمة المرور" : "Password"}</label>
          <div style={{ position: "relative" }}>
            <input style={{ ...inputStyle, paddingInlineEnd: "3.5rem" }} type={showPassword ? "text" : "password"} placeholder={isAr ? "أدخل كلمة المرور" : "Enter your password"} value={password} onChange={e => setPassword(e.target.value)} required disabled={need2FA} />
            <button type="button" onClick={() => setShowPassword(s => !s)}
              style={{ position: "absolute", insetInlineEnd: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.8125rem", fontWeight: 500 }}>
              {showPassword ? (isAr ? "إخفاء" : "Hide") : (isAr ? "إظهار" : "Show")}
            </button>
          </div>
        </div>

        {need2FA && (
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>
              {isAr ? "رمز المصادقة الثنائية" : "2FA Code"}
            </label>
            <input
              style={{ ...inputStyle, letterSpacing: "0.3em", textAlign: "center", fontFamily: "monospace", fontSize: "1.25rem" }}
              type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
              placeholder="000000" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoFocus required
            />
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.375rem", textAlign: "center" }}>
              {isAr ? "افتح تطبيق المصادقة وأدخل الرمز" : "Open your authenticator app and enter the code"}
            </p>
          </div>
        )}

        <button type="submit" disabled={loading || (need2FA && otp.length !== 6)}
          style={{ width: "100%", height: 48, borderRadius: "var(--radius-md)", backgroundColor: "var(--primary)", color: "#fff", border: "none", fontSize: "0.9375rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: (loading || (need2FA && otp.length !== 6)) ? 0.5 : 1, transition: "opacity 0.15s" }}>
          {loading ? (isAr ? "جارٍ الدخول..." : "Signing in...") : need2FA ? (isAr ? "تحقق ودخول" : "Verify & Sign In") : (isAr ? "تسجيل الدخول" : "Sign In")}
        </button>

        {need2FA && (
          <button type="button" onClick={() => { setNeed2FA(false); setOtp(""); setError(""); }}
            style={{ width: "100%", marginTop: "0.75rem", background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.8125rem", cursor: "pointer" }}>
            {isAr ? "← العودة" : "← Back"}
          </button>
        )}
      </form>
    </div>
  );
}
