"use client";
import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "@/lib/useTranslations";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Ad { id: string; title: string; category: string; status: string; publishedAt: string; expiresAt: string; isFeatured: boolean; }

export default function MyAdsPage() {
  const { data: session, status } = useSession();
  const locale = useLocale();
  const t = useTranslations("myAds");
  const CAT_AR: Record<string, string> = { vehicles: "مركبات", "real-estate": "عقارات", electronics: "إلكترونيات", jobs: "وظائف", services: "خدمات", salons: "صالونات وتجميل", "salons-beauty": "صالونات وتجميل", "salons-&-beauty": "صالونات وتجميل", "salons & beauty": "صالونات وتجميل", clinics: "عيادات", furniture: "أثاث", education: "تعليم", other: "أخرى" };
  const router = useRouter();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/user/my-ads")
        .then(r => r.json())
        .then(d => { if (d.ok) setAds(d.ads); })
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  const phone = (session?.user as any)?.phone;
  const displayName = session?.user?.name || session?.user?.email || (phone ? `+${phone}` : "");

  function daysLeft(expiresAt: string) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  if (status === "loading" || loading) return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>Loading…</div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.5rem", marginBottom: "0.25rem" }}>{t("title")}</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>{locale === "ar" ? "مسجّل الدخول بـ" : "Logged in as"} <strong style={{ color: "var(--text)" }}>{displayName}</strong></p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Link href="/new" className="btn-primary" style={{ height: 40, padding: "0 1rem", fontSize: "0.875rem" }}>{locale === "ar" ? "+ نشر إعلان" : "+ Post Ad"}</Link>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-secondary" style={{ height: 40, padding: "0 1rem", fontSize: "0.875rem" }}>{locale === "ar" ? "تسجيل الخروج" : "Sign Out"}</button>
          </div>
        </div>

        {ads.length === 0 ? (
          <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "1rem", marginBottom: "1rem" }}>{t("noAds")}</p>
            <Link href="/new" className="btn-primary" style={{ height: 44, padding: "0 1.5rem" }}>{t("postFirst")}</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {ads.map(ad => {
              const days = daysLeft(ad.expiresAt);
              const expiring = days <= 1;
              return (
                <div key={ad.id} style={{ backgroundColor: "var(--surface)", border: `1.5px solid ${expiring ? "var(--danger)" : "var(--border)"}`, borderRadius: "var(--radius-lg)", padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      {ad.isFeatured && <span style={{ fontSize: "0.65rem", fontWeight: 700, backgroundColor: "var(--primary)", color: "#fff", padding: "0.1rem 0.4rem", borderRadius: 999 }}>FEATURED</span>}
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{locale === "ar" ? (CAT_AR[ad.category.toLowerCase().replace(/ /g,"-")] || ad.category) : ad.category}</span>
                    </div>
                    <p style={{ color: "var(--text)", fontWeight: 600, fontSize: "0.9375rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.title || (locale === "ar" ? "(بدون عنوان)" : "(No title)")}</p>
                    <p style={{ color: expiring ? "var(--danger)" : "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.25rem", fontWeight: expiring ? 600 : 400 }}>
                      {days === 0 ? (locale === "ar" ? "ينتهي اليوم" : "Expires today") : days === 1 ? (locale === "ar" ? "ينتهي غداً" : "Expires tomorrow") : locale === "ar" ? `${days} أيام متبقية` : `${days} days left`}
                    </p>
                  </div>
                  <Link href={`/${locale}/ad/${ad.id}`} className="btn-secondary" style={{ height: 36, padding: "0 0.875rem", fontSize: "0.8125rem", flexShrink: 0 }}>{locale === "ar" ? "عرض" : "View"}</Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
