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
  const packages = await prisma.package.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  const freePkg = packages.find(p => p.name === "Free");
  const normalPkg = packages.find(p => p.name === "Normal");
  const featuredPkg = packages.find(p => p.isFeatured);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1 style={{ color: "var(--text)", fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.75rem" }}>{t("title")}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "1.0625rem" }}>{t("subtitle")}</p>
        </div>

        {/* Plans */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", marginBottom: "3rem" }}>

          {/* FREE */}
          <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem" }}>
            <h3 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.25rem" }}>{t("free")}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: "1.25rem" }}>{t("freeDesc")}</p>
            <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--primary)", marginBottom: "1.5rem" }}>
              0 <span style={{ fontSize: "0.9375rem", fontWeight: 500, color: "var(--text-muted)" }}>AED</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.75rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {[
                { text: t("daysVisibility", { days: String(freePkg?.durationDays ?? 3) }), ok: true },
                { text: t("textOnly"), ok: true },
                { text: t("noImages"), ok: false },
                { text: t("standardPlacement"), ok: true },
              ].map(f => (
                <li key={f.text} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: f.ok ? "var(--text-muted)" : "var(--danger)" }}>
                  <span style={{ color: f.ok ? "var(--primary)" : "var(--danger)", fontWeight: 700 }}>{f.ok ? "✓" : "✗"}</span> {f.text}
                </li>
              ))}
            </ul>
            <Link href="/new" className="btn-secondary" style={{ display: "block", textAlign: "center", height: 44, lineHeight: "44px", textDecoration: "none" }}>{t("getStartedFree")}</Link>
          </div>

          {/* NORMAL */}
          <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem" }}>
            <h3 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.25rem" }}>{t("normal")}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: "1.25rem" }}>{t("normalDesc")}</p>
            <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--primary)", marginBottom: "0.25rem" }}>
              {normalPkg?.price ?? 10} <span style={{ fontSize: "0.9375rem", fontWeight: 500, color: "var(--text-muted)" }}>AED</span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "1.25rem" }}>+2.5 AED per image · max 15 AED total</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.75rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {[
                t("daysVisibility", { days: String(normalPkg?.durationDays ?? 7) }),
                "Up to 2 images (+2.5 AED each)",
                t("maxTotal"),
                t("standardPlacement"),
              ].map(f => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--primary)", fontWeight: 700 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/new" className="btn-secondary" style={{ display: "block", textAlign: "center", height: 44, lineHeight: "44px", textDecoration: "none" }}>{t("postNormal")}</Link>
          </div>

          {/* FEATURED */}
          <div style={{ backgroundColor: "var(--surface)", border: "2px solid var(--primary)", borderRadius: "var(--radius-lg)", padding: "1.75rem", position: "relative", boxShadow: "0 4px 24px color-mix(in srgb, var(--primary) 15%, transparent)" }}>
            <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", backgroundColor: "var(--primary)", color: "#fff", fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 1rem", borderRadius: 999, whiteSpace: "nowrap" }}>{t("mostPopular")}</div>
            <h3 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.25rem" }}>{t("featured")}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: "1.25rem" }}>{t("featuredDesc")}</p>
            <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--primary)", marginBottom: "0.25rem" }}>
              {featuredPkg?.price ?? 25} <span style={{ fontSize: "0.9375rem", fontWeight: 500, color: "var(--text-muted)" }}>AED</span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "1.25rem" }}>All-inclusive — no extra charges</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.75rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {[
                t("daysVisibility", { days: String(featuredPkg?.durationDays ?? 14) }),
                t("pinnedTop"),
                t("featuredBadge"),
                t("upToImagesIncluded"),
                t("allInclusive"),
              ].map(f => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--primary)", fontWeight: 700 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href={featuredPkg ? `/new?packageId=${featuredPkg.id}` : "/new"} className="btn-primary" style={{ display: "block", textAlign: "center", height: 44, lineHeight: "44px", textDecoration: "none" }}>{t("getFeatured")}</Link>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <Link href="/new" className="btn-primary" style={{ height: 52, padding: "0 2.5rem", fontSize: "1rem", display: "inline-flex" }}>{t("postNow")}</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
