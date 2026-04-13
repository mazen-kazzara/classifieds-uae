"use client";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    const res = await signIn("admin-credentials", { email, password, redirect: false });
    if (res?.error) { setError(isAr ? "البريد أو كلمة المرور غير صحيحة" : "Invalid email or password"); setLoading(false); return; }
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
          <input style={inputStyle} type="email" placeholder="admin@classifiedsuae.ae" value={email} onChange={e => setEmail(e.target.value)} required
            onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{isAr ? "كلمة المرور" : "Password"}</label>
          <div style={{ position: "relative" }}>
            <input style={{ ...inputStyle, paddingInlineEnd: "3.5rem" }} type={showPassword ? "text" : "password"} placeholder={isAr ? "أدخل كلمة المرور" : "Enter your password"} value={password} onChange={e => setPassword(e.target.value)} required
              onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
            <button type="button" onClick={() => setShowPassword(s => !s)}
              style={{ position: "absolute", insetInlineEnd: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.8125rem", fontWeight: 500 }}>
              {showPassword ? (isAr ? "إخفاء" : "Hide") : (isAr ? "إظهار" : "Show")}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          style={{ width: "100%", height: 48, borderRadius: "var(--radius-md)", backgroundColor: "var(--primary)", color: "#fff", border: "none", fontSize: "0.9375rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, transition: "opacity 0.15s" }}>
          {loading ? (isAr ? "جارٍ الدخول..." : "Signing in...") : (isAr ? "تسجيل الدخول" : "Sign In")}
        </button>
      </form>
    </div>
  );
}
