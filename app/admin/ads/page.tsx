"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminLocale } from "../useAdminLocale";

interface Ad {
  id: string; title?: string; category: string; status: string; contentType: string;
  isFeatured: boolean; isPinned: boolean; publishedAt?: string; expiresAt: string;
  viewsCount: number; description: string; adPrice?: number; isNegotiable?: boolean;
  telegramMessageId?: string | null; facebookPostId?: string | null; instagramPostId?: string | null; twitterPostId?: string | null;
  deletedAt?: string | null;
}

const cardStyle: React.CSSProperties = { backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" };
const thStyle: React.CSSProperties = { padding: "0.75rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textAlign: "start", borderBottom: "1.5px solid var(--border)" };
const tdStyle: React.CSSProperties = { padding: "0.75rem", fontSize: "0.8125rem", color: "var(--text)", borderBottom: "1px solid var(--border)" };
const btnSmall: React.CSSProperties = { padding: "0.25rem 0.625rem", borderRadius: "var(--radius-md)", fontSize: "0.7rem", fontWeight: 600, border: "1.5px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-muted)", cursor: "pointer", transition: "all 0.15s" };

export default function AdsPage() {
  const { isAr, t } = useAdminLocale();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editAd, setEditAd] = useState<Ad | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewFilter, setViewFilter] = useState<"active" | "deleted" | "all">("active");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function fetchAds() {
    setLoading(true);
    const params = new URLSearchParams({ limit: "20", page: String(page), view: viewFilter });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/admin/ads?${params.toString()}`).then(r => r.json()).then(d => {
      if (d.ok) { setAds(d.ads); setTotal(d.totalCount); }
      setLoading(false);
    });
  }

  useEffect(() => { fetchAds(); }, [page, debouncedSearch, statusFilter, viewFilter]);

  async function promptOtpAndCall(url: string, method: "POST" | "DELETE" = "DELETE"): Promise<any> {
    const otp = window.prompt(t("Enter your 2FA code to confirm:", "أدخل رمز المصادقة الثنائية للتأكيد:"));
    if (!otp || !/^\d{6}$/.test(otp)) {
      return { ok: false, error: "INVALID_OTP" };
    }
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp }),
    });
    return await res.json();
  }

  async function handleDelete(id: string) {
    const ad = ads.find(a => a.id === id);
    const channels = ["Website"];
    if (ad?.telegramMessageId) channels.push("Telegram");
    if (ad?.facebookPostId) channels.push("Facebook");
    if (ad?.instagramPostId) channels.push("Instagram");
    if (ad?.twitterPostId) channels.push("X");
    const confirmMsg = t(
      `Delete this ad from: ${channels.join(", ")}?\n\nIt will be removed from all channels immediately and can be restored within 7 days.`,
      `حذف هذا الإعلان من: ${channels.join(", ")}?\n\nسيتم إزالته من جميع القنوات فوراً ويمكن استعادته خلال 7 أيام.`
    );
    if (!confirm(confirmMsg)) return;
    try {
      const data = await promptOtpAndCall(`/api/admin/ads/${id}`, "DELETE");
      if (data.ok) {
        setMsgType("success");
        const deletedFrom = data.deletedFrom?.join(", ") || "website";
        setMsg(t(`Ad soft-deleted (recoverable for 7 days). Removed from: ${deletedFrom}`, `تم حذف الإعلان مؤقتاً (قابل للاستعادة لـ 7 أيام). أُزيل من: ${deletedFrom}`));
        fetchAds();
      } else if (data.error === "2FA_REQUIRED") {
        setMsgType("error"); setMsg(t("Invalid 2FA code", "رمز 2FA غير صالح"));
      } else if (data.error === "2FA_NOT_ENABLED") {
        setMsgType("error"); setMsg(t("Enable 2FA first (Admin → 2FA Security)", "فعّل المصادقة الثنائية أولاً (الإدارة ← 2FA)"));
      } else if (data.error === "INVALID_OTP") {
        setMsgType("error"); setMsg(t("Enter a valid 6-digit code", "أدخل رمز صحيح من 6 أرقام"));
      } else {
        setMsgType("error"); setMsg(t("Failed: " + (data.error || "Unknown"), "فشل: " + (data.error || "غير معروف")));
      }
    } catch {
      setMsgType("error"); setMsg(t("Failed to delete ad", "فشل حذف الإعلان"));
    }
  }

  async function handleRestore(id: string) {
    if (!confirm(t("Restore this ad? It will be republished on the website only (not to social channels).", "استعادة هذا الإعلان؟ سيُنشر على الموقع فقط (ليس على القنوات الاجتماعية)."))) return;
    try {
      const res = await fetch(`/api/admin/ads/${id}/restore`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMsgType("success"); setMsg(t("Ad restored", "تمت الاستعادة"));
        fetchAds();
      } else {
        setMsgType("error"); setMsg(t("Failed: " + (data.error || "Unknown"), "فشل: " + (data.error || "غير معروف")));
      }
    } catch { setMsgType("error"); setMsg(t("Failed to restore", "فشل الاستعادة")); }
  }

  async function handleHardDelete(id: string) {
    if (!confirm(t("PERMANENTLY delete this ad from the database? This cannot be undone.", "حذف هذا الإعلان نهائياً من قاعدة البيانات؟ لا يمكن التراجع."))) return;
    try {
      const data = await promptOtpAndCall(`/api/admin/ads/${id}/hard-delete`, "DELETE");
      if (data.ok) {
        setMsgType("success"); setMsg(t("Ad permanently deleted", "تم الحذف النهائي"));
        fetchAds();
      } else if (data.error === "INVALID_OTP") {
        setMsgType("error"); setMsg(t("Enter a valid 6-digit code", "أدخل رمز صحيح"));
      } else {
        setMsgType("error"); setMsg(t("Failed: " + (data.error || "Unknown"), "فشل: " + (data.error || "غير معروف")));
      }
    } catch { setMsgType("error"); setMsg(t("Failed", "فشل")); }
  }

  async function handleSaveEdit() {
    if (!editAd) return;
    setSaving(true);
    const res = await fetch(`/api/admin/ads/${editAd.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editAd.title, description: editAd.description, category: editAd.category,
        status: editAd.status, isFeatured: editAd.isFeatured, isPinned: editAd.isPinned,
        expiresAt: editAd.expiresAt, adPrice: editAd.adPrice, isNegotiable: editAd.isNegotiable,
      }),
    });
    setSaving(false);
    const data = await res.json();
    if (data.ok) { setMsgType("success"); setMsg(t("Ad updated", "تم تحديث الإعلان")); setEditAd(null); fetchAds(); }
    else { setMsgType("error"); setMsg(t("Failed to update: " + (data.error || "Unknown error"), "فشل التحديث: " + (data.error || "خطأ غير معروف"))); }
  }

  function statusBadge(s: string) {
    const colors: Record<string, string> = { PUBLISHED: "var(--primary)", EXPIRED: "var(--text-muted)", PENDING: "#EAB308", REJECTED: "var(--danger)" };
    return <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 999, backgroundColor: `color-mix(in srgb, ${colors[s] || "var(--text-muted)"} 15%, var(--surface))`, color: colors[s] || "var(--text-muted)" }}>{s}</span>;
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)",
    border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)",
    color: "var(--text)", fontSize: "0.8125rem", outline: "none", boxSizing: "border-box",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
        <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.5rem" }}>{t("All Ads", "جميع الإعلانات")} ({total})</h1>
      </div>

      {/* View tabs */}
      <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.75rem" }}>
        {(["active", "deleted", "all"] as const).map(v => (
          <button key={v} onClick={() => { setViewFilter(v); setPage(1); }}
            style={{
              padding: "0.4rem 0.875rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 600,
              border: `1.5px solid ${viewFilter === v ? "var(--primary)" : "var(--border)"}`,
              backgroundColor: viewFilter === v ? "color-mix(in srgb, var(--primary) 12%, var(--surface))" : "var(--surface)",
              color: viewFilter === v ? "var(--primary)" : "var(--text-muted)", cursor: "pointer",
            }}>
            {v === "active" ? t("Active", "النشط") : v === "deleted" ? t("Deleted (recoverable)", "المحذوف (قابل للاستعادة)") : t("All", "الكل")}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("Search by title, description, ID, category, phone…", "ابحث بالعنوان، الوصف، المعرّف، الفئة، الهاتف…")}
          style={{
            flex: 1, minWidth: 240, padding: "0.625rem 1rem", borderRadius: "var(--radius-md)",
            border: "1.5px solid var(--border)", backgroundColor: "var(--surface)",
            color: "var(--text)", fontSize: "0.875rem", outline: "none",
          }}
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{
            padding: "0.625rem 1rem", borderRadius: "var(--radius-md)",
            border: "1.5px solid var(--border)", backgroundColor: "var(--surface)",
            color: "var(--text)", fontSize: "0.875rem", outline: "none", cursor: "pointer",
          }}
        >
          <option value="">{t("All Statuses", "كل الحالات")}</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="EXPIRED">EXPIRED</option>
          <option value="PENDING">PENDING</option>
          <option value="REJECTED">REJECTED</option>
        </select>
      </div>

      {msg && <div style={{ backgroundColor: msgType === "error" ? "color-mix(in srgb, var(--danger) 10%, var(--surface))" : "color-mix(in srgb, var(--primary) 10%, var(--surface))", border: `1.5px solid ${msgType === "error" ? "var(--danger)" : "var(--primary)"}`, borderRadius: "var(--radius-md)", padding: "0.625rem 1rem", marginBottom: "1rem", color: msgType === "error" ? "var(--danger)" : "var(--primary)", fontSize: "0.8125rem", cursor: "pointer" }} onClick={() => setMsg("")}>{msg}</div>}

      {/* Edit Modal */}
      {editAd && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", padding: "1.75rem", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.125rem", marginBottom: "1.25rem" }}>{t("Edit Ad", "تعديل الإعلان")} — {editAd.id}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem", display: "block" }}>{t("Title", "العنوان")}</label>
                <input style={inputStyle} value={editAd.title || ""} onChange={e => setEditAd({ ...editAd, title: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem", display: "block" }}>{t("Description", "الوصف")}</label>
                <textarea style={{ ...inputStyle, height: 80, resize: "none" }} value={editAd.description} onChange={e => setEditAd({ ...editAd, description: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem", display: "block" }}>{t("Category", "الفئة")}</label>
                  <input style={inputStyle} value={editAd.category} onChange={e => setEditAd({ ...editAd, category: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem", display: "block" }}>{t("Status", "الحالة")}</label>
                  <select style={inputStyle} value={editAd.status} onChange={e => setEditAd({ ...editAd, status: e.target.value })}>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="EXPIRED">EXPIRED</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem", display: "block" }}>{t("Price (AED)", "السعر (د.إ)")}</label>
                  <input style={inputStyle} type="number" value={editAd.adPrice ?? ""} onChange={e => setEditAd({ ...editAd, adPrice: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem", display: "block" }}>{t("Expires At", "تاريخ الانتهاء")}</label>
                  <input style={inputStyle} type="date" value={editAd.expiresAt?.split("T")[0] || ""} onChange={e => setEditAd({ ...editAd, expiresAt: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--text)", cursor: "pointer" }}>
                  <input type="checkbox" checked={editAd.isFeatured} onChange={e => setEditAd({ ...editAd, isFeatured: e.target.checked })} style={{ accentColor: "var(--primary)" }} /> Featured
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--text)", cursor: "pointer" }}>
                  <input type="checkbox" checked={editAd.isPinned} onChange={e => setEditAd({ ...editAd, isPinned: e.target.checked })} style={{ accentColor: "var(--primary)" }} /> Pinned
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--text)", cursor: "pointer" }}>
                  <input type="checkbox" checked={editAd.isNegotiable || false} onChange={e => setEditAd({ ...editAd, isNegotiable: e.target.checked })} style={{ accentColor: "var(--primary)" }} /> Negotiable
                </label>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" }}>
              <button onClick={() => setEditAd(null)} style={{ ...btnSmall, padding: "0.5rem 1rem" }}>{t("Cancel", "إلغاء")}</button>
              <button onClick={handleSaveEdit} disabled={saving} style={{ ...btnSmall, padding: "0.5rem 1rem", backgroundColor: "var(--primary)", color: "#fff", borderColor: "var(--primary)" }}>
                {saving ? t("Saving...", "جارٍ الحفظ...") : t("Save Changes", "حفظ التغييرات")}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: "var(--text-muted)" }}>Loading...</p> : (
        <div style={cardStyle}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--surface-2)" }}>
                  <th style={thStyle}>{t("Ad", "الإعلان")}</th>
                  <th style={thStyle}>{t("Category", "الفئة")}</th>
                  <th style={thStyle}>{t("Status", "الحالة")}</th>
                  <th style={thStyle}>{t("Channels", "القنوات")}</th>
                  <th style={thStyle}>{t("Views", "المشاهدات")}</th>
                  <th style={thStyle}>{t("Expires", "ينتهي")}</th>
                  <th style={thStyle}>{t("Actions", "إجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {ads.map(ad => (
                  <tr key={ad.id} style={{ transition: "background 0.1s" }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--surface-2)")} onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                    <td style={tdStyle}>
                      <p style={{ fontWeight: 600, color: "var(--text)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.title || "Untitled"}</p>
                      <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.125rem" }}>{ad.contentType}{ad.isFeatured ? " · Featured" : ""}</p>
                    </td>
                    <td style={tdStyle}>{ad.category}</td>
                    <td style={tdStyle}>{statusBadge(ad.status)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "0.2rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.6rem", padding: "0.1rem 0.3rem", borderRadius: 4, backgroundColor: "color-mix(in srgb, var(--primary) 15%, var(--surface))", color: "var(--primary)" }}>Web</span>
                        {ad.telegramMessageId && <span style={{ fontSize: "0.6rem", padding: "0.1rem 0.3rem", borderRadius: 4, backgroundColor: "color-mix(in srgb, #0088cc 15%, var(--surface))", color: "#0088cc" }}>TG</span>}
                        {ad.facebookPostId && <span style={{ fontSize: "0.6rem", padding: "0.1rem 0.3rem", borderRadius: 4, backgroundColor: "color-mix(in srgb, #1877F2 15%, var(--surface))", color: "#1877F2" }}>FB</span>}
                        {ad.instagramPostId && <span style={{ fontSize: "0.6rem", padding: "0.1rem 0.3rem", borderRadius: 4, backgroundColor: "color-mix(in srgb, #E4405F 15%, var(--surface))", color: "#E4405F" }}>IG</span>}
                        {ad.twitterPostId && <span style={{ fontSize: "0.6rem", padding: "0.1rem 0.3rem", borderRadius: 4, backgroundColor: "color-mix(in srgb, #000 15%, var(--surface))", color: "var(--text)" }}>X</span>}
                      </div>
                    </td>
                    <td style={tdStyle}>{ad.viewsCount}</td>
                    <td style={{ ...tdStyle, fontSize: "0.75rem", color: "var(--text-muted)" }}>{new Date(ad.expiresAt).toLocaleDateString("en-AE")}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                        {!ad.deletedAt && (
                          <>
                            <Link href={`/${isAr ? "ar" : "en"}/ad/${ad.id}`} target="_blank" style={{ ...btnSmall, textDecoration: "none" }}>{t("View", "عرض")}</Link>
                            <button onClick={() => setEditAd(ad)} style={btnSmall}>{t("Edit", "تعديل")}</button>
                            <button onClick={() => handleDelete(ad.id)} style={{ ...btnSmall, color: "var(--danger)", borderColor: "var(--danger)" }}>{t("Delete", "حذف")}</button>
                          </>
                        )}
                        {ad.deletedAt && (
                          <>
                            <button onClick={() => handleRestore(ad.id)} style={{ ...btnSmall, color: "var(--primary)", borderColor: "var(--primary)" }}>{t("Restore", "استعادة")}</button>
                            <button onClick={() => handleHardDelete(ad.id)} style={{ ...btnSmall, color: "var(--danger)", borderColor: "var(--danger)" }}>{t("Purge", "حذف نهائي")}</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", padding: "1rem", borderTop: "1px solid var(--border)" }}>
            {page > 1 && <button onClick={() => setPage(p => p - 1)} style={btnSmall}>{t("Previous", "السابق")}</button>}
            <span style={{ padding: "0.25rem 0.75rem", fontSize: "0.8125rem", color: "var(--text-muted)" }}>{t("Page", "صفحة")} {page}</span>
            {ads.length === 20 && <button onClick={() => setPage(p => p + 1)} style={btnSmall}>{t("Next", "التالي")}</button>}
          </div>
        </div>
      )}
    </div>
  );
}
