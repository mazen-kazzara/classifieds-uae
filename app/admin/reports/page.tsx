"use client";
import { useEffect, useState } from "react";
import { useAdminLocale } from "../useAdminLocale";

interface Report {
  id: string;
  adId: string;
  adTitle: string | null;
  adUrl: string;
  reporterName: string | null;
  reporterEmail: string | null;
  reporterPhone: string | null;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

const REASON_LABELS: Record<string, { ar: string; en: string }> = {
  SPAM: { ar: "إعلان مزعج", en: "Spam" },
  FAKE_AD: { ar: "إعلان مزيّف", en: "Fake ad" },
  PROHIBITED_CONTENT: { ar: "محتوى محظور", en: "Prohibited content" },
  WRONG_CATEGORY: { ar: "فئة خاطئة", en: "Wrong category" },
  DUPLICATE: { ar: "إعلان مكرر", en: "Duplicate" },
  SCAM_FRAUD: { ar: "احتيال أو نصب", en: "Scam / Fraud" },
  OFFENSIVE_LANGUAGE: { ar: "لغة مسيئة", en: "Offensive language" },
  ILLEGAL_ITEM: { ar: "منتج غير قانوني", en: "Illegal item" },
  MISLEADING_INFO: { ar: "معلومات مضللة", en: "Misleading info" },
  OTHER: { ar: "سبب آخر", en: "Other" },
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#F59E0B",
  AD_SUSPENDED: "#F97316",
  AD_DELETED: "#EF4444",
  DISMISSED: "#6B7280",
};

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  PENDING: { ar: "قيد الانتظار", en: "Pending" },
  AD_SUSPENDED: { ar: "معلّق", en: "Suspended" },
  AD_DELETED: { ar: "تم حذف الإعلان", en: "Ad Deleted" },
  DISMISSED: { ar: "تم الرفض", en: "Dismissed" },
};

