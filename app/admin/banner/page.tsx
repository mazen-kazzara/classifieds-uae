"use client";
import { useEffect, useState, useRef } from "react";
import { useAdminLocale } from "../useAdminLocale";

const cardStyle: React.CSSProperties = { backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem" };

export default function BannerPage() {
  const { t } = useAdminLocale();
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const d = await (await fetch("/api/admin/banner")).json();
    if (d.ok) setBannerUrl(d.bannerUrl);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true); setMsg("");
    const f = new FormData();
    f.append("file", file);
    const d = await (await fetch("/api/admin/banner", { method: "POST", body: f })).json();
    setUploading(false);
    if (d.ok) { setBannerUrl(d.bannerUrl); setMsg(t("Banner updated", "تم تحديث البانر")); if (fileRef.current) fileRef.current.value = ""; }
    else setMsg(t("Upload failed", "فشل الرفع"));
  }

  async function handleDelete() {
    if (!confirm(t("Remove banner?", "إزالة البانر؟"))) return;
    await fetch("/api/admin/banner", { method: "DELETE" });
    setBannerUrl(null);
    setMsg(t("Banner removed", "تم إزالة البانر"));
  }

  if (loading) return <p style={{ color: "var(--text-muted)" }}>{t("Loading...", "جارٍ التحميل...")}</p>;

  return (
    <div>
      <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.5rem", marginBottom: "1.25rem" }}>{t("Hero Banner", "بانر الصفحة الرئيسية")}</h1>

      {msg && <div style={{ backgroundColor: "color-mix(in srgb, var(--primary) 10%, var(--surface))", border: "1.5px solid var(--primary)", borderRadius: "var(--radius-md)", padding: "0.625rem 1rem", marginBottom: "1rem", color: "var(--primary)", fontSize: "0.8125rem", cursor: "pointer" }} onClick={() => setMsg("")}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {/* Upload */}
        <div style={cardStyle}>
          <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "0.9375rem", marginBottom: "1rem" }}>{t("Upload Banner Image", "رفع صورة البانر")}</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "1rem" }}>
            {t("Recommended size: 1200×400px. JPG, PNG, or WebP.", "الحجم الموصى به: 1200×400 بكسل. JPG أو PNG أو WebP.")}
          </p>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
            style={{ marginBottom: "1rem", fontSize: "0.8125rem", color: "var(--text-muted)" }} />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={handleUpload} disabled={uploading}
              style={{ height: 40, padding: "0 1.25rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--primary)", color: "#fff", border: "none", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer", opacity: uploading ? 0.5 : 1 }}>
              {uploading ? t("Uploading...", "جارٍ الرفع...") : t("Upload", "رفع")}
            </button>
            {bannerUrl && (
              <button onClick={handleDelete}
                style={{ height: 40, padding: "0 1.25rem", borderRadius: "var(--radius-md)", border: "1.5px solid var(--danger)", backgroundColor: "var(--surface)", color: "var(--danger)", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer" }}>
                {t("Remove Banner", "إزالة البانر")}
              </button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div style={cardStyle}>
          <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "0.9375rem", marginBottom: "1rem" }}>{t("Current Banner", "البانر الحالي")}</h2>
          {bannerUrl ? (
            <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bannerUrl} alt="Banner" style={{ width: "100%", height: "auto", display: "block" }} />
            </div>
          ) : (
            <div style={{ padding: "3rem", textAlign: "center", backgroundColor: "var(--surface-2)", borderRadius: "var(--radius-md)", border: "1.5px dashed var(--border)" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>{t("No banner set", "لا يوجد بانر")}</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: "0.25rem" }}>{t("The hero section will show the default text.", "سيظهر النص الافتراضي في القسم الرئيسي.")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
