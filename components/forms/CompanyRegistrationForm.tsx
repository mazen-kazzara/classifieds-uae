"use client";

/**
 * CompanyRegistrationForm
 * Renders the trade-license + auth fields portion of company registration.
 * Submits via multipart to /api/company/register/start and surfaces the
 * resulting companyId (and mockCode in dev) to the parent via onSuccess.
 *
 * Validation UX: field-level errors render under the offending input with a
 * red border. On submit failure, the first invalid field is focused and
 * scrolled into view. The top banner is reserved for non-field errors only
 * (rate-limit, network, generic).
 */
import { useMemo, useRef, useState } from "react";
import { useLocale } from "@/lib/useTranslations";

type Plan = {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  price: number;
  currency: string;
  maxAdChars: number;
  maxAdImages: number;
};

type Props = {
  plan: Plan;
  onBack: () => void;
  onSuccess: (companyId: string, opts: { mockCode?: string; phone: string; password: string }) => void;
};

// Schema-aligned field names — match the Zod schema in
// lib/validation/companyRegistrationSchema.ts so server-returned `field`
// values plug straight into our error map.
type FieldName =
  | "tradeLicenseName"
  | "companyPhone"
  | "authorizedSignatory"
  | "activity"
  | "password"
  | "confirmPassword"
  | "tradeLicense"
  | "termsAccepted";

