"use client";
import { useEffect, useState } from "react";
import { useAdminLocale } from "../useAdminLocale";

interface Package { id: string; name: string; nameAr: string; price: number; durationDays: number; maxImages: number; isFeatured: boolean; isPinned: boolean; includesTelegram: boolean; isActive: boolean; sortOrder: number; }

const cardStyle: React.CSSProperties = { backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)", color: "var(--text)", fontSize: "0.8125rem", outline: "none", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem", display: "block" };

export default function PackagesPage() {
  const { isAr, t } = useAdminLocale();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", nameAr: "", price: 0, durationDays: 7, maxImages: 2, isFeatured: false, isPinned: false, includesTelegram: false, isActive: true, sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() { const d = await (await fetch("/api/admin/packages")).json(); if (d.ok) setPackages(d.packages); setLoading(false); }
  useEffect(() => { load(); }, []);

  function editPkg(pkg: Package) {
    setEditId(pkg.id);
    setForm({ name: pkg.name, nameAr: pkg.nameAr, price: pkg.price, durationDays: pkg.durationDays, maxImages: pkg.maxImages, isFeatured: pkg.isFeatured, isPinned: pkg.isPinned, includesTelegram: pkg.includesTelegram, isActive: pkg.isActive, sortOrder: pkg.sortOrder });
  }

  function resetForm() {
    setEditId(null);
    setForm({ name: "", nameAr: "", price: 0, durationDays: 7, maxImages: 2, isFeatured: false, isPinned: false, includesTelegram: false, isActive: true, sortOrder: 0 });
  }

  async function handleSave() {
    setSaving(true); setMsg("");
    const body = editId ? { ...form, id: editId } : form;
    const d = await (await fetch("/api/admin/packages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
    setSaving(false);
    if (d.ok) { setMsg(editId ? t("Package updated","تم تحديث الباقة") : t("Package created","تم إنشاء الباقة")); resetForm(); load(); } else setMsg(t("Error","خطأ") + ": " + d.error);
  }

  async function handleDelete(id: string) {
    if (!confirm(t("Delete this package?","حذف هذه الباقة؟"))) return;
    await fetch("/api/admin/packages", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  if (loading) return <p style={{ color: "var(--text-muted)", padding: "2rem" }}>Loading...</p>;

  return (
    <div>
      <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.5rem", marginBottom: "1.25rem" }}>{t("Packages","الباقات")} ({packages.length})</h1>
      {msg && <div style={{ backgroundColor: "color-mix(in srgb, var(--primary) 10%, var(--surface))", border: "1.5px solid var(--primary)", borderRadius: "var(--radius-md)", padding: "0.625rem 1rem", marginBottom: "1rem", color: "var(--primary)", fontSize: "0.8125rem", cursor: "pointer" }} onClick={() => setMsg("")}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {/* Form */}
        <div style={{ ...cardStyle, padding: "1.25rem" }}>
          <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "0.9375rem", marginBottom: "1rem" }}>{editId ? t("Edit Package","تعديل الباقة") : t("Add Package","إضافة باقة")}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {[
              { label: t("Name","الاسم"), key: "name", type: "text" },
              { label: t("Name (Arabic)","الاسم (عربي)"), key: "nameAr", type: "text" },
              { label: t("Price (AED)","السعر (د.إ)"), key: "price", type: "number" },
              { label: t("Duration (days)","المدة (أيام)"), key: "durationDays", type: "number" },
              { label: t("Max Images","أقصى عدد صور"), key: "maxImages", type: "number" },
              { label: t("Sort Order","الترتيب"), key: "sortOrder", type: "number" },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input style={inputStyle} type={f.type} value={form[f.key as keyof typeof form] as string | number}
                  onChange={e => setForm({ ...form, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })} />
              </div>
            ))}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.25rem" }}>
              {[{ key: "isFeatured", label: t("Featured","مميز") }, { key: "isPinned", label: t("Pinned","مثبّت") }, { key: "includesTelegram", label: t("Telegram","تيليغرام") }, { key: "isActive", label: t("Active","نشط") }].map(c => (
                <label key={c.key} style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--text)", cursor: "pointer" }}>
                  <input type="checkbox" checked={form[c.key as keyof typeof form] as boolean} onChange={e => setForm({ ...form, [c.key]: e.target.checked })} style={{ accentColor: "var(--primary)" }} />
                  {c.label}
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button onClick={handleSave} disabled={saving || !form.name}
                style={{ flex: 1, height: 40, borderRadius: "var(--radius-md)", backgroundColor: "var(--primary)", color: "#fff", border: "none", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer", opacity: saving || !form.name ? 0.5 : 1 }}>
                {saving ? t("Saving...","جارٍ الحفظ...") : editId ? t("Update","تحديث") : t("Create","إنشاء")}
              </button>
              {editId && (
                <button onClick={resetForm} style={{ height: 40, padding: "0 1rem", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-muted)", fontSize: "0.8125rem", cursor: "pointer" }}>{t("Cancel","إلغاء")}</button>
              )}
            </div>
          </div>
        </div>

        {/* List */}
        <div style={cardStyle}>
          <div style={{ padding: "1rem", borderBottom: "1.5px solid var(--border)" }}>
            <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "0.9375rem" }}>{t("All Packages","جميع الباقات")}</h2>
          </div>
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            {packages.map(pkg => (
              <div key={pkg.id} style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text)" }}>{pkg.name} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({pkg.nameAr})</span></p>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.125rem" }}>
                    {pkg.price} AED · {pkg.durationDays} days · {pkg.maxImages} imgs
                    {pkg.isFeatured ? " · Featured" : ""}{pkg.isPinned ? " · Pinned" : ""}
                    {!pkg.isActive ? " · Inactive" : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.375rem" }}>
                  <button onClick={() => editPkg(pkg)} style={{ padding: "0.25rem 0.5rem", borderRadius: "var(--radius-md)", fontSize: "0.7rem", fontWeight: 600, border: "1.5px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--primary)", cursor: "pointer" }}>{t("Edit","تعديل")}</button>
                  <button onClick={() => handleDelete(pkg.id)} style={{ padding: "0.25rem 0.5rem", borderRadius: "var(--radius-md)", fontSize: "0.7rem", fontWeight: 600, border: "1.5px solid var(--danger)", backgroundColor: "var(--surface)", color: "var(--danger)", cursor: "pointer" }}>{t("Delete","حذف")}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
