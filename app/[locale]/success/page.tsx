"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { PixelSubmitApplication } from "@/components/PixelEvents";
import { buildFollowLinks, type FollowPlatform } from "@/lib/follow-us";

const PLATFORM_META: Record<string, { icon: string; ar: string; en: string; color: string }> = {
  website:   { icon: "🌍", ar: "الموقع",       en: "Website",          color: "#2563EB" },
  telegram:  { icon: "📱", ar: "قناة تيليغرام", en: "Telegram Channel", color: "#0088cc" },
  facebook:  { icon: "📘", ar: "فيسبوك",       en: "Facebook",         color: "#1877F2" },
  instagram: { icon: "📷", ar: "انستقرام",      en: "Instagram",        color: "#E4405F" },
  x:         { icon: "✖️", ar: "X",             en: "X",                color: "#000000" },
};

function SuccessContent() {
  const sp = useSearchParams();
  const pathname = usePathname();
  const isAr = pathname.startsWith("/ar");
  const locale = isAr ? "ar" : "en";
  const isFree = sp.get("free") === "true";
  const [adInfo, setAdInfo] = useState<{ days?: number; title?: string; adUrl?: string; platformLinks?: Record<string, string> } | null>(null);

  useEffect(() => {
    const submissionId = sp.get("submissionId");
    if (!submissionId) return;
    fetch("/api/payments/success", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    }).then(r => r.json()).then(d => {
      if (d.ok) setAdInfo({ days: d.days, title: d.title, adUrl: d.adUrl, platformLinks: d.platformLinks });
    }).catch(() => {});
  }, [sp]);

  const days = adInfo?.days;
  const platformLinks = adInfo?.platformLinks || {};
  const hasPlatformLinks = Object.keys(platformLinks).length > 0;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", display: "flex", flexDirection: "column" }} dir={isAr ? "rtl" : "ltr"}>
      <PixelSubmitApplication />
      <Header />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "3rem 2.5rem", textAlign: "center", maxWidth: "480px", width: "100%" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>{isFree ? "✅" : "🎉"}</div>
          <h1 style={{ color: "var(--text)", fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            {isFree
              ? (isAr ? "تم نشر الإعلان!" : "Ad Published!")
              : (isAr ? "تم الدفع بنجاح!" : "Payment Successful!")}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", marginBottom: "0.5rem" }}>
            {isFree
              ? (isAr ? "إعلانك الآن مباشر." : "Your ad is now live.")
              : (isAr ? "تم نشر إعلانك وهو الآن مباشر." : "Your ad has been published and is now live.")}
          </p>
          {days && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: "1.25rem" }}>
              {isAr
                ? <>سيكون مرئياً لمدة <strong style={{ color: "var(--text)" }}>{days} أيام</strong>.</>
                : <>It will be visible for <strong style={{ color: "var(--text)" }}>{days} days</strong>.</>}
            </p>
          )}
          {!days && <div style={{ marginBottom: "1.25rem" }} />}

          {/* Follow-us — same platforms the ad was posted to, our brand pages */}
          {hasPlatformLinks && (() => {
            const followPlatforms = Object.keys(platformLinks).filter(p =>
              p === "website" || p === "telegram" || p === "facebook" || p === "instagram" || p === "x"
            ) as FollowPlatform[];
            const followLinks = buildFollowLinks(followPlatforms, isAr ? "ar" : "en");
            if (followLinks.length === 0) return null;
            return (
              <div style={{ marginBottom: "1.25rem", textAlign: isAr ? "right" : "left" }}>
                <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.5rem", textAlign: "center" }}>
                  {isAr ? "💙 تابعونا على نفس المنصات" : "💙 Follow us on the same platforms"}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
                  {followLinks.map(l => (
                    <a key={l.platform} href={l.url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "0.375rem",
                        padding: "0.375rem 0.75rem", borderRadius: "var(--radius-md)",
                        border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)",
                        textDecoration: "none", color: "var(--text)", fontSize: "0.75rem", fontWeight: 600,
                        transition: "all 0.15s",
                      }}>
                      <span>{l.icon}</span>
                      <span>{l.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Platform links */}
          {hasPlatformLinks && (
            <div style={{ marginBottom: "1.5rem", textAlign: isAr ? "right" : "left" }}>
              <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.625rem", textAlign: "center" }}>
                {isAr ? "🔗 روابط إعلانك" : "🔗 Your ad links"}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {Object.entries(platformLinks).map(([platform, url]) => {
                  const meta = PLATFORM_META[platform];
                  if (!meta || !url) return null;
                  return (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: "0.625rem",
                        padding: "0.625rem 0.875rem", borderRadius: "var(--radius-md)",
                        border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)",
                        textDecoration: "none", transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: "1.125rem" }}>{meta.icon}</span>
                      <span style={{ flex: 1, fontSize: "0.8125rem", fontWeight: 600, color: "var(--text)" }}>
                        {isAr ? meta.ar : meta.en}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Link href={`/${locale}`} className="btn-primary" style={{ display: "block", textAlign: "center", height: 48, lineHeight: "48px", textDecoration: "none" }}>
              {isAr ? "الصفحة الرئيسية" : "View Homepage"}
            </Link>
            <Link href={`/${locale}/new`} className="btn-secondary" style={{ display: "block", textAlign: "center", height: 48, lineHeight: "48px", textDecoration: "none" }}>
              {isAr ? "نشر إعلان آخر" : "Post Another Ad"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
