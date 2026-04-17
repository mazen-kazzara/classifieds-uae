"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminLocale } from "../useAdminLocale";

interface Submission {
  id: string; phone: string; status: string; categoryName?: string; text?: string; priceTotal?: number; createdAt: string;
  ad?: { id: string; status: string } | null;
}

const STATUS_AR: Record<string, string> = { DRAFT: "مسودة", WAITING_PAYMENT: "بانتظار الدفع", PAID: "مدفوع", PENDING_REVIEW: "بانتظار المراجعة", PUBLISHED: "منشور", REJECTED: "مرفوض", EXPIRED: "منتهي" };

export default function SubmissionsPage() {
  const { isAr, t } = useAdminLocale();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);
    const qs = params.toString();
    const url = qs ? `/api/admin/submissions?${qs}` : "/api/admin/submissions";
    const d = await (await fetch(url)).json();
    if (d.ok) setSubmissions(d.submissions);
    setLoading(false);
  }

  useEffect(() => { load(); }, [statusFilter, debouncedSearch]);

  async function approve(id: string) { await fetch(`/api/admin/submissions/${id}/approve`, { method: "POST" }); load(); }
  async function reject(id: string) {
    if (!confirm(t("Reject this submission?", "رفض هذا الطلب؟"))) return;
    await fetch(`/api/admin/submissions/${id}/reject`, { method: "POST" }); load();
  }

  const cardStyle: React.CSSProperties = { backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1rem", marginBottom: "0.625rem" };
  const btnSmall: React.CSSProperties = { padding: "0.3rem 0.625rem", borderRadius: "var(--radius-md)", fontSize: "0.7rem", fontWeight: 600, border: "1.5px solid var(--border)", backgroundColor: "var(--surface)", cursor: "pointer" };

  return (
    <div>
      <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.5rem", marginBottom: "1rem" }}>{t("Submissions", "الطلبات")}</h1>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t("Search by phone, text, title, ID, category…", "ابحث بالهاتف، النص، العنوان، المعرّف، الفئة…")}
        style={{
          width: "100%", padding: "0.625rem 1rem", borderRadius: "var(--radius-md)",
          border: "1.5px solid var(--border)", backgroundColor: "var(--surface)",
          color: "var(--text)", fontSize: "0.875rem", outline: "none", marginBottom: "1rem", boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        {["", "DRAFT", "WAITING_PAYMENT", "PAID", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "EXPIRED"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: "0.3rem 0.75rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 600, border: `1.5px solid ${statusFilter === s ? "var(--primary)" : "var(--border)"}`, backgroundColor: statusFilter === s ? "color-mix(in srgb, var(--primary) 12%, var(--surface))" : "var(--surface)", color: statusFilter === s ? "var(--primary)" : "var(--text-muted)", cursor: "pointer" }}>
            {s ? (isAr ? STATUS_AR[s] || s : s) : t("All", "الكل")}
          </button>
        ))}
      </div>
      {loading ? <p style={{ color: "var(--text-muted)" }}>{t("Loading...", "جارٍ التحميل...")}</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {submissions.map(sub => (
            <div key={sub.id} style={cardStyle}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "0.75rem" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text)" }}>{sub.phone}</span>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 999, backgroundColor: sub.status === "PUBLISHED" ? "color-mix(in srgb, #22C55E 15%, var(--surface))" : sub.status === "REJECTED" ? "color-mix(in srgb, var(--danger) 15%, var(--surface))" : "color-mix(in srgb, var(--text-muted) 15%, var(--surface))", color: sub.status === "PUBLISHED" ? "#22C55E" : sub.status === "REJECTED" ? "var(--danger)" : "var(--text-muted)" }}>
                      {isAr ? STATUS_AR[sub.status] || sub.status : sub.status}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>{sub.categoryName || "—"} · {sub.priceTotal ?? 0} {t("AED", "د.إ")}</p>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{sub.text || "—"}</p>
                  <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{new Date(sub.createdAt).toLocaleString(isAr ? "ar-AE" : "en-AE")}</p>
                </div>
                <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0, alignItems: "start" }}>
                  {sub.ad && <Link href={`/${isAr ? "ar" : "en"}/ad/${sub.ad.id}`} target="_blank" style={{ ...btnSmall, color: "var(--primary)", borderColor: "var(--primary)", textDecoration: "none" }}>{t("View Ad", "عرض الإعلان")}</Link>}
                  {!sub.ad && sub.status === "PAID" && <button onClick={() => approve(sub.id)} style={{ ...btnSmall, color: "#22C55E", borderColor: "#22C55E" }}>{t("Approve", "قبول")}</button>}
                  {sub.status !== "REJECTED" && sub.status !== "PUBLISHED" && <button onClick={() => reject(sub.id)} style={{ ...btnSmall, color: "var(--danger)", borderColor: "var(--danger)" }}>{t("Reject", "رفض")}</button>}
                </div>
              </div>
            </div>
          ))}
          {submissions.length === 0 && <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "3rem 0" }}>{t("No submissions found", "لا توجد طلبات")}</p>}
        </div>
      )}
    </div>
  );
}
