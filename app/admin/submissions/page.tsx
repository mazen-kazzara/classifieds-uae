"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Submission {
  id: string; phone: string; status: string; categoryName?: string; text?: string; priceTotal?: number; createdAt: string;
  ad?: { id: string; status: string } | null;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  async function load(status?: string) {
    setLoading(true);
    const url = status ? `/api/admin/submissions?status=${status}` : "/api/admin/submissions";
    const res = await fetch(url);
    const d = await res.json();
    if (d.ok) setSubmissions(d.submissions);
    setLoading(false);
  }

  useEffect(() => { load(statusFilter || undefined); }, [statusFilter]);

  async function approve(id: string) {
    await fetch(`/api/admin/submissions/${id}/approve`, { method: "POST" });
    load(statusFilter || undefined);
  }

  async function reject(id: string) {
    if (!confirm("Reject this submission?")) return;
    await fetch(`/api/admin/submissions/${id}/reject`, { method: "POST" });
    load(statusFilter || undefined);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Submissions</h1>
      <div className="flex gap-2 mb-6 flex-wrap">
        {["","DRAFT","WAITING_PAYMENT","PAID","PENDING_REVIEW","PUBLISHED","REJECTED","EXPIRED"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${statusFilter===s ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"}`}>
            {s || "All"}
          </button>
        ))}
      </div>
      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <div key={sub.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{sub.phone}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sub.status==="PUBLISHED"?"bg-green-100 text-green-700":sub.status==="WAITING_PAYMENT"?"bg-yellow-100 text-yellow-700":sub.status==="REJECTED"?"bg-red-100 text-red-700":"bg-gray-100 text-gray-600"}`}>{sub.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{sub.categoryName || "—"} · {sub.priceTotal ?? 0} AED</p>
                  <p className="text-xs text-gray-600 line-clamp-2">{sub.text || "—"}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(sub.createdAt).toLocaleString("en-AE")}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {sub.ad && <Link href={`/ad/${sub.ad.id}`} target="_blank" className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">View Ad</Link>}
                  {!sub.ad && sub.status === "PAID" && <button onClick={() => approve(sub.id)} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">Approve</button>}
                  {sub.status !== "REJECTED" && sub.status !== "PUBLISHED" && <button onClick={() => reject(sub.id)} className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100">Reject</button>}
                </div>
              </div>
            </div>
          ))}
          {submissions.length === 0 && <p className="text-gray-400 text-center py-12">No submissions found</p>}
        </div>
      )}
    </div>
  );
}
