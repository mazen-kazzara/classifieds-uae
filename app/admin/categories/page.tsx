"use client";
import { useEffect, useState } from "react";

interface Category { id: string; name: string; nameAr: string; slug: string; icon?: string; isActive: boolean; sortOrder: number; }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", nameAr: "", slug: "", icon: "", sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/admin/categories");
    const d = await res.json();
    if (d.ok) setCategories(d.categories);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleSave() {
    setSaving(true); setMsg("");
    const res = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, isActive: true }) });
    const d = await res.json();
    setSaving(false);
    if (d.ok) { setMsg("✅ Saved"); setForm({ name: "", nameAr: "", slug: "", icon: "", sortOrder: 0 }); load(); }
    else setMsg("❌ Error: " + d.error);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete?")) return;
    await fetch("/api/admin/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Categories</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Add / Update Category</h2>
          <div className="space-y-3">
            {[{label:"Name (English)",key:"name",placeholder:"Vehicles"},{label:"Name (Arabic)",key:"nameAr",placeholder:"سيارات"},{label:"Slug",key:"slug",placeholder:"vehicles"},{label:"Icon (emoji)",key:"icon",placeholder:"🚗"}].map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                <input type="text" placeholder={f.placeholder} value={form[f.key as keyof typeof form] as string} onChange={(e) => setForm({...form, [f.key]: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-blue-400" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sort Order</label>
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({...form, sortOrder: Number(e.target.value)})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-blue-400" />
            </div>
            {msg && <p className={`text-sm ${msg.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>{msg}</p>}
            <button onClick={handleSave} disabled={saving || !form.name || !form.slug} className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 text-sm">
              {saving ? "Saving..." : "Save Category"}
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-4 border-b"><h2 className="font-bold text-gray-900">All Categories ({categories.length})</h2></div>
          <div className="divide-y max-h-96 overflow-auto">
            {categories.map((cat) => (
              <div key={cat.id} className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{cat.icon || "📦"}</span>
                  <div><p className="text-sm font-medium text-gray-900">{cat.name}</p><p className="text-xs text-gray-400">{cat.slug} · order {cat.sortOrder}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${cat.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{cat.isActive ? "Active" : "Hidden"}</span>
                  <button onClick={() => handleDelete(cat.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