const cardStyle: React.CSSProperties = { backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" };
const thStyle: React.CSSProperties = { padding: "0.75rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textAlign: "start", borderBottom: "1.5px solid var(--border)" };
const tdStyle: React.CSSProperties = { padding: "0.75rem", fontSize: "0.8125rem", color: "var(--text)", borderBottom: "1px solid var(--border)" };

export default function ReportsPage() {
  const { isAr, t } = useAdminLocale();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function fetchReports() {
    setLoading(true);
    const params = new URLSearchParams({ limit: "20", page: String(page) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/admin/reports?${params.toString()}`).then(r => r.json()).then(d => {
      if (d.ok) { setReports(d.reports); setTotal(d.totalCount); }
      setLoading(false);
    });
  }

  useEffect(() => { fetchReports(); }, [page, debouncedSearch, statusFilter]);

  function showMsg(type: "success" | "error", text: string) {
    setMsgType(type);
    setMsg(text);
    setTimeout(() => setMsg(""), 4000);
  }

  async function handleSuspend(report: Report) {
    const confirmMsg = t(
      `SUSPEND this ad? It will be hidden from all users except the owner.\n\nAd: ${report.adTitle || report.adId}\nReason: ${REASON_LABELS[report.reason]?.en || report.reason}`,
      `تعليق هذا الإعلان؟ سيتم إخفاؤه عن الجميع ما عدا صاحب الإعلان.\n\nالإعلان: ${report.adTitle || report.adId}\nالسبب: ${REASON_LABELS[report.reason]?.ar || report.reason}`
    );
    if (!confirm(confirmMsg)) return;

    setActionLoading(report.id);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: report.id, status: "AD_SUSPENDED" }),
      });
      const data = await res.json();
      if (data.ok) {
        showMsg("success", t(
          `Ad "${report.adTitle || report.adId}" suspended`,
          `تم تعليق الإعلان "${report.adTitle || report.adId}"`
        ));
        fetchReports();
      } else {
        showMsg("error", data.error || "Error");
      }
    } catch {
      showMsg("error", t("Something went wrong", "حدث خطأ"));
    }
    setActionLoading(null);
  }

  async function handleUnsuspend(report: Report) {
    const confirmMsg = t(
      `Unsuspend and republish this ad?\n\nAd: ${report.adTitle || report.adId}`,
      `إلغاء التعليق وإعادة نشر الإعلان؟\n\nالإعلان: ${report.adTitle || report.adId}`
    );
    if (!confirm(confirmMsg)) return;

    setActionLoading(report.id);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: report.id, status: "PENDING", unsuspend: true }),
      });
      const data = await res.json();
      if (data.ok) {
        showMsg("success", t("Ad unsuspended and republished", "تم إلغاء التعليق وإعادة النشر"));
        fetchReports();
      } else {
        showMsg("error", data.error || "Error");
      }
    } catch {
      showMsg("error", t("Something went wrong", "حدث خطأ"));
    }
    setActionLoading(null);
  }

  async function handleDeleteAd(report: Report) {
    const confirmMsg = t(
      `DELETE this ad and remove it from all channels (Telegram, Facebook, Instagram, X)?\n\nAd: ${report.adTitle || report.adId}\nReason: ${REASON_LABELS[report.reason]?.en || report.reason}\n\nThis requires your 2FA code.`,
      `حذف هذا الإعلان وإزالته من جميع القنوات (تيليغرام، فيسبوك، إنستغرام، X)؟\n\nالإعلان: ${report.adTitle || report.adId}\nالسبب: ${REASON_LABELS[report.reason]?.ar || report.reason}\n\nيتطلب رمز المصادقة الثنائية.`
    );
    if (!confirm(confirmMsg)) return;

    const otp = window.prompt(t("Enter your 2FA code:", "أدخل رمز المصادقة الثنائية:"));
    if (!otp || !/^\d{6}$/.test(otp)) {
      showMsg("error", t("Invalid 2FA code", "رمز المصادقة غير صالح"));
      return;
    }

    setActionLoading(report.id);
    try {
      // 1. Delete the ad from all channels
      const delRes = await fetch(`/api/admin/ads/${report.adId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const delData = await delRes.json();

      if (!delData.ok) {
        showMsg("error", delData.error === "2FA_REQUIRED" ? t("Invalid 2FA code", "رمز المصادقة غير صالح") : (delData.message || delData.error || "Error"));
        setActionLoading(null);
        return;
      }

      // 2. Mark report as resolved
      await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: report.id, status: "AD_DELETED" }),
      });

      showMsg("success", t(
        `Ad "${report.adTitle || report.adId}" deleted from all channels`,
        `تم حذف الإعلان "${report.adTitle || report.adId}" من جميع القنوات`
      ));
      fetchReports();
    } catch {
      showMsg("error", t("Something went wrong", "حدث خطأ"));
    }
    setActionLoading(null);
  }

  async function handleDismiss(report: Report) {
    const confirmMsg = t(
      `Dismiss this report? The ad will remain published.\n\nAd: ${report.adTitle || report.adId}\nReason: ${REASON_LABELS[report.reason]?.en || report.reason}`,
      `رفض هذا البلاغ؟ سيبقى الإعلان منشوراً.\n\nالإعلان: ${report.adTitle || report.adId}\nالسبب: ${REASON_LABELS[report.reason]?.ar || report.reason}`
    );
    if (!confirm(confirmMsg)) return;

    setActionLoading(report.id);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: report.id, status: "DISMISSED" }),
      });
      const data = await res.json();
      if (data.ok) {
        showMsg("success", t("Report dismissed", "تم رفض البلاغ"));
        fetchReports();
      } else {
        showMsg("error", data.error || "Error");
      }
    } catch {
      showMsg("error", t("Something went wrong", "حدث خطأ"));
    }
    setActionLoading(null);
  }

  async function handleReopen(report: Report) {
    setActionLoading(report.id);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: report.id, status: "PENDING" }),
      });
      const data = await res.json();
      if (data.ok) {
        showMsg("success", t("Report reopened", "تم إعادة فتح البلاغ"));
        fetchReports();
      } else {
        showMsg("error", data.error || "Error");
      }
    } catch {
      showMsg("error", t("Something went wrong", "حدث خطأ"));
    }
    setActionLoading(null);
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.375rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.25rem" }}>
          {t("Ad Reports", "بلاغات الإعلانات")}
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
          {t("Review reported ads — delete or dismiss", "مراجعة البلاغات — حذف الإعلان أو رفض البلاغ")}
        </p>
      </div>

      {msg && (
        <div style={{
          padding: "0.625rem 1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.8125rem", fontWeight: 500,
          backgroundColor: msgType === "success" ? "color-mix(in srgb, #10B981 10%, var(--surface))" : "color-mix(in srgb, var(--danger) 10%, var(--surface))",
          border: `1.5px solid ${msgType === "success" ? "#10B981" : "var(--danger)"}`,
          color: msgType === "success" ? "#10B981" : "var(--danger)",
        }}>{msg}</div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t("Search by ad title, ID, reporter...", "بحث بعنوان الإعلان، المعرف، المبلّغ...")}
          style={{
            flex: "1 1 200px", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)",
            border: "1.5px solid var(--border)", backgroundColor: "var(--surface)",
            color: "var(--text)", fontSize: "0.8125rem", outline: "none",
          }}
        />
        <select
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{
            padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)",
            border: "1.5px solid var(--border)", backgroundColor: "var(--surface)",
            color: "var(--text)", fontSize: "0.8125rem", outline: "none", cursor: "pointer",
          }}
        >
          <option value="">{t("All statuses", "كل الحالات")}</option>
          <option value="PENDING">{t("Pending", "قيد الانتظار")}</option>
          <option value="AD_SUSPENDED">{t("Suspended", "معلّق")}</option>
          <option value="AD_DELETED">{t("Ad Deleted", "تم حذف الإعلان")}</option>
          <option value="DISMISSED">{t("Dismissed", "مرفوض")}</option>
        </select>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
        {[
          { label: t("Total", "الإجمالي"), value: total, color: "var(--text)" },
          { label: t("Pending", "قيد الانتظار"), value: reports.filter(r => r.status === "PENDING").length, color: "#F59E0B" },
          { label: t("Suspended", "معلّق"), value: reports.filter(r => r.status === "AD_SUSPENDED").length, color: "#F97316" },
          { label: t("Deleted", "محذوف"), value: reports.filter(r => r.status === "AD_DELETED").length, color: "#EF4444" },
          { label: t("Dismissed", "مرفوض"), value: reports.filter(r => r.status === "DISMISSED").length, color: "#6B7280" },
        ].map((s, i) => (
          <div key={i} style={{ ...cardStyle, padding: "0.875rem 1rem", textAlign: "center" }}>
            <p style={{ fontSize: "1.25rem", fontWeight: 800, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, overflowX: "auto" }}>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
            {t("Loading...", "جارٍ التحميل...")}
          </div>
        ) : reports.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
            {t("No reports found", "لا توجد بلاغات")}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>{t("Ad", "الإعلان")}</th>
                <th style={thStyle}>{t("Reason", "السبب")}</th>
                <th style={thStyle}>{t("Reporter", "المبلّغ")}</th>
                <th style={thStyle}>{t("Status", "الحالة")}</th>
                <th style={thStyle}>{t("Date", "التاريخ")}</th>
                <th style={thStyle}>{t("Actions", "الإجراءات")}</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => {
                const isLoading = actionLoading === r.id;
                return (
                  <>
                    <tr key={r.id} style={{ cursor: "pointer", opacity: isLoading ? 0.5 : 1 }} onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                      <td style={tdStyle}>
                        <div>
                          <a href={r.adUrl} target="_blank" rel="noopener noreferrer"
                            style={{ color: "var(--primary)", textDecoration: "none", fontSize: "0.8125rem", fontWeight: 600 }}
                            onClick={e => e.stopPropagation()}>
                            {r.adTitle || r.adId.slice(0, 12) + "..."}
                          </a>
                          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{r.adId.slice(0, 16)}</p>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: "0.75rem", fontWeight: 600, padding: "0.2rem 0.5rem",
                          borderRadius: 999, backgroundColor: "color-mix(in srgb, var(--primary) 10%, var(--surface))",
                          color: "var(--primary)",
                        }}>
                          {isAr ? (REASON_LABELS[r.reason]?.ar || r.reason) : (REASON_LABELS[r.reason]?.en || r.reason)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: "0.8125rem" }}>{r.reporterName || t("Anonymous", "مجهول")}</span>
                        {r.reporterEmail && <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{r.reporterEmail}</p>}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.5rem",
                          borderRadius: 999, color: "#fff",
                          backgroundColor: STATUS_COLORS[r.status] || "#6B7280",
                        }}>
                          {isAr ? (STATUS_LABELS[r.status]?.ar || r.status) : (STATUS_LABELS[r.status]?.en || r.status)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: "0.75rem" }}>
                          {new Date(r.createdAt).toLocaleDateString(isAr ? "ar-AE" : "en-AE")}
                        </span>
                      </td>
                      <td style={tdStyle} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                          {r.status === "PENDING" && (
                            <>
                              <button onClick={() => handleSuspend(r)} disabled={isLoading}
                                style={{
                                  padding: "0.3rem 0.625rem", borderRadius: "var(--radius-md)", fontSize: "0.7rem", fontWeight: 700,
                                  border: "none", backgroundColor: "#F97316", color: "#fff", cursor: isLoading ? "wait" : "pointer",
                                }}>
                                {isLoading ? "..." : t("Suspend", "تعليق")}
                              </button>
                              <button onClick={() => handleDeleteAd(r)} disabled={isLoading}
                                style={{
                                  padding: "0.3rem 0.625rem", borderRadius: "var(--radius-md)", fontSize: "0.7rem", fontWeight: 700,
                                  border: "none", backgroundColor: "#EF4444", color: "#fff", cursor: isLoading ? "wait" : "pointer",
                                }}>
                                {isLoading ? "..." : t("Delete Ad", "حذف الإعلان")}
                              </button>
                              <button onClick={() => handleDismiss(r)} disabled={isLoading}
                                style={{
                                  padding: "0.3rem 0.625rem", borderRadius: "var(--radius-md)", fontSize: "0.7rem", fontWeight: 600,
                                  border: "1.5px solid #6B7280", backgroundColor: "transparent", color: "#6B7280", cursor: isLoading ? "wait" : "pointer",
                                }}>
                                {t("Dismiss", "رفض")}
                              </button>
                            </>
                          )}
                          {r.status === "AD_SUSPENDED" && (
                            <>
                              <button onClick={() => handleUnsuspend(r)} disabled={isLoading}
                                style={{
                                  padding: "0.3rem 0.625rem", borderRadius: "var(--radius-md)", fontSize: "0.7rem", fontWeight: 600,
                                  border: "1.5px solid #10B981", backgroundColor: "transparent", color: "#10B981", cursor: isLoading ? "wait" : "pointer",
                                }}>
                                {t("Unsuspend", "إلغاء التعليق")}
                              </button>
                              <button onClick={() => handleDeleteAd(r)} disabled={isLoading}
                                style={{
                                  padding: "0.3rem 0.625rem", borderRadius: "var(--radius-md)", fontSize: "0.7rem", fontWeight: 700,
                                  border: "none", backgroundColor: "#EF4444", color: "#fff", cursor: isLoading ? "wait" : "pointer",
                                }}>
                                {isLoading ? "..." : t("Delete Ad", "حذف الإعلان")}
                              </button>
                            </>
                          )}
                          {(r.status === "AD_DELETED" || r.status === "DISMISSED") && (
                            <button onClick={() => handleReopen(r)} disabled={isLoading}
                              style={{
                                padding: "0.3rem 0.625rem", borderRadius: "var(--radius-md)", fontSize: "0.7rem", fontWeight: 600,
                                border: "1.5px solid #F59E0B", backgroundColor: "transparent", color: "#F59E0B", cursor: isLoading ? "wait" : "pointer",
                              }}>
                              {t("Reopen", "إعادة فتح")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr key={r.id + "-detail"}>
                        <td colSpan={6} style={{ padding: "1rem", backgroundColor: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.8125rem" }}>
                            <div>
                              <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem" }}>{t("Details", "التفاصيل")}</p>
                              <p style={{ color: "var(--text-muted)", whiteSpace: "pre-line" }}>{r.details || t("No details provided", "لا توجد تفاصيل")}</p>
                            </div>
                            <div>
                              <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem" }}>{t("Reporter Contact", "بيانات المبلّغ")}</p>
                              <p style={{ color: "var(--text-muted)" }}>{t("Name", "الاسم")}: {r.reporterName || "—"}</p>
                              <p style={{ color: "var(--text-muted)" }}>{t("Email", "البريد")}: {r.reporterEmail || "—"}</p>
                              <p style={{ color: "var(--text-muted)" }}>{t("Phone", "الهاتف")}: {r.reporterPhone || "—"}</p>
                              {r.reviewedAt && (
                                <p style={{ color: "var(--text-muted)", marginTop: "0.5rem", fontSize: "0.75rem" }}>
                                  {t("Actioned", "تم الإجراء")}: {new Date(r.reviewedAt).toLocaleString(isAr ? "ar-AE" : "en-AE")}
                                </p>
                              )}
                            </div>
                          </div>
                          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.75rem" }}>
                            <a href={r.adUrl} target="_blank" rel="noopener noreferrer"
                              style={{ color: "var(--primary)", textDecoration: "none", fontSize: "0.8125rem", fontWeight: 600 }}>
                              {t("View Ad", "عرض الإعلان")} →
                            </a>
                            <a href={`/admin/ads`}
                              style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "0.8125rem", fontWeight: 500 }}>
                              {t("Manage in Ads", "إدارة في الإعلانات")} →
                            </a>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", marginTop: "1rem" }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            style={{ padding: "0.375rem 0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.8125rem", fontWeight: 600, border: "1.5px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-muted)", cursor: page <= 1 ? "default" : "pointer", opacity: page <= 1 ? 0.5 : 1 }}>
            {t("Previous", "السابق")}
          </button>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            style={{ padding: "0.375rem 0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.8125rem", fontWeight: 600, border: "1.5px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-muted)", cursor: page >= totalPages ? "default" : "pointer", opacity: page >= totalPages ? 0.5 : 1 }}>
            {t("Next", "التالي")}
          </button>
        </div>
      )}
    </div>
  );
}
