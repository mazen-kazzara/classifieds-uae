"use client";
import { useState, useEffect, Suspense } from "react";
import { useTranslations, useLocale } from "@/lib/useTranslations";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Category { id: string; name: string; nameAr: string; slug: string; icon?: string; }
interface Package { id: string; name: string; nameAr: string; description?: string; price: number; durationDays: number; maxImages: number; isFeatured: boolean; isPinned: boolean; includesTelegram: boolean; }

const NORMAL_BASE = 10;
const IMG_PRICE = 2.5;
const NORMAL_MAX = 15;
const FEATURED_PRICE = 25;

function fmtAED(val: string): string {
  const n = val.replace(/\D/g, "");
  return n ? Number(n).toLocaleString("en-AE") : "";
}

function fieldErr(errors: Record<string, string>, field: string) {
  if (!errors[field]) return null;
  return <p style={{ color: "var(--danger)", fontSize: "0.75rem", marginTop: "0.25rem" }}>⚠ {errors[field]}</p>;
}

const inputBase: React.CSSProperties = {
  width: "100%", height: 44, padding: "0 1rem",
  backgroundColor: "var(--surface)", color: "var(--text)",
  border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)",
  fontSize: "0.875rem", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  textAlign: "inherit",
};
const inputError: React.CSSProperties = { borderColor: "var(--danger)" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" };
const hintStyle: React.CSSProperties = { fontSize: "0.75rem", color: "var(--text-muted)" };

function NewAdForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("new");
  const [step, setStep] = useState<"type" | "details" | "package" | "done">("type");
  const [contentType, setContentType] = useState<"ad" | "offer" | "service">((sp.get("type") as any) || "ad");
  const [submissionId, setSubmissionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: session, status: authStatus } = useSession();
  const sessionPhone = (session?.user as any)?.phone ?? "";
  const phoneVerified = (session?.user as any)?.phoneVerified ?? false;
  const locale2 = useLocale();

  // ── Auth gate ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push(`/${locale2}/login?redirect=/new`);
    }
  }, [authStatus, router, locale2]);

  const [phone, setPhone] = useState("971");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [adPriceRaw, setAdPriceRaw] = useState("");
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [contactPhone, setContactPhone] = useState("971");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [contactMethod, setContactMethod] = useState<"call"|"whatsapp"|"both">("call");
  const [offerStartDate, setOfferStartDate] = useState("");
  const [offerEndDate, setOfferEndDate] = useState("");
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [bookingType, setBookingType] = useState("whatsapp");
  const [publishPlatforms, setPublishPlatforms] = useState<string[]>(["website"]);
  const [img1, setImg1] = useState<File | null>(null);
  const [img2, setImg2] = useState<File | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("free");

  // Pre-fill phone from session
  useEffect(() => {
    if (sessionPhone) { setPhone(sessionPhone); setContactPhone(sessionPhone); }
  }, [sessionPhone]);

  useEffect(() => {
    const presetPkg = sp.get("packageId");
    Promise.all([
      fetch("/api/public/categories").then(r => r.json()),
      fetch("/api/public/packages").then(r => r.json()),
    ]).then(([cats, pkgs]) => {
      setCategories(cats.categories || []);
      setPackages(pkgs.packages || []);
      if (presetPkg && pkgs.packages) {
        const found = pkgs.packages.find((p: Package) => p.id === presetPkg);
        if (found) setSelectedPackage(found);
      }
    });
  }, [sp]);



  function validatePhone(val: string) {
    const digits = val.replace(/\D/g, "");
    if (!digits.startsWith("971") || digits.length !== 12) return "Must be a valid UAE number: 971XXXXXXXXX";
    return "";
  }

  function validateStep1() {
    const errs: Record<string, string> = {};
    const e = validatePhone(phone);
    if (e) errs.phone = e;
    setFieldErrors(errs);
    return !Object.keys(errs).length;
  }

  function validateStep2() {
    const errs: Record<string, string> = {};
    if (!title.trim() || title.trim().length < 3) errs.title = locale === "ar" ? "العنوان يجب أن يكون 3 أحرف على الأقل" : "Title must be at least 3 characters";
    if (title.trim().length > 100) errs.title = locale === "ar" ? "العنوان يجب أن لا يتجاوز 100 حرف" : "Title must be under 100 characters";
    if (!description.trim() || description.trim().length < 10) errs.description = locale === "ar" ? "الوصف يجب أن يكون 10 أحرف على الأقل" : "Description must be at least 10 characters";
    if (description.trim().length > 2000) errs.description = locale === "ar" ? "الوصف يجب أن لا يتجاوز 2000 حرف" : "Description must be under 2000 characters";
    if (!categoryId) errs.category = locale === "ar" ? "يرجى اختيار فئة" : "Please select a category";
    if (!isNegotiable) {
      if (!adPriceRaw) errs.adPrice = "Price is required unless negotiable";
      else if (isNaN(Number(adPriceRaw.replace(/,/g,""))) || Number(adPriceRaw.replace(/,/g,"")) < 0)
        errs.adPrice = "Enter a valid price";
    }
    const ce = validatePhone(contactPhone);
    if (ce) errs.contactPhone = ce;
    if (contactMethod === "whatsapp" || contactMethod === "both") {
      if (!whatsappNumber) {
        errs.whatsappNumber = "WhatsApp number is required for this contact method";
      } else {
        const we = validatePhone(whatsappNumber);
        if (we) errs.whatsappNumber = we;
      }
    } else if (whatsappNumber) {
      const we = validatePhone(whatsappNumber);
      if (we) errs.whatsappNumber = we;
    }
    if (contentType === "offer" && !offerEndDate) errs.offerEndDate = "Offer end date is required";
    if (publishPlatforms.length === 0) errs.publishTarget = locale === "ar" ? "يرجى اختيار منصة واحدة على الأقل" : "Please select at least one platform";
    setFieldErrors(errs);
    return !Object.keys(errs).length;
  }

  async function startSubmission() {
    if (!validateStep1()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/submissions/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
      const data = await res.json();
      if (!data.ok) {
        const errMap: Record<string, string> = {
          UNAUTHORIZED: locale === "ar" ? "يرجى تسجيل الدخول أولاً" : "Please sign in first",
          PHONE_REQUIRED: locale === "ar" ? "رقم الهاتف مطلوب" : "Phone number is required",
          INVALID_PHONE_FORMAT: locale === "ar" ? "صيغة رقم الهاتف غير صحيحة (971XXXXXXXXX)" : "Invalid phone format (971XXXXXXXXX)",
          DAILY_LIMIT_REACHED: locale === "ar" ? "وصلت الحد اليومي (5 إعلانات)" : "Daily limit reached (5 ads)",
          RATE_LIMIT_EXCEEDED: locale === "ar" ? "محاولات كثيرة، حاول لاحقاً" : "Too many attempts, try later",
        };
        throw new Error(errMap[data.error] || data.error || "Failed");
      }
      setSubmissionId(data.submissionId); setStep("package");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setLoading(false); }
  }

  async function saveDetails() {
    if (!validateStep2()) return;
    setLoading(true); setError("");
    try {
      const adPriceNum = adPriceRaw ? Number(adPriceRaw.replace(/,/g, "")) : null;
      async function safeJson(res: Response, label: string) {
        const text = await res.text();
        try { return JSON.parse(text); } catch { throw new Error(`${label}: invalid response`); }
      }
      await safeJson(await fetch(`/api/submissions/${submissionId}/language`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: "EN" }) }), "language");
      await safeJson(await fetch(`/api/submissions/${submissionId}/category`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId }) }), "category");
      const textData = await safeJson(await fetch(`/api/submissions/${submissionId}/text`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: description, title, adPrice: adPriceNum, isNegotiable }),
      }), "text");
      if (!textData.ok) { if (textData.field) setFieldErrors(e => ({ ...e, [textData.field]: textData.error })); throw new Error(textData.error || "Failed"); }
      const contactData = await safeJson(await fetch(`/api/submissions/${submissionId}/contact`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactPhone, whatsappNumber: whatsappNumber || null, contactMethod, contentType, offerStartDate: offerStartDate || null, offerEndDate: offerEndDate || null, bookingEnabled, bookingType, publishTarget: publishPlatforms.join("+") }),
      }), "contact");
      if (!contactData.ok) throw new Error("Failed to save contact");
      if (img1) { const f = new FormData(); f.append("file", img1); f.append("position", "1"); await fetch(`/api/submissions/${submissionId}/images`, { method: "POST", body: f }); }
      if (img2) { const f = new FormData(); f.append("file", img2); f.append("position", "2"); await fetch(`/api/submissions/${submissionId}/images`, { method: "POST", body: f }); }
      await createPayment();
      return;
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setLoading(false); }
  }


