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

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }} dir={isAr ? "rtl" : "ltr"}>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-12">
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1 style={{ color: "var(--text)", fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.75rem" }}>{t("title")}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "1.0625rem" }}>{t("subtitle")}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(packages.length, 4)}, 1fr)`, gap: "1.25rem", marginBottom: "3rem" }}>
          {packages.map(pkg => {
            const isFeatured = pkg.isFeatured;
            const isFree = pkg.price === 0;
            const features: { text: string; ok: boolean }[] = [];

            features.push({ text: isAr ? `ظهور ${pkg.durationDays} أيام` : `${pkg.durationDays} days visibility`, ok: true });

            if (isFree) {
              features.push({ text: isAr ? "نص فقط" : "Text only", ok: true });
              features.push({ text: isAr ? "بدون صور" : "No images", ok: false });
            } else {
              if (pkg.maxImages > 0) {
                features.push({ text: isAr ? `حتى ${pkg.maxImages} صور` : `Up to ${pkg.maxImages} images`, ok: true });
              }
              if (isFeatured) {
                features.push({ text: isAr ? "مثبّت في أعلى القوائم" : "Pinned at top", ok: true });
                features.push({ text: isAr ? "شارة مميزة على إعلانك" : "Featured badge", ok: true });
                features.push({ text: isAr ? "سعر شامل" : "All-inclusive price", ok: true });
              } else {
                features.push({ text: isAr ? "ترتيب قياسي" : "Standard placement", ok: true });
              }
            }

            if (pkg.isPinned && !isFeatured) {
              features.push({ text: isAr ? "مثبّت في الأعلى" : "Pinned at top", ok: true });
            }
            if (pkg.includesTelegram) {
              features.push({ text: isAr ? "نشر على تيليغرام" : "Published on Telegram", ok: true });
            }

            return (
              <div key={pkg.id} style={{
                backgroundColor: "var(--surface)",
                border: isFeatured ? "2px solid var(--primary)" : "1.5px solid var(--border)",
                borderRadius: "var(--radius-lg)", padding: "1.75rem", position: "relative",
                ...(isFeatured ? { boxShadow: "0 4px 24px color-mix(in srgb, var(--primary) 15%, transparent)" } : {}),
              }}>
                {isFeatured && (
                  <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", backgroundColor: "var(--primary)", color: "#fff", fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 1rem", borderRadius: 999, whiteSpace: "nowrap" }}>
                    {isAr ? "الأكثر شعبية" : "Most Popular"}
                  </div>
                )}

                <h3 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.25rem" }}>
                  {isAr ? pkg.nameAr : pkg.name}
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: "1.25rem" }}>
                  {isFree ? (isAr ? "ابدأ بدون تكلفة" : "Get started for free")
                    : isFeatured ? (isAr ? "مثبّت في أعلى القوائم" : "Pinned at the top")
                    : (isAr ? "إدراج قياسي مع صور" : "Standard listing with images")}
                </p>

                <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--primary)", marginBottom: "1.5rem" }}>
                  {pkg.price} <span style={{ fontSize: "0.9375rem", fontWeight: 500, color: "var(--text-muted)" }}>
                    {isAr ? "د.إ" : "AED"}
                  </span>
                </div>

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.75rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {features.map(f => (
                    <li key={f.text} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: f.ok ? "var(--text-muted)" : "var(--danger)" }}>
                      <span style={{ color: f.ok ? "var(--primary)" : "var(--danger)", fontWeight: 700 }}>{f.ok ? "✓" : "✗"}</span> {f.text}
                    </li>
                  ))}
                </ul>

                <Link href={`/${locale}/new?packageId=${pkg.id}`}
                  className={isFeatured ? "btn-primary" : "btn-secondary"}
                  style={{ display: "block", textAlign: "center", height: 44, lineHeight: "44px", textDecoration: "none" }}>
                  {isFree ? (isAr ? "ابدأ مجاناً" : "Start Free")
                    : isFeatured ? (isAr ? "احصل على المميز" : "Get Featured")
                    : (isAr ? `انشر إعلاناً بـ ${pkg.price} د.إ` : `Post for ${pkg.price} AED`)}
                </Link>
              </div>
            );
          })}
        </div>

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
