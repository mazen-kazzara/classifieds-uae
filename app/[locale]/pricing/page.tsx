export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getTranslations } from "@/lib/getTranslations";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pricing | Classifieds UAE" };

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getTranslations(locale, "pricing");
  const isAr = locale === "ar";
  const packages = await prisma.package.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });

  const publishSentence = isAr
    ? "يمكن نشر إعلانك على الموقع، فيسبوك، انستقرام، X، أو قناة تيليغرام — بشكل فردي أو بأي مجموعة بناءً على اختيارك."
    : "Your ad can be published to the website, Facebook, Instagram, X, or Telegram channel — individually or in any combination based on your selection.";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }} dir={isAr ? "rtl" : "ltr"}>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-12">
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1 style={{ color: "var(--text)", fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.75rem" }}>{t("title")}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "1.0625rem" }}>{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" style={{ marginBottom: "2rem", alignItems: "stretch" }}>
          {packages.map(pkg => {
            const isStandard = pkg.name === "Standard";
            const isUAEFlag = pkg.name === "UAE Flag";
            const isHighlighted = isStandard || isUAEFlag;
            const isFree = pkg.price === 0;
            const isPromoActive = pkg.promoEndDate ? new Date() < new Date(pkg.promoEndDate) : false;

            return (
              <div key={pkg.id} style={{
                backgroundColor: "var(--surface)",
                border: isHighlighted ? "2.5px solid var(--primary)" : "1.5px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: isHighlighted ? "1.75rem 1.25rem" : "1.5rem 1.25rem",
                position: "relative",
                display: "flex", flexDirection: "column" as const,
                ...(isHighlighted ? {
                  boxShadow: "0 8px 32px color-mix(in srgb, var(--primary) 20%, transparent)",
                  zIndex: 1,
                } : {}),
              }}>
                {/* Badge */}
                {isStandard && (
                  <div style={{
                    position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)",
                    backgroundColor: "var(--primary)", color: "#fff",
                    fontSize: "0.7rem", fontWeight: 700,
                    padding: "0.25rem 1rem", borderRadius: 999, whiteSpace: "nowrap",
                  }}>
                    {isAr ? "الأفضل قيمة" : "Best Value"}
                  </div>
                )}
                {isUAEFlag && isPromoActive && (
                  <div style={{
                    position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)",
                    backgroundColor: "#D4AF37", color: "#000",
                    fontSize: "0.65rem", fontWeight: 700,
                    padding: "0.25rem 0.75rem", borderRadius: 999, whiteSpace: "nowrap",
                  }}>
                    {isAr ? "عرض الإطلاق — مجاني لفترة محدودة" : "Launch Offer — Free for limited time"}
                  </div>
                )}

                {/* Plan name */}
                <h3 style={{ color: "var(--text)", fontWeight: 700, fontSize: isHighlighted ? "1.25rem" : "1.125rem", marginBottom: "0.25rem" }}>
                  {isUAEFlag && <img src="https://flagcdn.com/w40/ae.png" alt="UAE" style={{ width: 20, height: 14, display: "inline-block", verticalAlign: "middle", marginInlineEnd: "0.375rem", borderRadius: 2 }} />}{isAr ? pkg.nameAr : pkg.name}
                </h3>
                {isUAEFlag && isPromoActive && (
                  <p style={{ fontSize: "0.7rem", color: "#D4AF37", fontWeight: 600, marginBottom: "0.25rem" }}>
                    {isAr ? "مجاني حتى 1 مايو — عرض الإطلاق" : "Free until May 1st — Launch Offer"}
                  </p>
                )}

                {/* Price */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <span style={{ fontSize: isHighlighted ? "2.5rem" : "2.25rem", fontWeight: 800, color: isHighlighted ? "var(--primary)" : "var(--text)" }}>
                    {isFree ? (isAr ? "مجاني" : "Free") : pkg.price}
                  </span>
                  {!isFree && (
                    <span style={{ fontSize: "0.9375rem", fontWeight: 500, color: "var(--text-muted)", marginInlineStart: "0.25rem" }}>
                      {isAr ? "د.إ" : "AED"}
                    </span>
                  )}
                </div>

                {/* ONLY chars + images — nothing else */}
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem", display: "flex", flexDirection: "column", gap: "0.625rem", marginTop: "auto" }}>
                  <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: "0.9rem" }}>✓</span>
                    {isAr ? `حتى ${pkg.maxChars} حرف` : `Up to ${pkg.maxChars} characters`}
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: "0.9rem" }}>✓</span>
                    {pkg.maxImages === 1
                      ? (isAr ? "صورة واحدة" : "1 image")
                      : (isAr ? `حتى ${pkg.maxImages} صور` : `Up to ${pkg.maxImages} images`)}
                  </li>
                </ul>

                {/* CTA */}
                <Link href={`/${locale}/new?packageId=${pkg.id}`}
                  className={isHighlighted ? "btn-primary" : "btn-secondary"}
                  style={{
                    display: "block", textAlign: "center",
                    height: isHighlighted ? 46 : 44,
                    lineHeight: isHighlighted ? "46px" : "44px",
                    textDecoration: "none",
                    fontSize: "0.875rem",
                    fontWeight: isHighlighted ? 700 : 600,
                  }}>
                  {isAr ? "اختر هذه الخطة" : "Choose this plan"}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Publishing sentence — outside plan cards */}
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: "3rem", maxWidth: "40rem", marginInline: "auto", lineHeight: 1.6 }}>
          {publishSentence}
        </p>

        <div style={{ textAlign: "center" }}>
          <Link href={`/${locale}/new`} className="btn-primary" style={{ height: 52, padding: "0 2.5rem", fontSize: "1rem", display: "inline-flex", textDecoration: "none" }}>
            {isAr ? "انشر إعلانك الآن" : "Post Your Ad Now"}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
