"use client";
import { useEffect, useState } from "react";
import { useAdminLocale } from "../useAdminLocale";

const inputStyle: React.CSSProperties = { width: "100%", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)", color: "var(--text)", fontSize: "0.8125rem", outline: "none", boxSizing: "border-box" };

export default function PricingPage() {
  const { t } = useAdminLocale();
  const [textPrice, setTextPrice] = useState(3);
  const [imagePrice, setImagePrice] = useState(2);
  const [adDurationDays, setAdDurationDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

  useEffect(() => {
    fetch("/api/admin/pricing", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => { if (d.ok) { setTextPrice(d.pricing.textPrice); setImagePrice(d.pricing.imagePrice); setAdDurationDays(d.pricing.adDurationDays); } setLoading(false); });
  }, [adminKey]);

  async function handleSave() {
    setSaving(true); setMsg("");
    const d = await (await fetch("/api/admin/pricing", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ textPrice, imagePrice, adDurationDays }) })).json();
    setSaving(false);
    setMsg(d.ok ? t("Saved successfully", "تم الحفظ بنجاح") : t("Error saving", "خطأ في الحفظ"));
  }

  if (loading) return <p style={{ color: "var(--text-muted)", padding: "2rem" }}>{t("Loading...", "جارٍ التحميل...")}</p>;

  return (
    <div style={{ maxWidth: 520 }}>
      <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.5rem", marginBottom: "1.25rem" }}>{t("Pricing Configuration", "إعدادات التسعير")}</h1>
      <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem", display: "block" }}>{t("Text Price (AED per 70 chars)", "سعر النص (د.إ لكل 70 حرف)")}</label>
            <input style={inputStyle} type="number" min="0" value={textPrice} onChange={e => setTextPrice(Number(e.target.value))} />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem", display: "block" }}>{t("Image Price (AED per image)", "سعر الصورة (د.إ لكل صورة)")}</label>
            <input style={inputStyle} type="number" min="0" value={imagePrice} onChange={e => setImagePrice(Number(e.target.value))} />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem", display: "block" }}>{t("Default Duration (days)", "المدة الافتراضية (أيام)")}</label>
            <input style={inputStyle} type="number" min="1" max="365" value={adDurationDays} onChange={e => setAdDurationDays(Number(e.target.value))} />
          </div>
          {msg && <div style={{ backgroundColor: "color-mix(in srgb, var(--primary) 10%, var(--surface))", border: "1.5px solid var(--primary)", borderRadius: "var(--radius-md)", padding: "0.5rem 0.75rem", color: "var(--primary)", fontSize: "0.8125rem" }}>{msg}</div>}
          <button onClick={handleSave} disabled={saving}
            style={{ width: "100%", height: 40, borderRadius: "var(--radius-md)", backgroundColor: "var(--primary)", color: "#fff", border: "none", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
            {saving ? t("Saving...", "جارٍ الحفظ...") : t("Save Changes", "حفظ التغييرات")}
          </button>
        </div>
      </div>
    </div>
  );
}