async function createPayment() {
  setLoading(true);
  setError("");

  try {
    // SAVE PACKAGE FIRST
    const pkg = getSubmitPackage();
    if (isFree && imgCount > 0) { setError(locale === "ar" ? "الخطة المجانية لا تدعم الصور. احذف الصور أو اختر خطة عادية/مميزة." : "Free plan does not support images. Remove images or choose Normal/Featured."); setLoading(false); return; }
    const resPkg = await fetch(`/api/submissions/${submissionId}/package`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId: pkg?.id ?? null })
    });

    if (!resPkg.ok) {
      throw new Error("Failed to save package");
    }

    // FORCE DB SYNC (critical)
    await new Promise(r => setTimeout(r, 500));

    // CREATE PAYMENT
    const res = await fetch("/api/payments/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ submissionId }),
    });

    const data = await res.json();

    // FREE FLOW
    if (data.free) {
      router.push(`/success?submissionId=${submissionId}&free=true`);
      return;
    }

    // PAID FLOW
    if (!data.checkoutUrl) {
      throw new Error(data.error || "No payment URL");
    }

    window.location.href = data.checkoutUrl;

  } catch (e: unknown) {
    setError(e instanceof Error ? e.message : "Payment failed");
  } finally {
    setLoading(false);
  }
}  

  const STEPS: Record<string, number> = { type: 1, package: 2, details: 3, done: 4 };
  const charCount = description.replace(/[^A-Za-z0-9\u0600-\u06FF]/g, "").length;
  const imgCount = (img1 ? 1 : 0) + (img2 ? 1 : 0);
  const isFree = selectedPlan === "free";
  const isNormal = selectedPlan === "normal";
  const isFeaturedPlan = selectedPlan === "featured";
  const normalPkg = packages.find((p: Package) => p.name === "Normal");
  const featuredPkg = packages.find((p: Package) => p.isFeatured);
  const normalImgCost = imgCount * IMG_PRICE;
  const normalTotal = Math.min(NORMAL_BASE + normalImgCost, NORMAL_MAX);
  function getDisplayTotal() {
    if (isFree) return 0;
    if (selectedPackage) {
      if (selectedPackage.isFeatured) return selectedPackage.price;
      return Math.min(selectedPackage.price + normalImgCost, selectedPackage.price + 5);
    }
    if (isNormal) return normalTotal;
    return FEATURED_PRICE;
  }
  function getSubmitPackage() {
    if (isFree) return null;
    return selectedPackage || null;
  }

  // ── Loading / not authenticated ───────────────────────────────────────────
  if (authStatus === "loading") return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>Loading…</div>
  );
  if (authStatus === "unauthenticated") return null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }} dir={locale === "ar" ? "rtl" : "ltr"}>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8" style={{ textAlign: locale === "ar" ? "right" : "left" }}>
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {(["type", "package", "details", "done"] as const).map((stepKey, i) => {
            const label = [t("stepType"), t("stepPlan"), t("stepDetails"), t("stepPublish")][i];
            const isCompleted = STEPS[step] > i + 1;
            const isActive = STEPS[step] === i + 1;
            const isClickable = isCompleted && stepKey !== "done";
            return (
              <div key={label} className="flex items-center gap-1.5 flex-1">
                <div
                  onClick={() => { if (isClickable) setStep(stepKey); }}
                  style={{
                    width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.8125rem", fontWeight: 700, flexShrink: 0,
                    backgroundColor: isCompleted || isActive ? "var(--primary)" : "var(--surface-2)",
                    color: isCompleted || isActive ? "#fff" : "var(--text-muted)",
                    border: `1.5px solid ${isCompleted || isActive ? "var(--primary)" : "var(--border)"}`,
                    cursor: isClickable ? "pointer" : "default",
                    transition: "transform 0.15s",
                  }}
                  title={isClickable ? `Go back to ${label}` : undefined}
                  onMouseEnter={e => { if (isClickable) (e.currentTarget as HTMLElement).style.transform = "scale(1.15)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                >
                  {isCompleted ? "✓" : i + 1}
                </div>
                <span style={{ color: isActive ? "var(--primary)" : "var(--text-muted)", fontSize: "0.75rem", fontWeight: 500 }} className="hidden sm:block">{label}</span>
                {i < 3 && <div style={{ flex: 1, height: 1.5, backgroundColor: "var(--border)" }} />}
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{ backgroundColor: "color-mix(in srgb, var(--danger) 10%, var(--surface))", border: "1.5px solid var(--danger)", borderRadius: "var(--radius-md)", padding: "0.875rem 1rem", marginBottom: "1rem", color: "var(--danger)", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        {/* STEP 1 */}
        {step === "type" && (
          <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem" }} className="shadow-card">
            <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.25rem", marginBottom: "1.25rem" }}>{t("whatToPost")}</h2>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[{ id: "ad", label: t("adType"), desc: t("adDesc") }, { id: "offer", label: t("offerType"), desc: t("offerDesc") }, { id: "service", label: t("serviceType"), desc: t("serviceDesc") }].map((t) => (
                <button key={t.id} onClick={() => setContentType(t.id as any)}
                  style={{ padding: "1rem 0.75rem", borderRadius: "var(--radius-md)", border: `2px solid ${contentType === t.id ? "var(--primary)" : "var(--border)"}`, backgroundColor: contentType === t.id ? "color-mix(in srgb, var(--primary) 10%, var(--surface))" : "var(--surface)", textAlign: "start", cursor: "pointer", transition: "all 0.15s" }}>
                  <p style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.875rem" }}>{t.label}</p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: "0.125rem" }}>{t.desc}</p>
                </button>
              ))}
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={labelStyle}>{t("phoneLabel")} <span style={{ color: "var(--danger)" }}>*</span></label>
              <input style={{ ...inputBase, ...(fieldErrors.phone ? inputError : {}) }} type="tel" inputMode="numeric" value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/[^0-9+]/g, "")); setFieldErrors(fe => ({ ...fe, phone: "" })); }}
                placeholder="971501234567"
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.target.style.borderColor = fieldErrors.phone ? "var(--danger)" : "var(--border)")} />
              {fieldErr(fieldErrors, "phone")}
              <p style={{ ...hintStyle, marginTop: "0.25rem" }}>{t("phoneFormat")}</p>
            </div>

            <button onClick={startSubmission} disabled={loading} className="btn-primary w-full" style={{ height: 48, fontSize: "0.9375rem", width: "100%", justifyContent: "center" }}>
              {loading ? t("saving") : t("continue")}
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === "details" && (
          <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem" }} className="shadow-card space-y-5">
            <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.25rem" }}>{t("adDetails")}</h2>

            {/* Title */}
            <div>
              <label style={labelStyle}>{locale === "ar" ? "العنوان" : "Title"} <span style={{ color: "var(--danger)" }}>*</span></label>
              <input style={{ ...inputBase, ...(fieldErrors.title ? inputError : {}) }} type="text" value={title}
                onChange={(e) => { setTitle(e.target.value); setFieldErrors(fe => ({ ...fe, title: "" })); }}
                placeholder={t("titlePlaceholder")} maxLength={300}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.target.style.borderColor = fieldErrors.title ? "var(--danger)" : "var(--border)")} />
              {fieldErr(fieldErrors, "title")}
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>
                {locale === "ar" ? "الوصف" : "Description"} <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <textarea style={{ ...inputBase, height: "auto", padding: "0.75rem 1rem", resize: "none", ...(fieldErrors.description ? inputError : {}) }}
                value={description}
                maxLength={300}
                onChange={(e) => { setDescription(e.target.value); setFieldErrors(fe => ({ ...fe, description: "" })); }}
                placeholder={locale === "ar" ? "اكتب تفاصيل إعلانك هنا..." : "Describe your ad in detail…"} rows={5}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.target.style.borderColor = fieldErrors.description ? "var(--danger)" : "var(--border)")} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.25rem" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: description.length >= 270 ? 600 : 400, color: description.length >= 300 ? "var(--danger)" : description.length >= 270 ? "#f59e0b" : "var(--text-muted)" }}>
                  {description.length} / 300
                </span>
              </div>
              <p style={{ ...hintStyle, marginTop: "0.25rem" }}>{charCount} {locale === "ar" ? "حرف" : "chars"}</p>
              {fieldErr(fieldErrors, "description")}
            </div>

            {/* Category */}
            <div>
              <label style={labelStyle}>{locale === "ar" ? "الفئة" : "Category"} <span style={{ color: "var(--danger)" }}>*</span></label>
              <select style={{ ...inputBase, ...(fieldErrors.category ? inputError : {}), appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center", paddingRight: "2.5rem" }}
                value={categoryId}
                onChange={(e) => { setCategoryId(e.target.value); setFieldErrors(fe => ({ ...fe, category: "" })); }}>
                <option value="">{locale === "ar" ? "اختر فئة" : "Select category"}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {locale === "ar" ? c.nameAr : c.name}</option>)}
              </select>
              {fieldErr(fieldErrors, "category")}
            </div>

            {/* Price */}
            <div>
              <label style={labelStyle}>{locale === "ar" ? "السعر (د.إ)" : "Price (AED)"} <span style={hintStyle}> — {locale === "ar" ? "اختياري" : "optional"}</span></label>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <input
                  style={{ ...inputBase, flex: 1, width: "auto" }}
                  type="text"
                  inputMode="numeric"
                  value={adPriceRaw}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, "");
                    if (/^\d*$/.test(raw)) setAdPriceRaw(raw ? Number(raw).toLocaleString("en-AE") : "");
                    setFieldErrors(fe => ({ ...fe, adPrice: "" }));
                  }}
                  placeholder={t("pricePlaceholder")}
                  onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                  onBlur={(e) => (e.target.style.borderColor = fieldErrors.adPrice ? "var(--danger)" : "var(--border)")} />
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}>
                  <input type="checkbox" checked={isNegotiable} onChange={(e) => setIsNegotiable(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--primary)" }} />
                  <span style={{ fontSize: "0.875rem", color: "var(--text)", fontWeight: 500 }}>{t("negotiable")}</span>
                </label>
              </div>
              {fieldErr(fieldErrors, "adPrice")}
              {isNegotiable && <p style={{ ...hintStyle, marginTop: "0.25rem" }}>{locale === "ar" ? "سيظهر السعر كـ «قابل للتفاوض» أو السعر مع التفاوض إذا تم تحديده." : "Price will show as Negotiable or both price + negotiable if price is set."}</p>}
            </div>

            {/* Offer dates */}
            {contentType === "offer" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Offer Start</label>
                  <input style={inputBase} type="date" value={offerStartDate} onChange={(e) => setOfferStartDate(e.target.value)}
                    onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                </div>
                <div>
                  <label style={labelStyle}>Offer End <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input style={{ ...inputBase, ...(fieldErrors.offerEndDate ? inputError : {}) }} type="date" value={offerEndDate}
                    onChange={(e) => { setOfferEndDate(e.target.value); setFieldErrors(fe => ({ ...fe, offerEndDate: "" })); }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.target.style.borderColor = fieldErrors.offerEndDate ? "var(--danger)" : "var(--border)")} />
                  {fieldErr(fieldErrors, "offerEndDate")}
                </div>
              </div>
            )}

            {/* Contact Phone */}
            <div>
              <label style={labelStyle}>{t("contactPhone")} <span style={{ color: "var(--danger)" }}>*</span></label>
              <input style={{ ...inputBase, ...(fieldErrors.contactPhone ? inputError : {}) }} type="tel" inputMode="numeric" value={contactPhone}
                onChange={(e) => { setContactPhone(e.target.value.replace(/[^0-9+]/g, "")); setFieldErrors(fe => ({ ...fe, contactPhone: "" })); }}
                placeholder="971501234567"
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.target.style.borderColor = fieldErrors.contactPhone ? "var(--danger)" : "var(--border)")} />
              {fieldErr(fieldErrors, "contactPhone")}
            </div>

            {/* WhatsApp */}
            <div>
              <label style={labelStyle}>{locale === "ar" ? "رقم واتساب" : "WhatsApp Number"} {(contactMethod === "whatsapp" || contactMethod === "both") ? <span style={{ color: "var(--danger)" }}>*</span> : <span style={hintStyle}> — {t("whatsappOptional")}</span>}</label>
              <input style={{ ...inputBase, ...(fieldErrors.whatsappNumber ? inputError : {}) }} type="tel" inputMode="numeric" value={whatsappNumber}
                onChange={(e) => { setWhatsappNumber(e.target.value.replace(/[^0-9+]/g, "")); setFieldErrors(fe => ({ ...fe, whatsappNumber: "" })); }}
                placeholder={locale === "ar" ? "971501234567 (اتركه فارغاً إذا كان نفس رقم التواصل)" : "971501234567 (leave blank if same as contact)"}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.target.style.borderColor = fieldErrors.whatsappNumber ? "var(--danger)" : "var(--border)")} />
              {fieldErr(fieldErrors, "whatsappNumber")}
            </div>

            <div>
              <label style={labelStyle}>{t("contactMethod")}</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {(["call", "whatsapp", "both"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => { setContactMethod(m); if ((m === "whatsapp" || m === "both") && !whatsappNumber) setWhatsappNumber(contactPhone); }}
                    style={{ flex: 1, height: 44, borderRadius: "var(--radius-md)", border: `1.5px solid ${contactMethod === m ? "var(--primary)" : "var(--border)"}`, backgroundColor: contactMethod === m ? "var(--primary)" : "var(--surface)", color: contactMethod === m ? "#fff" : "var(--text-muted)", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                    {m === "call" ? t("callOnly") : m === "whatsapp" ? t("whatsappOnly") : t("both")}
                  </button>
                ))}
              </div>
            </div>

            {/* Booking (service) */}
            {contentType === "service" && (
              <div style={{ backgroundColor: "color-mix(in srgb, var(--primary) 8%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--primary) 20%, var(--border))", borderRadius: "var(--radius-md)", padding: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", marginBottom: "0.75rem" }}>
                  <input type="checkbox" checked={bookingEnabled} onChange={(e) => setBookingEnabled(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--primary)" }} />
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)" }}>{locale === "ar" ? "تفعيل زر الحجز" : "Enable Booking Button"}</span>
                </label>
                {bookingEnabled && (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {["whatsapp", "call", "form"].map((t) => (
                      <button key={t} onClick={() => setBookingType(t)}
                        style={{ padding: "0.375rem 0.875rem", borderRadius: "var(--radius-md)", border: `1.5px solid ${bookingType === t ? "var(--primary)" : "var(--border)"}`, backgroundColor: bookingType === t ? "var(--primary)" : "var(--surface)", color: bookingType === t ? "#fff" : "var(--text-muted)", fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer" }}>
                        {t === "whatsapp" ? "WhatsApp" : t === "call" ? (locale === "ar" ? "اتصال" : "Call") : (locale === "ar" ? "نموذج" : "Form")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Images — only for paid plans */}
            {!isFree && <div>
              <label style={labelStyle}>{locale === "ar" ? "الصور" : "Images"} <span style={hintStyle}> — {locale === "ar" ? "2.5 د.إ لكل صورة · حد أقصى 2" : "2.5 AED each · max 2"}</span></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {([{ file: img1, setFile: setImg1, labelAr: "صورة 1", labelEn: "Image 1" }, { file: img2, setFile: setImg2, labelAr: "صورة 2", labelEn: "Image 2" }]).map(({ file, setFile, labelAr, labelEn }) => {
                  const label = locale === "ar" ? labelAr : labelEn;
                  return (
                  <label key={labelEn} style={{ cursor: "pointer" }}>
                    <div style={{ border: `2px dashed ${file ? "var(--primary)" : "var(--border)"}`, borderRadius: "var(--radius-md)", padding: "1rem", textAlign: "center", backgroundColor: file ? "color-mix(in srgb, var(--primary) 8%, var(--surface))" : "var(--surface-2)", transition: "all 0.15s" }}>
                      {file ? (
                        <div>
                          <p style={{ color: "var(--primary)", fontSize: "0.875rem", fontWeight: 600 }}>✓ {label}</p>
                          <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</p>
                          <button onClick={(e) => { e.preventDefault(); setFile(null); }} style={{ color: "var(--danger)", fontSize: "0.75rem", marginTop: "0.25rem", background: "none", border: "none", cursor: "pointer" }}>{locale === "ar" ? "حذف" : "Remove"}</button>
                        </div>
                      ) : (
                        <div>
                          <p style={{ fontSize: "0.875rem", marginBottom: "0.25rem", color: "var(--text-muted)" }}>+</p>
                          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{locale === "ar" ? "أضف " + label : "Add " + label}</p>
                          <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: "0.125rem" }}>{locale === "ar" ? "+2.5 د.إ" : "+2.5 AED"}</p>
                        </div>
                      )}
                      <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    </div>
                  </label>
                  );
                })}
              </div>
            </div>}

            {/* Publish platforms — multi-select toggles */}
            <div>
              <label style={labelStyle}>{t("publishTo")}</label>
              <p style={{ ...hintStyle, marginBottom: "0.75rem" }}>{locale === "ar" ? "اختر منصة واحدة أو أكثر لنشر إعلانك:" : "Select one or more platforms to publish your ad:"}</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {([
                  { key: "website",   ar: "الموقع",     en: "Website",  alwaysAvailable: true },
                  { key: "telegram",  ar: "تيليغرام",   en: "Telegram", alwaysAvailable: true },
                  { key: "facebook",  ar: "فيسبوك",    en: "Facebook", alwaysAvailable: false },
                  { key: "instagram", ar: "انستقرام",   en: "Instagram", alwaysAvailable: false },
                ] as const).map((p) => {
                  const isOn = publishPlatforms.includes(p.key);
                  const needsImages = !p.alwaysAvailable;
                  const disabled = needsImages && isFree;
                  const label = locale === "ar" ? p.ar : p.en;
                  return (
                    <button key={p.key} type="button" disabled={disabled}
                      onClick={() => {
                        if (disabled) return;
                        setPublishPlatforms(prev =>
                          prev.includes(p.key) ? prev.filter(x => x !== p.key) : [...prev, p.key]
                        );
                      }}
                      style={{
                        height: 44, borderRadius: "var(--radius-md)",
                        border: `1.5px solid ${disabled ? "var(--border)" : isOn ? "var(--primary)" : "var(--border)"}`,
                        backgroundColor: disabled ? "var(--surface-2)" : isOn ? "color-mix(in srgb, var(--primary) 10%, var(--surface))" : "var(--surface)",
                        color: disabled ? "var(--text-muted)" : isOn ? "var(--primary)" : "var(--text-muted)",
                        fontSize: "0.8125rem", fontWeight: 600,
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.5 : 1,
                        transition: "all 0.15s",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
                      }}>
                      {isOn && !disabled ? "✓ " : ""}{label}
                      {disabled && <span style={{ fontSize: "0.55rem", fontWeight: 700, backgroundColor: "var(--border)", color: "var(--text-muted)", padding: "0.1rem 0.35rem", borderRadius: 999, marginInlineStart: "0.25rem" }}>{locale === "ar" ? "مدفوع" : "Paid"}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <button onClick={saveDetails} disabled={loading} className="btn-primary w-full" style={{ height: 48, fontSize: "0.9375rem", width: "100%", justifyContent: "center" }}>
              {loading ? t("processing") : isFree ? t("publishFree") : t("payPublish", { amount: String(getDisplayTotal()) })}
            </button>
          </div>
        )}

        {/* STEP 3: Package */}
        {step === "package" && (
          <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem" }}>
            <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.375rem" }}>{t("choosePlan")}</h2>
            <p style={{ ...hintStyle, marginBottom: "1.5rem" }}>{locale === "ar" ? "اختر الخطة المناسبة لك" : "Select the plan that works best for you"}</p>

            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(packages.length + 1, 4)}, 1fr)`, gap: "0.75rem", marginBottom: "1.5rem" }}>
              {/* All plans: Free (no package) + DB packages, sorted by price */}
              {[
                { _isFreeSlot: true, id: "__free__", price: -1, name: "Free", nameAr: locale === "ar" ? t("planFree") : "Free", durationDays: 3, maxImages: 0, isFeatured: false, isPinned: false } as any,
                ...([...packages].filter((p: Package) => p.price > 0 || p.isFeatured).sort((a: Package, b: Package) => a.price - b.price)),
              ].map((pkg: any) => {
                const isFreeSlot = pkg._isFreeSlot === true;
                const isSelected = isFreeSlot ? isFree : selectedPackage?.id === pkg.id;

                const features: { text: string; ok: boolean }[] = [];
                features.push({ text: `${pkg.durationDays} ${locale === "ar" ? "أيام" : "days"}`, ok: true });
                if (isFreeSlot) {
                  features.push({ text: locale === "ar" ? "نص فقط" : "Text only", ok: true });
                  features.push({ text: locale === "ar" ? "بدون صور" : "No images", ok: false });
                } else {
                  if (pkg.maxImages > 0) features.push({ text: locale === "ar" ? `حتى ${pkg.maxImages} صور` : `Up to ${pkg.maxImages} images`, ok: true });
                  if (pkg.isFeatured) {
                    features.push({ text: locale === "ar" ? "مثبّت في الأعلى" : "Pinned at top", ok: true });
                    features.push({ text: locale === "ar" ? "سعر شامل" : "All-inclusive", ok: true });
                  } else if (pkg.isPinned) {
                    features.push({ text: locale === "ar" ? "مثبّت" : "Pinned", ok: true });
                  }
                  if (pkg.includesTelegram) features.push({ text: locale === "ar" ? "نشر على تيليغرام" : "Published on Telegram", ok: true });
                }

                return (
                  <button key={pkg.id} onClick={() => {
                    if (isFreeSlot) { setSelectedPlan("free"); setSelectedPackage(null); setPublishPlatforms(prev => prev.filter(p => p === "website" || p === "telegram")); }
                    else { setSelectedPlan(pkg.isFeatured ? "featured" : "normal"); setSelectedPackage(pkg); }
                  }}
                    style={{ padding: "1rem 0.75rem", borderRadius: "var(--radius-md)", border: `2px solid ${isSelected ? "var(--primary)" : "var(--border)"}`, backgroundColor: isSelected ? "color-mix(in srgb, var(--primary) 8%, var(--surface))" : "var(--surface)", textAlign: "start", cursor: "pointer", transition: "all 0.15s", position: "relative", display: "flex", flexDirection: "column", alignItems: "stretch" }}>
                    {!isFreeSlot && pkg.isFeatured && <span style={{ position: "absolute", top: "0.5rem", insetInlineEnd: "0.5rem", fontSize: "0.6rem", fontWeight: 700, backgroundColor: "var(--primary)", color: "#fff", padding: "0.1rem 0.35rem", borderRadius: 999 }}>{locale === "ar" ? "الأفضل" : "Best"}</span>}
                    <p style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.9375rem" }}>{locale === "ar" ? pkg.nameAr : pkg.name}</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)", margin: "0.375rem 0 0.625rem" }}>{isFreeSlot ? 0 : pkg.price} <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{locale === "ar" ? "د.إ" : "AED"}</span></p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, marginTop: "auto", color: "var(--text-muted)", fontSize: "0.73rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      {features.map(f => <li key={f.text} style={f.ok ? {} : { color: "var(--danger)" }}>{f.ok ? "✓" : "✗"} {f.text}</li>)}
                    </ul>
                  </button>
                );
              })}
            </div>

            {/* Price Summary */}
            <div style={{ backgroundColor: "var(--surface-2)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", padding: "1rem", marginBottom: "1.25rem" }}>
              <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.75rem", fontSize: "0.875rem" }}>{t("priceSummary")}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem" }}>
                {isFree && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                    <span>{locale === "ar" ? "خطة مجانية — نص فقط، 3 أيام" : "Free plan — text only, 3 days"}</span>
                    <span style={{ color: "var(--primary)", fontWeight: 700 }}>0 {locale === "ar" ? "د.إ" : "AED"}</span>
                  </div>
                )}
                {!isFree && selectedPackage && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                    <span>{locale === "ar" ? selectedPackage.nameAr : selectedPackage.name} — {selectedPackage.durationDays} {locale === "ar" ? "يوماً" : "days"}</span>
                    <span>{getDisplayTotal()} {locale === "ar" ? "د.إ" : "AED"}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "var(--text)", fontSize: "1rem", paddingTop: "0.5rem", borderTop: "1.5px solid var(--border)", marginTop: "0.25rem" }}>
                  <span>{t("total")}</span>
                  <span style={{ color: "var(--primary)" }}>{getDisplayTotal() === 0 ? (locale === "ar" ? "مجاني" : "Free") : `${getDisplayTotal()} ${locale === "ar" ? "د.إ" : "AED"}`}</span>
                </div>
              </div>
            </div>

            <button onClick={() => setStep("details")} className="btn-primary w-full" style={{ height: 52, fontSize: "1rem", width: "100%", justifyContent: "center" }}>
              {t("continueToDetails")}
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function NewAdPage() {
  return <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>Loading…</div>}><NewAdForm /></Suspense>;
}
