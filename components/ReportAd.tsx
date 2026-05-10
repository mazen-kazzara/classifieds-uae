"use client";
import { useState } from "react";

const REASONS = [
  { value: "SPAM", ar: "إعلان مزعج (سبام)", en: "Spam" },
  { value: "FAKE_AD", ar: "إعلان مزيّف", en: "Fake ad" },
  { value: "PROHIBITED_CONTENT", ar: "محتوى محظور", en: "Prohibited content" },
  { value: "WRONG_CATEGORY", ar: "فئة خاطئة", en: "Wrong category" },
  { value: "DUPLICATE", ar: "إعلان مكرر", en: "Duplicate ad" },
  { value: "SCAM_FRAUD", ar: "احتيال أو نصب", en: "Scam / Fraud" },
  { value: "OFFENSIVE_LANGUAGE", ar: "لغة مسيئة", en: "Offensive language" },
  { value: "ILLEGAL_ITEM", ar: "منتج غير قانوني", en: "Illegal item" },
  { value: "MISLEADING_INFO", ar: "معلومات مضللة", en: "Misleading info" },
  { value: "OTHER", ar: "سبب آخر", en: "Other" },
];

export default function ReportAd({ adId, locale = "ar" }: { adId: string; locale?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const isAr = locale === "ar";

  async function handleSubmit() {
    if (!reason) { setError(isAr ? "يرجى اختيار سبب البلاغ" : "Please select a reason"); return; }
    setLoading(true); setError("");
    try {
      const adUrl = window.location.href;
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adId, adUrl, reason, details: details || null, reporterName: name || null, reporterEmail: email || null, reporterPhone: phone || null }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (data.error === "RATE_LIMIT") setError(isAr ? "تم إرسال بلاغات كثيرة. حاول لاحقاً." : "Too many reports. Try again later.");
        else setError(isAr ? "حدث خطأ" : "Something went wrong");
        return;
      }
      setDone(true);
    } catch { setError(isAr ? "حدث خطأ" : "Something went wrong"); }
    finally { setLoading(false); }
  }

  // WhatsApp report link
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const waText = encodeURIComponent(`بلاغ على إعلان:\n${currentUrl}\nالسبب: ${REASONS.find(r => r.value === reason)?.[isAr ? "ar" : "en"] || ""}\n${details || ""}`);
  const waLink = `https://wa.me/971541807675?text=${waText}`;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: "0.375rem",
          padding: "0.375rem 0.75rem", borderRadius: "var(--radius-md)",
          border: "1.5px solid var(--danger)", backgroundColor: "transparent",
          color: "var(--danger)", fontSize: "0.75rem", fontWeight: 600,
          cursor: "pointer", transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--danger) 10%, var(--surface))"; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        {isAr ? "إبلاغ" : "Report"}
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        onClick={() => !loading && setOpen(false)}>
        <div onClick={e => e.stopPropagation()} style={{
          backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)",
          padding: "1.5rem", width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto",
        }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✅</div>
              <h3 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.125rem", marginBottom: "0.5rem" }}>
                {isAr ? "تم إرسال البلاغ" : "Report Submitted"}
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
                {isAr ? "شكراً لمساعدتنا في الحفاظ على جودة المنصة." : "Thank you for helping us maintain platform quality."}
              </p>
              <button onClick={() => { setOpen(false); setDone(false); setReason(""); setDetails(""); }}
                className="btn-primary" style={{ height: 40, padding: "0 1.5rem", fontSize: "0.875rem" }}>
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          ) : (
            <>
              <h3 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.125rem", marginBottom: "0.25rem" }}>
                {isAr ? "الإبلاغ عن هذا الإعلان" : "Report this ad"}
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: "1rem" }}>
                {isAr ? "اختر سبب البلاغ وأضف تفاصيل إذا أردت." : "Select a reason and add details if you wish."}
              </p>

              {error && (
                <div style={{ backgroundColor: "color-mix(in srgb, var(--danger) 10%, var(--surface))", border: "1.5px solid var(--danger)", borderRadius: "var(--radius-md)", padding: "0.5rem 0.75rem", marginBottom: "0.75rem", color: "var(--danger)", fontSize: "0.8125rem" }}>
                  {error}
                </div>
              )}

              {/* Reason MCQ */}
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.5rem" }}>
                {isAr ? "سبب البلاغ *" : "Reason *"}
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", marginBottom: "1rem" }}>
                {REASONS.map(r => (
                  <label key={r.value} style={{
                    display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)", border: `1.5px solid ${reason === r.value ? "var(--primary)" : "var(--border)"}`,
                    backgroundColor: reason === r.value ? "color-mix(in srgb, var(--primary) 8%, var(--surface))" : "var(--surface)",
                    cursor: "pointer", fontSize: "0.8125rem", color: "var(--text)", transition: "all 0.1s",
                  }}>
                    <input type="radio" name="reason" value={r.value} checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      style={{ accentColor: "var(--primary)", width: 16, height: 16 }} />
                    {isAr ? r.ar : r.en}
                  </label>
                ))}
              </div>

              {/* Details */}
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.375rem" }}>
                {isAr ? "تفاصيل إضافية (اختياري)" : "Additional details (optional)"}
              </label>
              <textarea
                value={details} onChange={e => setDetails(e.target.value)} maxLength={1000} rows={3}
                placeholder={isAr ? "اكتب تفاصيل إضافية هنا..." : "Write additional details here..."}
                style={{
                  width: "100%", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)",
                  border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)",
                  color: "var(--text)", fontSize: "0.8125rem", resize: "none", outline: "none", boxSizing: "border-box",
                }}
              />

              {/* Reporter info (optional) */}
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.75rem", marginBottom: "0.375rem" }}>
                {isAr ? "معلومات الاتصال (اختياري — للمتابعة)" : "Contact info (optional — for follow-up)"}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.375rem", marginBottom: "1rem" }}>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={isAr ? "الاسم" : "Name"} maxLength={100}
                  style={{ padding: "0.375rem 0.625rem", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)", color: "var(--text)", fontSize: "0.75rem", outline: "none", boxSizing: "border-box" }} />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={isAr ? "رقم الهاتف" : "Phone"} maxLength={20}
                  style={{ padding: "0.375rem 0.625rem", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)", color: "var(--text)", fontSize: "0.75rem", outline: "none", boxSizing: "border-box" }} />
              </div>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder={isAr ? "البريد الإلكتروني" : "Email"} maxLength={200} type="email"
                style={{ width: "100%", padding: "0.375rem 0.625rem", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)", color: "var(--text)", fontSize: "0.75rem", outline: "none", marginBottom: "1rem", boxSizing: "border-box" }} />

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={handleSubmit} disabled={loading} className="btn-primary"
                  style={{ flex: 1, height: 40, fontSize: "0.8125rem", fontWeight: 700, opacity: loading ? 0.6 : 1 }}>
                  {loading ? (isAr ? "جارٍ الإرسال..." : "Sending...") : (isAr ? "إرسال البلاغ" : "Submit Report")}
                </button>
                <a href={waLink} target="_blank" rel="noopener noreferrer"
                  style={{
                    height: 40, padding: "0 0.75rem", display: "flex", alignItems: "center", gap: "0.375rem",
                    borderRadius: "var(--radius-md)", backgroundColor: "#25D366", color: "#fff",
                    fontSize: "0.75rem", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
                  }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                  WhatsApp
                </a>
              </div>

              <button onClick={() => setOpen(false)} style={{
                width: "100%", marginTop: "0.5rem", height: 36, border: "none", background: "none",
                color: "var(--text-muted)", fontSize: "0.8125rem", cursor: "pointer",
              }}>
                {isAr ? "إلغاء" : "Cancel"}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
