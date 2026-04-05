"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Ad { id: string; title?: string; category: string; status: string; contentType: string; isFeatured: boolean; publishedAt?: string; expiresAt: string; viewsCount: number; }

export default function AdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/ads?limit=20&page=${page}`).then(r=>r.json()).then(d => {
      if (d.ok) { setAds(d.ads); setTotal(d.totalCount); }
      setLoading(false);
    });
  }, [page]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">All Ads ({total})</h1>
      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-semibold text-gray-600">Ad</th>
                <th className="text-left p-3 font-semibold text-gray-600">Category</th>
                <th className="text-left p-3 font-semibold text-gray-600">Status</th>
                <th className="text-left p-3 font-semibold text-gray-600">Views</th>
                <th className="text-left p-3 font-semibold text-gray-600">Expires</th>
                <th className="text-left p-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ads.map((ad) => (
                <tr key={ad.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <p className="font-medium text-gray-900 truncate max-w-xs">{ad.title || "Untitled"}</p>
                    <p className="text-xs text-gray-400">{ad.contentType}{ad.isFeatured ? " · ⭐ Featured" : ""}</p>
                  </td>
                  <td className="p-3 text-gray-600">{ad.category}</td>
                  <td className="p-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ad.status==="PUBLISHED"?"bg-green-100 text-green-700":ad.status==="EXPIRED"?"bg-gray-100 text-gray-600":"bg-yellow-100 text-yellow-700"}`}>{ad.status}</span>
                  </td>
                  <td className="p-3 text-gray-600">{ad.viewsCount}</td>
                  <td className="p-3 text-xs text-gray-500">{new Date(ad.expiresAt).toLocaleDateString("en-AE")}</td>
                  <td className="p-3"><Link href={`/ad/${ad.id}`} target="_blank" className="text-blue-600 text-xs hover:underline">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-center gap-2 p-4 border-t">
            {page > 1 && <button onClick={() => setPage(p=>p-1)} className="px-4 py-2 bg-white border rounded-xl text-sm hover:border-blue-400">← Prev</button>}
            <span className="px-4 py-2 text-sm text-gray-500">Page {page}</span>
            {ads.length === 20 && <button onClick={() => setPage(p=>p+1)} className="px-4 py-2 bg-white border rounded-xl text-sm hover:border-blue-400">Next →</button>}
          </div>
        </div>
      )}
    </div>
  );
}
