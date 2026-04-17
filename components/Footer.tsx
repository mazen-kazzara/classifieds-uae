"use client";
import Link from "next/link";
import { useLocale } from "@/lib/useTranslations";
import { getTranslations } from "@/lib/getTranslations";
import { useEffect, useState } from "react";

interface FooterCat { labelEn: string; labelAr: string; slug: string; }

export default function Footer() {
  const locale = useLocale();
  const t = getTranslations(locale, "footer");
  const isAr = locale === "ar";

  const [categories, setCategories] = useState<FooterCat[]>([]);
  useEffect(() => {
    fetch("/api/public/categories").then(r => r.json()).then(d => {
      if (d.ok) setCategories(d.categories.map((c: any) => ({ labelEn: c.name, labelAr: c.nameAr, slug: c.slug })));
    });
  }, []);

  const sectionTitle: React.CSSProperties = {
    color: "var(--text)", fontSize: "0.8125rem", fontWeight: 700, marginBottom: "0.75rem", letterSpacing: "0.01em",
  };
  const linkStyle: React.CSSProperties = {
    color: "var(--text-muted)", fontSize: "0.75rem", textDecoration: "none", transition: "color 0.15s",
  };

  return (
    <footer style={{ backgroundColor: "var(--surface-2)", borderTop: "1.5px solid var(--border)" }} className="mt-12" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6" style={{ paddingTop: "2.5rem", paddingBottom: "1.5rem" }}>

        {/* ── Top section: Brand + Link groups ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "2rem", marginBottom: "2rem" }}>

          {/* Brand */}
          <div>
            <Link href={`/${locale}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", marginBottom: "0.625rem" }}>
              <img src="/Classifieds_uae_jpg.jpeg" alt="Classifieds UAE" style={{ width: 28, height: 28, borderRadius: 6 }} />
              <span style={{ color: "var(--text)", fontFamily: "var(--font-inter), sans-serif", fontWeight: 800, fontSize: "0.875rem" }}>
                Classifieds <span style={{ color: "#EF3B24" }}>U</span><span style={{ color: "#00B857" }}>A</span><span style={{ color: "var(--text)" }}>E</span>
              </span>
            </Link>
            <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", lineHeight: 1.6, marginTop: "0.5rem", maxWidth: 200 }}>
              {t("tagline")}
            </p>
          </div>

          {/* Post */}
          <div>
            <h4 style={sectionTitle}>{t("post")}</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <li><Link href={`/${locale}/new?type=ad`} style={linkStyle}>{t("postAd")}</Link></li>
              <li><Link href={`/${locale}/new?type=offer`} style={linkStyle}>{t("postOffer")}</Link></li>
              <li><Link href={`/${locale}/new?type=service`} style={linkStyle}>{t("postService")}</Link></li>
              <li><Link href={`/${locale}/pricing`} style={linkStyle}>{t("pricing")}</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div style={{ gridColumn: "span 2" }}>
            <h4 style={sectionTitle}>{t("browse")}</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.375rem 1.5rem" }}>
              {categories.map(cat => (
                <Link key={cat.slug} href={`/${locale}/category/${cat.slug}`} style={linkStyle}>
                  {isAr ? cat.labelAr : cat.labelEn}
                </Link>
              ))}
            </div>
          </div>

          {/* Emirates */}
          <div>
            <h4 style={sectionTitle}>{isAr ? "الإمارات" : "Emirates"}</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {[
                { en: "Abu Dhabi", ar: "أبوظبي" },
                { en: "Dubai", ar: "دبي" },
                { en: "Sharjah", ar: "الشارقة" },
                { en: "Ajman", ar: "عجمان" },
                { en: "Umm Al Quwain", ar: "أم القيوين" },
                { en: "Ras Al Khaimah", ar: "رأس الخيمة" },
                { en: "Fujairah", ar: "الفجيرة" },
                { en: "All UAE", ar: "كل الإمارات" },
              ].map(e => (
                <li key={e.en}><Link href={`/${locale}`} style={linkStyle}>{isAr ? e.ar : e.en}</Link></li>
              ))}
            </ul>
          </div>

          {/* Legal & Info */}
          <div>
            <h4 style={sectionTitle}>{t("legal")}</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <li><Link href={`/${locale}/about`} style={linkStyle}>{isAr ? "من نحن" : "About Us"}</Link></li>
              <li><Link href={`/${locale}/faq`} style={linkStyle}>{isAr ? "الأسئلة الشائعة" : "FAQ"}</Link></li>
              <li><Link href={`/${locale}/go`} style={linkStyle}>{isAr ? "تواصل معنا" : "Contact Us"}</Link></li>
              <li><Link href={`/${locale}/terms`} style={linkStyle}>{t("terms")}</Link></li>
              <li><Link href={`/${locale}/privacy`} style={linkStyle}>{t("privacy")}</Link></li>
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "0.375rem 1.5rem" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>
            © {new Date().getFullYear()} Classifieds <span style={{ color: "#EF3B24" }}>U</span><span style={{ color: "#00B857" }}>A</span><span style={{ color: "var(--text)" }}>E</span>
          </span>
          <span style={{ color: "var(--border)", fontSize: "0.65rem" }}>·</span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>{isAr ? "صُنع للإمارات 🇦🇪" : "Made for the UAE 🇦🇪"}</span>
          <span style={{ color: "var(--border)", fontSize: "0.65rem" }}>·</span>
          <a href="https://shiffera.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", fontSize: "0.65rem", textDecoration: "none" }}>
            {isAr ? "بواسطة" : "Powered by"} <span style={{ fontWeight: 700, color: "var(--text)" }}>Shiffera.com</span>
          </a>
          <span style={{ color: "var(--border)", fontSize: "0.65rem" }}>·</span>
          <a href="https://ziina.com/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", fontSize: "0.65rem", textDecoration: "none" }}>
            {isAr ? "الدفع عبر" : "Payments by"}{" "}
            <span style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.7rem" }}>Ziina</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
