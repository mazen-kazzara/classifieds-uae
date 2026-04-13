"use client";
import { useEffect, useState } from "react";
import { useAdminLocale } from "../useAdminLocale";

interface Category { id: string; name: string; nameAr: string; slug: string; icon?: string; isActive: boolean; sortOrder: number; }

const cardStyle: React.CSSProperties = { backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)", color: "var(--text)", fontSize: "0.8125rem", outline: "none", boxSizing: "border-box" };

export default function CategoriesPage() {
  const { isAr, t } = useAdminLocale();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", nameAr: "", slug: "", icon: "", sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() { const d = await (await fetch("/api/admin/categories")).json(); if (d.ok) setCategories(d.categories); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function handleSave() {
    setSaving(true); setMsg("");
    const d = await (await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, isActive: true }) })).json();
    setSaving(false);
    if (d.ok) { setMsg(t("Saved", "تم الحفظ")); setForm({ name: "", nameAr: "", slug: "", icon: "", sortOrder: 0 }); load(); }
    else setMsg(t("Error", "خطأ") + ": " + d.error);
  }

  async function handleDelete(id: string) {
    if (!confirm(t("Delete this category?", "حذف هذه الفئة؟"))) return;
    await fetch("/api/admin/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  if (loading) return <p style={{ color: "var(--text-muted)", padding: "2rem" }}>{t("Loading...", "جارٍ التحميل...")}</p>;

  return (
    <div>
      <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.5rem", marginBottom: "1.25rem" }}>{t("Categories", "الفئات")}</h1>
      {msg && <div style={{ backgroundColor: "color-mix(in srgb, var(--primary) 10%, var(--surface))", border: "1.5px solid var(--primary)", borderRadius: "var(--radius-md)", padding: "0.625rem 1rem", marginBottom: "1rem", color: "var(--primary)", fontSize: "0.8125rem", cursor: "pointer" }} onClick={() => setMsg("")}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {/* Form */}
        <div style={{ ...cardStyle, padding: "1.25rem" }}>
          <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "0.9375rem", marginBottom: "1rem" }}>{t("Add / Update Category", "إضافة / تعديل فئة")}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {[
              { label: t("Name (English)", "الاسم (إنجليزي)"), key: "name", placeholder: "Vehicles" },
              { label: t("Name (Arabic)", "الاسم (عربي)"), key: "nameAr", placeholder: "سيارات" },
              { label: t("Slug", "الرابط"), key: "slug", placeholder: "vehicles" },
              { label: t("Icon (emoji)", "أيقونة"), key: "icon", placeholder: "" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem", display: "block" }}>{f.label}</label>
                <input style={inputStyle} type="text" placeholder={f.placeholder} value={form[f.key as keyof typeof form] as string} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem", display: "block" }}>{t("Sort Order", "الترتيب")}</label>
              <input style={inputStyle} type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
            <button onClick={handleSave} disabled={saving || !form.name || !form.slug}
              style={{ width: "100%", height: 40, borderRadius: "var(--radius-md)", backgroundColor: "var(--primary)", color: "#fff", border: "none", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer", opacity: saving || !form.name || !form.slug ? 0.5 : 1 }}>
              {saving ? t("Saving...", "جارٍ الحفظ...") : t("Save Category", "حفظ الفئة")}
            </button>
          </div>
        </div>

        {/* List */}
        <div style={cardStyle}>
          <div style={{ padding: "1rem", borderBottom: "1.5px solid var(--border)" }}>
            <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "0.9375rem" }}>{t("All Categories", "جميع الفئات")} ({categories.length})</h2>
          </div>
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text)" }}>{isAr ? cat.nameAr : cat.name}</p>
                  <p style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{cat.slug} · {t("order", "ترتيب")} {cat.sortOrder}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 999, backgroundColor: cat.isActive ? "color-mix(in srgb, #22C55E 15%, var(--surface))" : "color-mix(in srgb, var(--text-muted) 15%, var(--surface))", color: cat.isActive ? "#22C55E" : "var(--text-muted)" }}>
                    {cat.isActive ? t("Active", "نشط") : t("Hidden", "مخفي")}
                  </span>
                  <button onClick={() => handleDelete(cat.id)} style={{ padding: "0.25rem 0.5rem", borderRadius: "var(--radius-md)", fontSize: "0.7rem", fontWeight: 600, border: "1.5px solid var(--danger)", backgroundColor: "var(--surface)", color: "var(--danger)", cursor: "pointer" }}>{t("Delete", "حذف")}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
