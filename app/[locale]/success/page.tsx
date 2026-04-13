"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";

function SuccessContent() {
  const sp = useSearchParams();
  const pathname = usePathname();
  const isAr = pathname.startsWith("/ar");
  const locale = isAr ? "ar" : "en";
  const isFree = sp.get("free") === "true";
  const [adInfo, setAdInfo] = useState<{ days?: number; title?: string } | null>(null);

  useEffect(() => {
    const submissionId = sp.get("submissionId");
    if (!submissionId) return;
    fetch("/api/payments/success", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    }).then(r => r.json()).then(d => {
      if (d.ok && d.days) setAdInfo({ days: d.days, title: d.title });
    }).catch(() => {});
  }, [sp]);

  const days = adInfo?.days;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", display: "flex", flexDirection: "column" }} dir={isAr ? "rtl" : "ltr"}>
      <Header />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "3rem 2.5rem", textAlign: "center", maxWidth: "440px", width: "100%" }}>
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
            <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: "2rem" }}>
              {isAr
                ? <>سيكون مرئياً لمدة <strong style={{ color: "var(--text)" }}>{days} أيام</strong>.</>
                : <>It will be visible for <strong style={{ color: "var(--text)" }}>{days} days</strong>.</>}
            </p>
          )}
          {!days && <div style={{ marginBottom: "2rem" }} />}
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
