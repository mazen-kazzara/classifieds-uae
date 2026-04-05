"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SuccessContent() {
  const sp = useSearchParams();
  const isFree = sp.get("free") === "true";

  useEffect(() => {
    const submissionId = sp.get("submissionId");
    if (!submissionId) return;
    fetch("/api/payments/success", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    });
  }, [sp]);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "3rem 2.5rem", textAlign: "center", maxWidth: "440px", width: "100%" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>{isFree ? "✅" : "🎉"}</div>
        <h1 style={{ color: "var(--text)", fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          {isFree ? "Ad Published!" : "Payment Successful!"}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", marginBottom: "0.5rem" }}>
          {isFree ? "Your free ad is now live." : "Your ad has been published and is now live."}
        </p>
        {isFree && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: "2rem" }}>
            It will be visible for <strong style={{ color: "var(--text)" }}>3 days</strong>. Upgrade to Normal or Featured for longer visibility.
          </p>
        )}
        {!isFree && <div style={{ marginBottom: "2rem" }} />}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Link href="/" className="btn-primary" style={{ display: "block", textAlign: "center", height: 48, lineHeight: "48px", textDecoration: "none" }}>
            View Homepage
          </Link>
          <Link href="/new" className="btn-secondary" style={{ display: "block", textAlign: "center", height: 48, lineHeight: "48px", textDecoration: "none" }}>
            Post Another Ad
          </Link>
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
