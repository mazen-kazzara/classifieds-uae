"use client"

import { useEffect, useState } from "react"

export default function PricingPage() {
  const [textPrice, setTextPrice] = useState(0)
  const [imagePrice, setImagePrice] = useState(0)
  const [adDurationDays, setAdDurationDays] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || ""

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/pricing", {
        headers: { "x-admin-key": adminKey },
      })
      const data = await res.json()

      if (data.ok) {
        setTextPrice(data.pricing.textPrice)
        setImagePrice(data.pricing.imagePrice)
        setAdDurationDays(data.pricing.adDurationDays)
      }

      setLoading(false)
    }

    load()
  }, [])

  async function handleSave() {
    setSaving(true)

    const res = await fetch("/api/admin/pricing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({
        textPrice,
        imagePrice,
        adDurationDays,
      }),
    })

    const data = await res.json()

    setSaving(false)

    if (data.ok) {
      alert("Pricing updated successfully")
    } else {
      alert("Error updating pricing")
    }
  }

  if (loading) return <div className="p-10">Loading...</div>

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Pricing Rules</h1>

      <div className="space-y-4 bg-white p-6 rounded shadow">
        <div>
          <label>Text Price (AED)</label>
          <input
            type="number"
            value={textPrice}
            onChange={(e) => setTextPrice(Number(e.target.value))}
            className="border p-2 w-full"
          />
        </div>

        <div>
          <label>Image Price (AED)</label>
          <input
            type="number"
            value={imagePrice}
            onChange={(e) => setImagePrice(Number(e.target.value))}
            className="border p-2 w-full"
          />
        </div>

        <div>
          <label>Ad Duration (days)</label>
          <input
            type="number"
            value={adDurationDays}
            onChange={(e) => setAdDurationDays(Number(e.target.value))}
            className="border p-2 w-full"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  )
}