const ACCEPTED_FILE_TYPES = ".pdf,.jpg,.jpeg,.png,.webp";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function passwordStrength(p: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let score = 0 as 0 | 1 | 2 | 3 | 4;
  if (p.length >= 8) score = (score + 1) as typeof score;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score = (score + 1) as typeof score;
  if (/[0-9]/.test(p)) score = (score + 1) as typeof score;
  if (/[!@#$%^&*()_\-+={}[\]:;"'<>,.?/|\\~`]/.test(p)) score = (score + 1) as typeof score;
  const labels = ["Too weak", "Weak", "Fair", "Strong", "Very strong"] as const;
  return { score, label: labels[score] };
}

export default function CompanyRegistrationForm({ plan, onBack, onSuccess }: Props) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [tradeLicenseName, setTradeLicenseName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("971");
  const [authorizedSignatory, setAuthorizedSignatory] = useState("");
  const [activity, setActivity] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tradeLicense, setTradeLicense] = useState<File | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  // Field-specific errors render inline under each input.
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  // Top banner is for non-field errors only (rate limit, network, etc.).
  const [generalError, setGeneralError] = useState("");

  // Refs let us scroll/focus the first invalid field after submit.
  const refs: Record<FieldName, React.RefObject<HTMLInputElement | null>> = {
    tradeLicenseName:    useRef<HTMLInputElement>(null),
    companyPhone:        useRef<HTMLInputElement>(null),
    authorizedSignatory: useRef<HTMLInputElement>(null),
    activity:            useRef<HTMLInputElement>(null),
    password:            useRef<HTMLInputElement>(null),
    confirmPassword:     useRef<HTMLInputElement>(null),
    tradeLicense:        useRef<HTMLInputElement>(null),
    termsAccepted:       useRef<HTMLInputElement>(null),
  };

  const strength = useMemo(() => passwordStrength(password), [password]);

  const baseInputStyle: React.CSSProperties = {
    width: "100%", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)",
    border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)",
    color: "var(--text)", fontSize: "1rem", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  // Red border when this field has an error.
  const inputStyleFor = (name: FieldName): React.CSSProperties => ({
    ...baseInputStyle,
    border: `1.5px solid ${fieldErrors[name] ? "var(--danger)" : "var(--border)"}`,
  });

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem",
  };

  // Inline error message rendered under the input.
  const FieldError = ({ name }: { name: FieldName }) => {
    const msg = fieldErrors[name];
    if (!msg) return null;
    return (
      <p style={{ marginTop: "0.375rem", fontSize: "0.75rem", color: "var(--danger)", fontWeight: 500 }}>
        {msg}
      </p>
    );
  };

  // Clear a field's error as soon as the user starts editing it.
  const clearFieldError = (name: FieldName) => {
    if (fieldErrors[name]) {
      setFieldErrors(e => {
        const next = { ...e };
        delete next[name];
        return next;
      });
    }
  };

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) { setTradeLicense(null); return; }
    if (f.size > MAX_FILE_BYTES) {
      setFieldErrors(prev => ({ ...prev, tradeLicense: isAr ? "الملف أكبر من 10 ميجابايت" : "File exceeds 10 MB limit" }));
      e.target.value = "";
      setTradeLicense(null);
      return;
    }
    clearFieldError("tradeLicense");
    setTradeLicense(f);
  }

  /**
   * Run all client checks and return a populated error map. Order of fields
   * in this function determines focus priority — first invalid wins.
   */
  function clientValidate(): Partial<Record<FieldName, string>> {
    const errs: Partial<Record<FieldName, string>> = {};

    if (!tradeLicenseName.trim() || tradeLicenseName.trim().length < 3) {
      errs.tradeLicenseName = isAr ? "اسم الرخصة قصير جداً (3 أحرف على الأقل)" : "Trade license name is too short (min 3 chars)";
    }

    const phone = companyPhone.replace(/[\s+\-()]/g, "");
    if (!/^9715\d{8}$/.test(phone)) {
      errs.companyPhone = isAr ? "رقم هاتف إماراتي غير صالح (9715XXXXXXXX)" : "Invalid UAE phone number (9715XXXXXXXX)";
    }

    if (!authorizedSignatory.trim() || authorizedSignatory.trim().length < 3) {
      errs.authorizedSignatory = isAr ? "اسم المفوض بالتوقيع مطلوب" : "Authorized signatory name is required";
    }

    if (!activity.trim() || activity.trim().length < 2) {
      errs.activity = isAr ? "النشاط التجاري مطلوب" : "Activity is required";
    }

    if (password.length < 8) {
      errs.password = isAr ? "كلمة المرور قصيرة (8 أحرف على الأقل)" : "Password must be at least 8 characters";
    } else if (
      !/[a-z]/.test(password) || !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) || !/[!@#$%^&*()_\-+={}[\]:;"'<>,.?/|\\~`]/.test(password)
    ) {
      errs.password = isAr
        ? "يجب أن تحتوي على حرف كبير وصغير ورقم ورمز"
        : "Must contain upper, lower, digit, and a symbol";
    }

    if (!errs.password && password !== confirmPassword) {
      errs.confirmPassword = isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match";
    }

    if (!tradeLicense) {
      errs.tradeLicense = isAr ? "رفع الرخصة التجارية مطلوب" : "Trade license upload is required";
    }

    if (!termsAccepted) {
      errs.termsAccepted = isAr ? "يجب قبول الشروط والأحكام" : "You must accept the terms & conditions";
    }

    return errs;
  }

  /** Pick the first invalid field (in form order) and focus + scroll to it. */
  function focusFirstInvalid(errs: Partial<Record<FieldName, string>>) {
    const order: FieldName[] = [
      "tradeLicenseName", "companyPhone", "authorizedSignatory", "activity",
      "tradeLicense", "password", "confirmPassword", "termsAccepted",
    ];
    for (const name of order) {
      if (errs[name]) {
        const el = refs[name].current;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          // Slight delay so scroll lands first; focus rings then highlight properly.
          setTimeout(() => el.focus({ preventScroll: true }), 250);
        }
        return;
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError("");

    const errs = clientValidate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      focusFirstInvalid(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    const cleanPhone = companyPhone.replace(/[\s+\-()]/g, "");

    const fd = new FormData();
    fd.set("planSlug", plan.slug);
    fd.set("tradeLicenseName", tradeLicenseName.trim());
    fd.set("companyPhone", cleanPhone);
    fd.set("authorizedSignatory", authorizedSignatory.trim());
    fd.set("activity", activity.trim());
    fd.set("password", password);
    fd.set("confirmPassword", confirmPassword);
    fd.set("termsAccepted", "true");
    fd.set("tradeLicense", tradeLicense as File);

    try {
      const res = await fetch("/api/company/register/start", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) {
        setLoading(false);
        const code = data.error as string;
        const next: Partial<Record<FieldName, string>> = {};

        // Map server errors to the field they relate to. Field names align
        // with the Zod schema so VALIDATION_ERROR.field plugs straight in.
        if (code === "PHONE_IN_USE") {
          next.companyPhone = isAr ? "هذا الرقم مسجل بالفعل" : "This phone is already in use";
        } else if (code === "COMPANY_ALREADY_EXISTS") {
          next.companyPhone = isAr ? "توجد شركة مسجلة بهذا الحساب" : "A company is already registered with this account";
        } else if (code === "FILE_TOO_LARGE") {
          next.tradeLicense = isAr ? "حجم الملف كبير (الحد الأقصى 10 ميجابايت)" : "File too large (max 10 MB)";
        } else if (code === "FILE_REQUIRED" || code === "FILE_EMPTY") {
          next.tradeLicense = isAr ? "رفع الرخصة التجارية مطلوب" : "Trade license upload is required";
        } else if (code === "INVALID_FILE_TYPE") {
          next.tradeLicense = isAr ? "نوع الملف غير مدعوم (PDF أو صورة فقط)" : "Unsupported file type (PDF or image only)";
        } else if (code === "VALIDATION_ERROR" && data.field) {
          // Server returned a Zod issue path — use it directly.
          const fieldName = data.field as FieldName;
          if (refs[fieldName]) {
            next[fieldName] = data.message || (isAr ? "بيانات غير صالحة" : "Invalid input");
          } else {
            setGeneralError(data.message || (isAr ? "بيانات غير صالحة" : "Invalid input"));
          }
        } else if (code === "OTP_SEND_FAILED") {
          // Account was created — let the parent advance to OTP step so they can resend.
          if (data.companyId) {
            onSuccess(data.companyId, { mockCode: data.mockCode, phone: cleanPhone, password });
            return;
          }
          setGeneralError(isAr ? "فشل إرسال رمز التحقق، حاول مرة أخرى" : "Failed to send verification code, try again");
        } else if (code === "RATE_LIMITED" || res.status === 429) {
          setGeneralError(isAr ? "محاولات كثيرة، حاول لاحقاً" : "Too many attempts, please try again later");
        } else if (code === "INVALID_PLAN") {
          setGeneralError(isAr ? "الباقة المختارة غير صالحة" : "The selected plan is invalid");
        } else {
          setGeneralError(isAr ? "حدث خطأ، حاول مرة أخرى" : "Something went wrong, please try again");
        }

        if (Object.keys(next).length > 0) {
          setFieldErrors(next);
          focusFirstInvalid(next);
        }
        return;
      }
      onSuccess(data.companyId, { mockCode: data.mockCode, phone: cleanPhone, password });
    } catch (err) {
      console.error("CompanyRegister submit error:", err);
      setGeneralError(isAr ? "خطأ في الشبكة، تحقق من اتصالك" : "Network error, check your connection");
    } finally {
      setLoading(false);
    }
  }

  const planNameDisplay = isAr ? plan.nameAr : plan.name;

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Selected plan banner */}
      <div style={{
        padding: "0.875rem 1rem", borderRadius: "var(--radius-md)",
        backgroundColor: "color-mix(in srgb, var(--primary) 8%, var(--surface))",
        border: "1.5px solid color-mix(in srgb, var(--primary) 35%, var(--border))",
        marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
            {isAr ? "الباقة المختارة" : "Selected plan"}
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>{planNameDisplay}</div>
        </div>
        <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--primary)" }}>
          {plan.price} {plan.currency} / {isAr ? "شهر" : "mo"}
        </div>
        <button type="button" onClick={onBack} style={{
          background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.8125rem", cursor: "pointer", textDecoration: "underline",
        }}>
          {isAr ? "تغيير" : "Change"}
        </button>
      </div>

      {/* Top banner — non-field errors only (rate-limit, network, etc.) */}
      {generalError && (
        <div style={{
          backgroundColor: "color-mix(in srgb, var(--danger) 10%, var(--surface))",
          border: "1.5px solid var(--danger)", borderRadius: "var(--radius-md)",
          padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--danger)", fontSize: "0.875rem",
        }}>
          {generalError}
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <label style={labelStyle}>{isAr ? "اسم الرخصة التجارية (كما هو مكتوب)" : "Trade License Name (exactly as written)"}</label>
        <input ref={refs.tradeLicenseName} style={inputStyleFor("tradeLicenseName")} type="text"
          value={tradeLicenseName}
          onChange={e => { setTradeLicenseName(e.target.value); clearFieldError("tradeLicenseName"); }}
          maxLength={200} aria-invalid={!!fieldErrors.tradeLicenseName} />
        <FieldError name="tradeLicenseName" />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={labelStyle}>{isAr ? "رقم هاتف الشركة (يجب أن يطابق الرخصة)" : "Company Phone Number (must match license)"}</label>
        <input ref={refs.companyPhone} style={inputStyleFor("companyPhone")} type="tel" inputMode="numeric"
          value={companyPhone}
          onChange={e => { setCompanyPhone(e.target.value.replace(/[^0-9+]/g, "")); clearFieldError("companyPhone"); }}
          placeholder="971501234567" aria-invalid={!!fieldErrors.companyPhone} />
        <FieldError name="companyPhone" />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={labelStyle}>{isAr ? "اسم المفوض بالتوقيع أو المالك" : "Authorized Signatory or Owner Name"}</label>
        <input ref={refs.authorizedSignatory} style={inputStyleFor("authorizedSignatory")} type="text"
          value={authorizedSignatory}
          onChange={e => { setAuthorizedSignatory(e.target.value); clearFieldError("authorizedSignatory"); }}
          maxLength={120} aria-invalid={!!fieldErrors.authorizedSignatory} />
        <FieldError name="authorizedSignatory" />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={labelStyle}>{isAr ? "النشاط (مثال: سيارات، عقارات، سياحة)" : "Activity (e.g. Cars, Real Estate, Tourism)"}</label>
        <input ref={refs.activity} style={inputStyleFor("activity")} type="text"
          value={activity}
          onChange={e => { setActivity(e.target.value); clearFieldError("activity"); }}
          maxLength={80} aria-invalid={!!fieldErrors.activity} />
        <FieldError name="activity" />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={labelStyle}>{isAr ? "رفع الرخصة التجارية (PDF أو صورة، حتى 10 ميجابايت)" : "Trade License Upload (PDF or image, up to 10 MB)"}</label>
        <input ref={refs.tradeLicense} type="file" accept={ACCEPTED_FILE_TYPES} onChange={onFileChange}
          style={{ ...inputStyleFor("tradeLicense"), padding: "0.5rem", cursor: "pointer" }}
          aria-invalid={!!fieldErrors.tradeLicense} />
        {tradeLicense && !fieldErrors.tradeLicense && (
          <p style={{ marginTop: "0.375rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {tradeLicense.name} ({Math.round(tradeLicense.size / 1024)} KB)
          </p>
        )}
        <FieldError name="tradeLicense" />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={labelStyle}>{isAr ? "كلمة المرور" : "Password"}</label>
        <div style={{ position: "relative" }}>
          <input ref={refs.password} style={{ ...inputStyleFor("password"), paddingRight: "3rem" }}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={e => { setPassword(e.target.value); clearFieldError("password"); clearFieldError("confirmPassword"); }}
            maxLength={72} aria-invalid={!!fieldErrors.password} />
          <button type="button" onClick={() => setShowPassword(s => !s)}
            style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem" }}>
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>
        <FieldError name="password" />
        {password.length > 0 && !fieldErrors.password && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
            <div style={{ flex: 1, height: 4, backgroundColor: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                width: `${(strength.score / 4) * 100}%`,
                height: "100%",
                backgroundColor: strength.score <= 1 ? "var(--danger)" : strength.score === 2 ? "#f59e0b" : "var(--primary)",
                transition: "width 0.2s",
              }} />
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", minWidth: 70 }}>{strength.label}</span>
          </div>
        )}
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <label style={labelStyle}>{isAr ? "تأكيد كلمة المرور" : "Confirm Password"}</label>
        <input ref={refs.confirmPassword} style={inputStyleFor("confirmPassword")} type="password"
          value={confirmPassword}
          onChange={e => { setConfirmPassword(e.target.value); clearFieldError("confirmPassword"); }}
          maxLength={72} aria-invalid={!!fieldErrors.confirmPassword} />
        <FieldError name="confirmPassword" />
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
          <input ref={refs.termsAccepted} id="company-terms" type="checkbox" checked={termsAccepted}
            onChange={e => { setTermsAccepted(e.target.checked); clearFieldError("termsAccepted"); }}
            style={{
              width: 16, height: 16, marginTop: "0.15rem",
              accentColor: fieldErrors.termsAccepted ? "var(--danger)" : "var(--primary)",
              flexShrink: 0, cursor: "pointer",
              outline: fieldErrors.termsAccepted ? "1.5px solid var(--danger)" : "none",
              outlineOffset: 2,
            }}
            aria-invalid={!!fieldErrors.termsAccepted} />
          <label htmlFor="company-terms" style={{ fontSize: "0.8125rem", color: "var(--text-muted)", cursor: "pointer", lineHeight: 1.5 }}>
            {isAr ? "أوافق على " : "I agree to the "}
            <a href={`/${locale}/terms`} target="_blank" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
              {isAr ? "الشروط والأحكام" : "Terms & Conditions"}
            </a>
            {isAr ? " و" : " and "}
            <a href={`/${locale}/privacy`} target="_blank" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
              {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
            </a>
          </label>
        </div>
        <FieldError name="termsAccepted" />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full"
        style={{ width: "100%", height: 48, fontSize: "1rem", justifyContent: "center", marginBottom: "0.75rem" }}>
        {loading ? (isAr ? "جارٍ الإرسال..." : "Submitting...") : (isAr ? "متابعة → التحقق" : "Continue → Verify")}
      </button>
    </form>
  );
}
