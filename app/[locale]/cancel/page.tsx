import Link from "next/link";
import Header from "@/components/Header";

export default async function CancelPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === "ar";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", display: "flex", flexDirection: "column" }} dir={isAr ? "rtl" : "ltr"}>
      <Header />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "3rem 2.5rem", textAlign: "center", maxWidth: "440px", width: "100%" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>❌</div>
          <h1 style={{ color: "var(--text)", fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            {isAr ? "تم إلغاء الدفع" : "Payment Cancelled"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", marginBottom: "2rem" }}>
            {isAr ? "تم إلغاء عملية الدفع. لم يتم نشر إعلانك." : "Your payment was cancelled. Your ad has not been published."}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Link href={`/${locale}/new`} className="btn-primary" style={{ display: "block", textAlign: "center", height: 48, lineHeight: "48px", textDecoration: "none" }}>
              {isAr ? "حاول مرة أخرى" : "Try Again"}
            </Link>
            <Link href={`/${locale}`} className="btn-secondary" style={{ display: "block", textAlign: "center", height: 48, lineHeight: "48px", textDecoration: "none" }}>
              {isAr ? "الصفحة الرئيسية" : "Go Home"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
