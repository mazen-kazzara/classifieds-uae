"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Stat { label: string; labelAr: string; value: number; color: string; }
interface Ad { id: string; title?: string; category: string; status: string; contentType: string; }
const STATUS_AR: Record<string, string> = { PUBLISHED: "منشور", EXPIRED: "منتهي", PENDING: "قيد الانتظار", REJECTED: "مرفوض" };
const TYPE_AR: Record<string, string> = { ad: "إعلان", offer: "عرض", service: "خدمة" };

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [recentAds, setRecentAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAr, setIsAr] = useState(true);

  useEffect(() => {
    const match = document.cookie.match(/locale=(\w+)/);
    if (match) setIsAr(match[1] === "ar");

    fetch("/api/admin/dashboard").then(r => r.json()).then(d => {
      if (d.ok) { setStats(d.stats); setRecentAds(d.recentAds); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const t = (en: string, ar: string) => isAr ? ar : en;
  const cardStyle: React.CSSProperties = { backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)" };

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading...</p>;

  return (
    <div>
      <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.5rem", marginBottom: "1.5rem" }}>{t("Dashboard", "لوحة التحكم")}</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...cardStyle, padding: "1.25rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-muted)", marginBottom: "0.375rem" }}>{isAr ? s.labelAr : s.label}</p>
            <p style={{ fontSize: "1.75rem", fontWeight: 800, color: s.color }}>{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { href: "/admin/submissions", en: "Submissions", ar: "الطلبات" },
          { href: "/admin/ads", en: "Manage Ads", ar: "إدارة الإعلانات" },
          { href: "/admin/users", en: "Users", ar: "المستخدمون" },
          { href: "/admin/packages", en: "Packages", ar: "الباقات" },
          { href: "/admin/categories", en: "Categories", ar: "الفئات" },
          { href: "/admin/pricing", en: "Pricing", ar: "التسعير" },
        ].map(a => (
          <Link key={a.href} href={a.href} style={{ ...cardStyle, padding: "0.875rem 1rem", textDecoration: "none", fontSize: "0.8125rem", fontWeight: 600, color: "var(--primary)", textAlign: "center" }}>
            {isAr ? a.ar : a.en}
          </Link>
        ))}
      </div>

      <div style={cardStyle}>
        <div style={{ padding: "1rem", borderBottom: "1.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "0.9375rem" }}>{t("Recent Ads", "أحدث الإعلانات")}</h2>
          <Link href="/admin/ads" style={{ color: "var(--primary)", fontSize: "0.8125rem", fontWeight: 600, textDecoration: "none" }}>{t("View all", "عرض الكل")}</Link>
        </div>
        {recentAds.map(ad => (
          <div key={ad.id} style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.8125rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.title || t("Untitled", "بدون عنوان")}</p>
              <p style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{ad.category} · {isAr ? TYPE_AR[ad.contentType] || ad.contentType : ad.contentType}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 999, backgroundColor: ad.status === "PUBLISHED" ? "color-mix(in srgb, #22C55E 15%, var(--surface))" : "color-mix(in srgb, var(--text-muted) 15%, var(--surface))", color: ad.status === "PUBLISHED" ? "#22C55E" : "var(--text-muted)" }}>{isAr ? STATUS_AR[ad.status] || ad.status : ad.status}</span>
              <Link href={`/${isAr ? "ar" : "en"}/ad/${ad.id}`} target="_blank" style={{ fontSize: "0.75rem", color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>{t("View", "عرض")}</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
