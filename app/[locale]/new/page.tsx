"use client";
import { useState, useEffect, Suspense } from "react";
import { useTranslations, useLocale } from "@/lib/useTranslations";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Category { id: string; name: string; nameAr: string; slug: string; icon?: string; }
interface Package { id: string; name: string; nameAr: string; description?: string; price: number; durationDays: number; maxChars: number; maxImages: number; isFeatured: boolean; isPinned: boolean; includesTelegram: boolean; promoEndDate?: string | null; isPromoActive?: boolean; }

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

// Display durations for UI (Free shows 3 days for UX, backend stores 14)
function getDisplayDuration(planName: string): number {
  switch (planName) {
    case "Free": return 3;
    case "Basic": return 7;
    case "Standard": return 14;
    case "Premium": return 30;
    default: return 14;
  }
}

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
  const locale2 = useLocale();

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
  const [images, setImages] = useState<(File | null)[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isAdminUser, setIsAdminUser] = useState(false);

  const maxChars = selectedPackage?.maxChars ?? 150;
  const maxImages = selectedPackage?.maxImages ?? 1;
  const packagePrice = selectedPackage?.price ?? 0;
  const isFree = packagePrice === 0;
  const imgCount = images.filter(Boolean).length;

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
      const allPkgs = pkgs.packages || [];
      setPackages(allPkgs);
      // Pre-select: from URL param, or default to Standard
      if (presetPkg) {
        const found = allPkgs.find((p: Package) => p.id === presetPkg);
        if (found) { setSelectedPackage(found); setImages(Array(found.maxImages).fill(null)); }
      } else {
        const standard = allPkgs.find((p: Package) => p.name === "Standard");
        if (standard) { setSelectedPackage(standard); setImages(Array(standard.maxImages).fill(null)); }
      }
    });
  }, [sp]);

  // Update image slots when package changes
  function selectPackage(pkg: Package) {
    setSelectedPackage(pkg);
    setImages(Array(pkg.maxImages).fill(null));
    // Clear description if it exceeds new limit
    if (description.length > pkg.maxChars) {
      setDescription(description.slice(0, pkg.maxChars));
    }
  }

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
    if (description.trim().length > maxChars) errs.description = locale === "ar" ? `الوصف يجب أن لا يتجاوز ${maxChars} حرف` : `Description must be under ${maxChars} characters`;
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
      setSubmissionId(data.submissionId);
      if (data.isAdmin) {
        // Admin users skip plan selection — they have the unlimited package auto-assigned
        setIsAdminUser(true);
        setSelectedPackage({ id: "admin-unlimited", name: "Admin Unlimited", nameAr: "إدارة بلا حدود", price: 0, durationDays: 365, maxChars: 99999, maxImages: 99, isFeatured: true, isPinned: true, includesTelegram: true } as Package);
        setImages(Array(20).fill(null)); // generous image slots
        setStep("details");
      } else {
        setStep("package");
      }
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
      if (!textData.ok) { if (textData.field) setFieldErrors(e => ({ ...e, [textData.field]: textData.error })); throw new Error(textData.message || textData.error || "Failed"); }
      const contactData = await safeJson(await fetch(`/api/submissions/${submissionId}/contact`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactPhone, whatsappNumber: whatsappNumber || null, contactMethod, contentType, offerStartDate: offerStartDate || null, offerEndDate: offerEndDate || null, bookingEnabled, bookingType, publishTarget: publishPlatforms.join("+") }),
      }), "contact");
      if (!contactData.ok) throw new Error("Failed to save contact");

      // Upload images
      const validImages = images.filter((f): f is File => f !== null);
      for (let i = 0; i < validImages.length; i++) {
        const f = new FormData();
        f.append("file", validImages[i]);
        f.append("position", String(i + 1));
        await fetch(`/api/submissions/${submissionId}/images`, { method: "POST", body: f });
      }

      await createPayment();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setLoading(false); }
  }

  async function createPayment() {
    setLoading(true);
    setError("");
    try {
      const resPkg = await fetch(`/api/submissions/${submissionId}/package`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selectedPackage?.id ?? null })
      });
      if (!resPkg.ok) throw new Error("Failed to save package");

      await new Promise(r => setTimeout(r, 500));

      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      const data = await res.json();

      if (data.free) {
        router.push(`/success?submissionId=${submissionId}&free=true`);
        return;
      }
      if (!data.checkoutUrl) throw new Error(data.error || "No payment URL");
      window.location.href = data.checkoutUrl;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  const STEPS: Record<string, number> = { type: 1, package: 2, details: 3, done: 4 };

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

        {/* STEP 1: Type & Phone */}
        {step === "type" && (
          <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem" }} className="shadow-card">
            <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.25rem", marginBottom: "1.25rem" }}>{t("whatToPost")}</h2>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[{ id: "ad", label: t("adType"), desc: t("adDesc") }, { id: "offer", label: t("offerType"), desc: t("offerDesc") }, { id: "service", label: t("serviceType"), desc: t("serviceDesc") }].map((tp) => (
                <button key={tp.id} onClick={() => setContentType(tp.id as any)}
                  style={{ padding: "1rem 0.75rem", borderRadius: "var(--radius-md)", border: `2px solid ${contentType === tp.id ? "var(--primary)" : "var(--border)"}`, backgroundColor: contentType === tp.id ? "color-mix(in srgb, var(--primary) 10%, var(--surface))" : "var(--surface)", textAlign: "start", cursor: "pointer", transition: "all 0.15s" }}>
                  <p style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.875rem" }}>{tp.label}</p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: "0.125rem" }}>{tp.desc}</p>
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

        {/* STEP 2: Package Selection */}
        {step === "package" && (
          <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem" }}>
            <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.375rem" }}>{t("choosePlan")}</h2>
            <p style={{ ...hintStyle, marginBottom: "1.5rem" }}>{locale === "ar" ? "اختر الخطة المناسبة لك" : "Select the plan that works best for you"}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" style={{ marginBottom: "1.5rem" }}>
              {packages.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;
                const isStandard = pkg.name === "Standard";
                const isUAEFlag = pkg.name === "UAE Flag";
                const isHighlighted = isStandard || isUAEFlag;
                const isPromo = isUAEFlag && pkg.isPromoActive;

                return (
                  <button key={pkg.id} onClick={() => selectPackage(pkg)}
                    style={{
                      padding: "1rem 0.75rem", borderRadius: "var(--radius-md)",
                      border: `2px solid ${isSelected ? "var(--primary)" : isHighlighted ? "color-mix(in srgb, var(--primary) 40%, var(--border))" : "var(--border)"}`,
                      backgroundColor: isSelected ? "color-mix(in srgb, var(--primary) 8%, var(--surface))" : "var(--surface)",
                      textAlign: "start", cursor: "pointer", transition: "all 0.15s",
                      position: "relative", display: "flex", flexDirection: "column", alignItems: "stretch",
                    }}>
                    {isStandard && (
                      <span style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", fontSize: "0.55rem", fontWeight: 700, backgroundColor: "var(--primary)", color: "#fff", padding: "0.15rem 0.5rem", borderRadius: 999, whiteSpace: "nowrap" }}>
                        {locale === "ar" ? "الأفضل قيمة" : "Best Value"}
                      </span>
                    )}
                    {isPromo && (
                      <span style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", fontSize: "0.5rem", fontWeight: 700, backgroundColor: "#D4AF37", color: "#000", padding: "0.15rem 0.4rem", borderRadius: 999, whiteSpace: "nowrap" }}>
                        {locale === "ar" ? "عرض الإطلاق" : "Launch Offer"}
                      </span>
                    )}
                    <p style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.875rem", display: "flex", alignItems: "center" }}>{isUAEFlag && <img src="https://flagcdn.com/w40/ae.png" alt="UAE" style={{ width: 18, height: 12, marginInlineEnd: "0.3rem", borderRadius: 2 }} />}{locale === "ar" ? pkg.nameAr : pkg.name}</p>
                    {isPromo && (
                      <p style={{ fontSize: "0.55rem", color: "#D4AF37", fontWeight: 600, marginTop: "-0.25rem", marginBottom: "0.125rem" }}>
                        {locale === "ar" ? "مجاني حتى 1 مايو" : "Free until May 1st"}
                      </p>
                    )}
                    <p style={{ fontSize: "1.375rem", fontWeight: 800, color: isSelected ? "var(--primary)" : "var(--text)", margin: "0.375rem 0 0.5rem" }}>
                      {pkg.price === 0 ? (locale === "ar" ? "مجاني" : "Free") : <>{pkg.price} <span style={{ fontSize: "0.7rem", fontWeight: 600 }}>{locale === "ar" ? "د.إ" : "AED"}</span></>}
                    </p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, marginTop: "auto", color: "var(--text-muted)", fontSize: "0.68rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      <li>✓ {locale === "ar" ? `${pkg.maxChars} حرف` : `${pkg.maxChars} chars`}</li>
                      <li>✓ {pkg.maxImages === 1
                        ? (locale === "ar" ? "صورة واحدة" : "1 image")
                        : (locale === "ar" ? `${pkg.maxImages} صور` : `${pkg.maxImages} images`)}</li>
                    </ul>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Price Summary */}
            <div style={{ backgroundColor: "var(--surface-2)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", padding: "1rem", marginBottom: "1rem" }}>
              {selectedPackage && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                    <span>{locale === "ar" ? selectedPackage.nameAr : selectedPackage.name}</span>
                    <span>{selectedPackage.maxChars} {locale === "ar" ? "حرف" : "chars"} · {selectedPackage.maxImages === 1 ? (locale === "ar" ? "صورة واحدة" : "1 image") : `${selectedPackage.maxImages} ${locale === "ar" ? "صور" : "images"}`}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                    <span>{locale === "ar" ? "المدة" : "Duration"}</span>
                    <span>{getDisplayDuration(selectedPackage.name)} {locale === "ar" ? "أيام" : "days"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "var(--text)", fontSize: "1rem", paddingTop: "0.5rem", borderTop: "1.5px solid var(--border)" }}>
                    <span>{t("total")}</span>
                    <span style={{ color: "var(--primary)" }}>
                      {packagePrice === 0 ? (locale === "ar" ? "مجاني" : "Free") : `${packagePrice} ${locale === "ar" ? "د.إ" : "AED"}`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Publishing sentence */}
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              {locale === "ar"
                ? "يمكن نشر إعلانك على الموقع، فيسبوك، انستقرام، X، أو قناة تيليغرام — بشكل فردي أو بأي مجموعة بناءً على اختيارك."
                : "Your ad can be published to the website, Facebook, Instagram, X, or Telegram channel — individually or in any combination based on your selection."}
            </p>

            <button onClick={() => setStep("details")} className="btn-primary w-full" style={{ height: 52, fontSize: "1rem", width: "100%", justifyContent: "center" }}>
              {t("continueToDetails")}
            </button>
          </div>
        )}

        {/* STEP 3: Ad Details */}
        {step === "details" && (
          <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem" }} className="shadow-card space-y-5">
            <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.25rem" }}>{t("adDetails")}</h2>

            {/* Plan info bar */}
            <div style={{ backgroundColor: isAdminUser ? "color-mix(in srgb, #D4AF37 12%, var(--surface))" : "color-mix(in srgb, var(--primary) 8%, var(--surface))", border: `1.5px solid ${isAdminUser ? "color-mix(in srgb, #D4AF37 30%, var(--border))" : "color-mix(in srgb, var(--primary) 20%, var(--border))"}`, borderRadius: "var(--radius-md)", padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8125rem" }}>
              <span style={{ color: "var(--text)", fontWeight: 600 }}>
                {isAdminUser
                  ? (locale === "ar" ? "🔑 خطة الإدارة — بلا حدود · مجاني" : "🔑 Admin Plan — Unlimited · Free")
                  : (locale === "ar" ? "الخطة:" : "Plan:") + " " + (locale === "ar" ? selectedPackage?.nameAr : selectedPackage?.name)}
              </span>
              {!isAdminUser && (
                <button onClick={() => setStep("package")} style={{ color: "var(--primary)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: "0.8125rem" }}>
                  {locale === "ar" ? "تغيير" : "Change"}
                </button>
              )}
            </div>

            {/* Title */}
            <div>
              <label style={labelStyle}>{locale === "ar" ? "العنوان" : "Title"} <span style={{ color: "var(--danger)" }}>*</span></label>
              <input style={{ ...inputBase, ...(fieldErrors.title ? inputError : {}) }} type="text" value={title}
                onChange={(e) => { setTitle(e.target.value); setFieldErrors(fe => ({ ...fe, title: "" })); }}
                placeholder={t("titlePlaceholder")} maxLength={100}
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
                maxLength={isAdminUser ? undefined : maxChars}
                onChange={(e) => { setDescription(e.target.value); setFieldErrors(fe => ({ ...fe, description: "" })); }}
                placeholder={locale === "ar" ? "اكتب تفاصيل إعلانك هنا..." : "Describe your ad in detail…"} rows={5}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.target.style.borderColor = fieldErrors.description ? "var(--danger)" : "var(--border)")} />
              {!isAdminUser && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.25rem" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: description.length >= maxChars * 0.9 ? 600 : 400, color: description.length >= maxChars ? "var(--danger)" : description.length >= maxChars * 0.9 ? "#f59e0b" : "var(--text-muted)" }}>
                    {description.length} / {maxChars}
                  </span>
                </div>
              )}
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
                  type="text" inputMode="numeric" value={adPriceRaw}
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
                    {["whatsapp", "call", "form"].map((bt) => (
                      <button key={bt} onClick={() => setBookingType(bt)}
                        style={{ padding: "0.375rem 0.875rem", borderRadius: "var(--radius-md)", border: `1.5px solid ${bookingType === bt ? "var(--primary)" : "var(--border)"}`, backgroundColor: bookingType === bt ? "var(--primary)" : "var(--surface)", color: bookingType === bt ? "#fff" : "var(--text-muted)", fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer" }}>
                        {bt === "whatsapp" ? "WhatsApp" : bt === "call" ? (locale === "ar" ? "اتصال" : "Call") : (locale === "ar" ? "نموذج" : "Form")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Images — dynamic based on plan */}
            <div>
              <label style={labelStyle}>{locale === "ar" ? "الصور" : "Images"} <span style={hintStyle}> — {locale === "ar" ? `حتى ${maxImages} صور` : `up to ${maxImages} images`}</span></label>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(maxImages, 3)}, 1fr)`, gap: "0.75rem" }}>
                {images.map((file, i) => {
                  const labelText = locale === "ar" ? `صورة ${i + 1}` : `Image ${i + 1}`;
                  return (
                    <label key={i} style={{ cursor: "pointer" }}>
                      <div style={{ border: `2px dashed ${file ? "var(--primary)" : "var(--border)"}`, borderRadius: "var(--radius-md)", padding: "0.75rem", textAlign: "center", backgroundColor: file ? "color-mix(in srgb, var(--primary) 8%, var(--surface))" : "var(--surface-2)", transition: "all 0.15s", minHeight: 80, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        {file ? (
                          <div>
                            <p style={{ color: "var(--primary)", fontSize: "0.8rem", fontWeight: 600 }}>✓ {labelText}</p>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.65rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>{file.name}</p>
                            <button onClick={(e) => { e.preventDefault(); const newImgs = [...images]; newImgs[i] = null; setImages(newImgs); }} style={{ color: "var(--danger)", fontSize: "0.7rem", marginTop: "0.25rem", background: "none", border: "none", cursor: "pointer" }}>{locale === "ar" ? "حذف" : "Remove"}</button>
                          </div>
                        ) : (
                          <div>
                            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>+</p>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{labelText}</p>
                          </div>
                        )}
                        <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => { const newImgs = [...images]; newImgs[i] = e.target.files?.[0] ?? null; setImages(newImgs); }} />
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Publish platforms */}
            <div>
              <label style={labelStyle}>{t("publishTo")}</label>
              <p style={{ ...hintStyle, marginBottom: "0.75rem" }}>{locale === "ar" ? "اختر منصة واحدة أو أكثر لنشر إعلانك:" : "Select one or more platforms to publish your ad:"}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {([
                  { key: "website",   ar: "الموقع",     en: "Website" },
                  { key: "telegram",  ar: "تيليغرام",   en: "Telegram" },
                  { key: "facebook",  ar: "فيسبوك",    en: "Facebook" },
                  { key: "instagram", ar: "انستقرام",   en: "Instagram" },
                  { key: "x",         ar: "X",          en: "X" },
                ] as const).map((p) => {
                  const isOn = publishPlatforms.includes(p.key);
                  const label = locale === "ar" ? p.ar : p.en;
                  return (
                    <button key={p.key} type="button"
                      onClick={() => {
                        setPublishPlatforms(prev =>
                          prev.includes(p.key) ? prev.filter(x => x !== p.key) : [...prev, p.key]
                        );
                      }}
                      style={{
                        height: 44, borderRadius: "var(--radius-md)",
                        border: `1.5px solid ${isOn ? "var(--primary)" : "var(--border)"}`,
                        backgroundColor: isOn ? "color-mix(in srgb, var(--primary) 10%, var(--surface))" : "var(--surface)",
                        color: isOn ? "var(--primary)" : "var(--text-muted)",
                        fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer",
                        transition: "all 0.15s",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
                      }}>
                      {isOn ? "✓ " : ""}{label}
                    </button>
                  );
                })}
              </div>
              {fieldErr(fieldErrors, "publishTarget")}
            </div>

            <button onClick={saveDetails} disabled={loading} className="btn-primary w-full" style={{ height: 48, fontSize: "0.9375rem", width: "100%", justifyContent: "center" }}>
              {loading ? t("processing") : isFree ? t("publishFree") : t("payPublish", { amount: String(packagePrice) })}
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
