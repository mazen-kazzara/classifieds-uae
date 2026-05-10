"use client";

/**
 * Company Registration Wizard
 * Steps: pickPlan → fillForm → otpVerify → checkout (redirects to Ziina)
 */
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useLocale } from "@/lib/useTranslations";
import Header from "@/components/Header";
import Link from "next/link";
import CompanyRegistrationForm from "@/components/forms/CompanyRegistrationForm";

type Plan = {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  description: string | null;
  descriptionAr: string | null;
  price: number;
  currency: string;
  billingCycle: string;
  maxActivities: number;
  maxAdChars: number;
  maxAdImages: number;
  unlimitedAds: boolean;
};

type Step = "pickPlan" | "fillForm" | "otpVerify" | "checkout";

export default function CompanyRegisterPage() {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [step, setStep] = useState<Step>("pickPlan");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const [companyId, setCompanyId] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [password, setPassword] = useState<string>(""); // never stored long-term; used for auto-login
  const [mockCode, setMockCode] = useState<string>("");

  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // ── Load plans on mount ──────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/company/plans")
      .then(r => r.json())
      .then(d => {
        if (!d.ok) { setPlansError(isAr ? "فشل تحميل الباقات" : "Failed to load plans"); return; }
        setPlans(d.plans || []);
      })
      .catch(() => setPlansError(isAr ? "خطأ في الشبكة" : "Network error"))
      .finally(() => setPlansLoading(false));
  }, [isAr]);

  // ── Resend cooldown timer ────────────────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  function handlePickPlan(p: Plan) {
    setSelectedPlan(p);
    setStep("fillForm");
  }

  function handleFormSuccess(cId: string, opts: { mockCode?: string; phone: string; password: string }) {
    setCompanyId(cId);
    setPhone(opts.phone);
    setPassword(opts.password);
    if (opts.mockCode) setMockCode(opts.mockCode);
    setStep("otpVerify");
    setResendCooldown(60);
  }

  async function handleVerifyOtp() {
    setOtpLoading(true); setOtpError("");
    try {
      const res = await fetch("/api/company/register/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, code: otp }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (data.error === "INVALID_CODE") setOtpError(isAr ? "الرمز غير صحيح" : "Invalid code");
        else if (data.error === "OTP_EXPIRED") setOtpError(isAr ? "انتهت صلاحية الرمز" : "Code expired");
        else if (data.error === "TOO_MANY_ATTEMPTS") setOtpError(isAr ? "محاولات كثيرة، حاول لاحقاً" : "Too many attempts, try later");
        else setOtpError(isAr ? "فشل التحقق" : "Verification failed");
        return;
      }
      // Auto-login via the existing phone-password credentials provider.
      if (password) {
        await signIn("phone-password", { phone, password, redirect: false });
      }
      setStep("checkout");
      // Kick off checkout immediately
      void startCheckout();
    } catch {
      setOtpError(isAr ? "خطأ في الشبكة" : "Network error");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setOtpError("");
    try {
      const res = await fetch("/api/company/register/resend-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (!data.ok) {
        setOtpError(isAr ? "فشل إعادة الإرسال" : "Failed to resend");
        return;
      }
      if (data.mockCode) setMockCode(data.mockCode);
      setResendCooldown(60);
    } catch {
      setOtpError(isAr ? "خطأ في الشبكة" : "Network error");
    }
  }

  async function startCheckout() {
    setCheckoutLoading(true); setCheckoutError("");
    try {
      const res = await fetch("/api/company/subscription/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (!data.ok || !data.checkoutUrl) {
        setCheckoutError(isAr ? "فشل بدء الدفع" : "Failed to start checkout");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setCheckoutError(isAr ? "خطأ في الشبكة" : "Network error");
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }} dir={isAr ? "rtl" : "ltr"}>
      <Header />
      <main style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", minHeight: "calc(100vh - 60px)", padding: "2rem 1rem" }}>
        <div style={{
          backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)",
          padding: "2.5rem", width: "100%", maxWidth: step === "pickPlan" ? "960px" : "560px",
        }}>
          {/* Progress */}
          <div style={{ display: "flex", gap: "0.375rem", marginBottom: "1.5rem" }}>
            {(["pickPlan", "fillForm", "otpVerify", "checkout"] as Step[]).map((s, idx) => {
              const order: Record<Step, number> = { pickPlan: 0, fillForm: 1, otpVerify: 2, checkout: 3 };
              const active = order[step] >= idx;
              return (
                <div key={s} style={{
                  flex: 1, height: 4, borderRadius: 2,
                  backgroundColor: active ? "var(--primary)" : "var(--border)",
                  transition: "background-color 0.2s",
                }} />
              );
            })}
          </div>

          <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.5rem", marginBottom: "0.375rem" }}>
            {step === "pickPlan"   ? (isAr ? "تسجيل شركة" : "Register Your Company")
            : step === "fillForm"  ? (isAr ? "بيانات الشركة" : "Company Details")
            : step === "otpVerify" ? (isAr ? "تأكيد رقم الهاتف" : "Verify Phone")
            : (isAr ? "إتمام الدفع" : "Complete Payment")}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.75rem" }}>
            {step === "pickPlan"   ? (isAr ? "اختر باقة الاشتراك المناسبة" : "Choose the plan that fits your business")
            : step === "fillForm"  ? (isAr ? "أكمل بيانات الرخصة وأنشئ حسابك" : "Provide license details and create your account")
            : step === "otpVerify" ? (isAr ? `أدخل الرمز المُرسل إلى ${phone}` : `Enter the code sent to ${phone}`)
            : (isAr ? "سيتم توجيهك إلى صفحة الدفع الآمن" : "Redirecting to secure checkout...")}
          </p>

          {/* ── STEP 1: Plan picker ── */}
          {step === "pickPlan" && (
            <>
              {plansLoading && <p style={{ color: "var(--text-muted)" }}>{isAr ? "جارٍ التحميل..." : "Loading..."}</p>}
              {plansError && <p style={{ color: "var(--danger)" }}>{plansError}</p>}
              {!plansLoading && !plansError && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
                  {plans.map(p => (
                    <button key={p.id} type="button" onClick={() => handlePickPlan(p)}
                      style={{
                        textAlign: isAr ? "right" : "left",
                        padding: "1.25rem", borderRadius: "var(--radius-md)",
                        border: `2px solid ${selectedPlan?.id === p.id ? "var(--primary)" : "var(--border)"}`,
                        backgroundColor: "var(--surface-2)", cursor: "pointer", transition: "all 0.15s",
                        display: "flex", flexDirection: "column", gap: "0.5rem",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = selectedPlan?.id === p.id ? "var(--primary)" : "var(--border)"; }}>
                      <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text)" }}>
                        {isAr ? p.nameAr : p.name}
                      </div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)" }}>
                        {p.price} {p.currency}
                        <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-muted)", marginLeft: 6 }}>
                          / {isAr ? "شهر" : "mo"}
                        </span>
                      </div>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.375rem", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                        <li>✔ {isAr ? `${p.maxActivities} نشاط` : `${p.maxActivities} activity`}</li>
                        <li>✔ {p.unlimitedAds ? (isAr ? "إعلانات غير محدودة" : "Unlimited ads") : ""}</li>
                        <li>✔ {isAr ? `وصف حتى ${p.maxAdChars} حرف` : `Up to ${p.maxAdChars} chars / ad`}</li>
                        <li>✔ {isAr ? `حتى ${p.maxAdImages} صور لكل إعلان` : `Up to ${p.maxAdImages} images / ad`}</li>
                      </ul>
                      <div className="btn-primary" style={{ width: "100%", height: 40, marginTop: "0.5rem", justifyContent: "center", fontSize: "0.875rem" }}>
                        {isAr ? "اختر هذه الباقة" : "Select this plan"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "1.5rem" }}>
                {isAr ? "حساب فردي؟ " : "Personal account? "}
                <Link href={`/${locale}/register`} style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
                  {isAr ? "سجل هنا" : "Register here"}
                </Link>
              </p>
            </>
          )}

          {/* ── STEP 2: Form ── */}
          {step === "fillForm" && selectedPlan && (
            <CompanyRegistrationForm
              plan={selectedPlan}
              onBack={() => setStep("pickPlan")}
              onSuccess={handleFormSuccess}
            />
          )}

          {/* ── STEP 3: OTP ── */}
          {step === "otpVerify" && (
            <>
              {mockCode && (
                <div style={{
                  backgroundColor: "color-mix(in srgb, var(--warning, #f59e0b) 12%, var(--surface))",
                  border: "1.5px dashed var(--warning, #f59e0b)", color: "var(--text)",
                  padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.8125rem",
                }}>
                  {isAr ? "وضع التطوير — رمز التحقق: " : "Dev mode — code: "}<strong>{mockCode}</strong>
                </div>
              )}
              {otpError && (
                <div style={{
                  backgroundColor: "color-mix(in srgb, var(--danger) 10%, var(--surface))",
                  border: "1.5px solid var(--danger)", borderRadius: "var(--radius-md)",
                  padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--danger)", fontSize: "0.875rem",
                }}>
                  {otpError}
                </div>
              )}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>
                  {isAr ? "رمز التحقق" : "Verification code"}
                </label>
                <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} maxLength={6}
                  style={{
                    width: "100%", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)",
                    border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)",
                    color: "var(--text)", fontSize: "1.5rem", letterSpacing: "0.5rem",
                    fontWeight: 700, textAlign: "center", outline: "none", boxSizing: "border-box",
                  }}
                  placeholder="000000" autoFocus inputMode="numeric" />
              </div>
              <button onClick={handleVerifyOtp} disabled={otpLoading || otp.length !== 6}
                className="btn-primary w-full"
                style={{ width: "100%", height: 48, fontSize: "1rem", justifyContent: "center", marginBottom: "0.75rem" }}>
                {otpLoading ? (isAr ? "جارٍ التحقق..." : "Verifying...") : (isAr ? "تأكيد" : "Verify")}
              </button>
              <button onClick={handleResendOtp} disabled={resendCooldown > 0}
                style={{ width: "100%", height: 44, background: "none", border: "none", color: resendCooldown > 0 ? "var(--text-muted)" : "var(--primary)", fontSize: "0.875rem", cursor: resendCooldown > 0 ? "default" : "pointer", fontWeight: 500 }}>
                {resendCooldown > 0
                  ? (isAr ? `إعادة الإرسال خلال ${resendCooldown} ث` : `Resend in ${resendCooldown}s`)
                  : (isAr ? "↺ إعادة إرسال الرمز" : "↺ Resend code")}
              </button>
            </>
          )}

          {/* ── STEP 4: Checkout redirect ── */}
          {step === "checkout" && (
            <>
              {checkoutError && (
                <div style={{
                  backgroundColor: "color-mix(in srgb, var(--danger) 10%, var(--surface))",
                  border: "1.5px solid var(--danger)", borderRadius: "var(--radius-md)",
                  padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--danger)", fontSize: "0.875rem",
                }}>
                  {checkoutError}
                </div>
              )}
              <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", marginBottom: "1.5rem" }}>
                {checkoutLoading
                  ? (isAr ? "جارٍ تجهيز صفحة الدفع..." : "Preparing checkout page...")
                  : (isAr ? "اضغط لإتمام الدفع وتفعيل الاشتراك." : "Click to complete payment and activate your subscription.")}
              </p>
              <button onClick={startCheckout} disabled={checkoutLoading} className="btn-primary w-full"
                style={{ width: "100%", height: 48, fontSize: "1rem", justifyContent: "center" }}>
                {checkoutLoading ? (isAr ? "جارٍ التحويل..." : "Redirecting...") : (isAr ? "متابعة الدفع" : "Proceed to payment")}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
