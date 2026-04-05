"use client";
import { useEffect, useState } from "react";

interface Package { id: string; name: string; nameAr: string; price: number; durationDays: number; maxImages: number; isFeatured: boolean; isPinned: boolean; includesTelegram: boolean; isActive: boolean; sortOrder: number; }

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", nameAr: "", price: 0, durationDays: 7, maxImages: 2, isFeatured: false, isPinned: false, includesTelegram: false, isActive: true, sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/admin/packages");
    const d = await res.json();
    if (d.ok) setPackages(d.packages);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleSave() {
    setSaving(true); setMsg("");
    const res = await fetch("/api/admin/packages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await res.json();
    setSaving(false);
    if (d.ok) { setMsg("✅ Saved"); load(); } else setMsg("❌ Error: " + d.error);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this package?")) return;
    await fetch("/api/admin/packages", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Packages</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Add Package</h2>
          <div className="space-y-3">
            {[{label:"Name",key:"name",type:"text"},{label:"Name (Arabic)",key:"nameAr",type:"text"},{label:"Price (AED)",key:"price",type:"number"},{label:"Duration (days)",key:"durationDays",type:"number"},{label:"Max Images",key:"maxImages",type:"number"},{label:"Sort Order",key:"sortOrder",type:"number"}].map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                <input type={f.type} value={form[f.key as keyof typeof form] as string|number} onChange={(e) => setForm({...form, [f.key]: f.type==="number" ? Number(e.target.value) : e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-blue-400" />
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              {[{key:"isFeatured",label:"Featured"},{key:"isPinned",label:"Pinned"},{key:"includesTelegram",label:"Telegram"},{key:"isActive",label:"Active"}].map((c) => (
                <label key={c.key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input type="checkbox" checked={form[c.key as keyof typeof form] as boolean} onChange={(e) => setForm({...form, [c.key]: e.target.checked})} className="rounded" />
                  {c.label}
                </label>
              ))}
            </div>
            {msg && <p className={`text-sm ${msg.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>{msg}</p>}
            <button onClick={handleSave} disabled={saving || !form.name} className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 text-sm">
              {saving ? "Saving..." : "Save Package"}
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-4 border-b"><h2 className="font-bold text-gray-900">All Packages ({packages.length})</h2></div>
          <div className="divide-y max-h-96 overflow-auto">
            {packages.map((pkg) => (
              <div key={pkg.id} className="p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{pkg.name}</p>
                  <p className="text-xs text-gray-400">{pkg.price} AED · {pkg.durationDays} days {pkg.isFeatured?"· ⭐":""}{pkg.isPinned?"· 📌":""}{pkg.includesTelegram?"· ✈️":""}</p>
                </div>
                <button onClick={() => handleDelete(pkg.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
