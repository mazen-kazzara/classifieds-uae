"use client";
import { useState } from "react";
import { useTranslations } from "@/lib/useTranslations";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("login");
  const [phone, setPhone] = useState("971");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  async function requestOtp() {
    setLoading(true); setError("");
    const res = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) { setError(data.error === "INVALID_PHONE" ? t("invalidPhone") : t("sendFailed")); return; }
    setStep("otp");
    // 60s resend cooldown
    setResendCooldown(60);
    const timer = setInterval(() => setResendCooldown(c => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; }), 1000);
  }

  async function verifyOtp() {
    setLoading(true); setError("");
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    const data = await res.json();
    if (!data.ok) {
      setLoading(false);
      setError(
        data.error === "INVALID_CODE" ? t("wrongCode") :
        data.error === "OTP_EXPIRED" ? t("expired") :
        data.error === "TOO_MANY_ATTEMPTS" ? t("tooMany") :
        t("failed")
      );
      return;
    }
    // OTP verified — sign in via NextAuth phone-otp provider
    const result = await signIn("phone-otp", { phone, otpToken: "verified", redirect: false });
    setLoading(false);
    if (result?.error) { setError("Login failed. Please try again."); return; }
    router.push("/my-ads");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)",
    border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)",
    color: "var(--text)", fontSize: "1rem", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
      <Header />
      <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)", padding: "1rem" }}>
        <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "2.5rem", width: "100%", maxWidth: "420px" }}>
          <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.5rem", marginBottom: "0.375rem" }}>
            {step === "phone" ? t("title") : t("otpTitle")}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.75rem" }}>
            {step === "phone"
              ? t("subtitle")
              : t("otpSubtitle", { phone })}
          </p>

          {error && (
            <div style={{ backgroundColor: "color-mix(in srgb, var(--danger) 10%, var(--surface))", border: "1.5px solid var(--danger)", borderRadius: "var(--radius-md)", padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--danger)", fontSize: "0.875rem" }}>
              {error}
            </div>
          )}

          {step === "phone" ? (
            <>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>{t("phoneLabel")}</label>
                <input
                  style={inputStyle}
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="971501234567"
                  onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
                <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.375rem" }}>{t("phoneHint")}</p>
              </div>
              <button onClick={requestOtp} disabled={loading} className="btn-primary w-full" style={{ width: "100%", height: 48, fontSize: "1rem", justifyContent: "center" }}>
                {loading ? t("sending") : t("sendCode")}
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>6-Digit Code</label>
                <input
                  style={{ ...inputStyle, textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5rem", fontWeight: 700 }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  autoFocus
                  onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              <button onClick={verifyOtp} disabled={loading || code.length !== 6} className="btn-primary w-full" style={{ width: "100%", height: 48, fontSize: "1rem", justifyContent: "center", marginBottom: "0.75rem" }}>
                {loading ? t("verifying") : t("verifySignIn")}
              </button>
              <button
                onClick={() => { setStep("phone"); setCode(""); setError(""); }}
                disabled={resendCooldown > 0}
                style={{ width: "100%", height: 44, background: "none", border: "none", color: resendCooldown > 0 ? "var(--text-muted)" : "var(--primary)", fontSize: "0.875rem", cursor: resendCooldown > 0 ? "default" : "pointer", fontWeight: 500 }}
              >
                {resendCooldown > 0 ? t("resendIn", { seconds: String(resendCooldown) }) : t("changeNumber")}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
