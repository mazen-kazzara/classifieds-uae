"use client";
import { useEffect, useState } from "react";

export default function PricingPage() {
  const [textPrice, setTextPrice] = useState(3);
  const [imagePrice, setImagePrice] = useState(2);
  const [adDurationDays, setAdDurationDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

  useEffect(() => {
    fetch("/api/admin/pricing", { headers: { "x-admin-key": adminKey } })
      .then(r=>r.json())
      .then(d => { if (d.ok) { setTextPrice(d.pricing.textPrice); setImagePrice(d.pricing.imagePrice); setAdDurationDays(d.pricing.adDurationDays); } setLoading(false); });
  }, [adminKey]);

  async function handleSave() {
    setSaving(true); setMsg("");
    const res = await fetch("/api/admin/pricing", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ textPrice, imagePrice, adDurationDays }) });
    const d = await res.json();
    setSaving(false);
    setMsg(d.ok ? "✅ Saved successfully" : "❌ Error saving");
  }

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Pricing Configuration</h1>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 shadow-sm">
        <div><label className="block text-sm font-semibold text-gray-700 mb-1">Text Price (AED per 70 chars)</label><input type="number" min="0" value={textPrice} onChange={(e) => setTextPrice(Number(e.target.value))} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-blue-400 text-sm" /></div>
        <div><label className="block text-sm font-semibold text-gray-700 mb-1">Image Price (AED per image)</label><input type="number" min="0" value={imagePrice} onChange={(e) => setImagePrice(Number(e.target.value))} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-blue-400 text-sm" /></div>
        <div><label className="block text-sm font-semibold text-gray-700 mb-1">Default Duration (days)</label><input type="number" min="1" max="365" value={adDurationDays} onChange={(e) => setAdDurationDays(Number(e.target.value))} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-blue-400 text-sm" /></div>
        {msg && <p className={`text-sm font-medium ${msg.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>{msg}</p>}
        <button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50">{saving ? "Saving..." : "Save Changes"}</button>
      </div>
    </div>
  );
}
