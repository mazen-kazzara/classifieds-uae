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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1.25rem", marginBottom: "1.5rem" }}>

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
              <li><Link href={`/${locale}/register/company`} style={{ ...linkStyle, color: "var(--primary)", fontWeight: 600 }}>
                {isAr ? "🏢 سجّل شركتك" : "🏢 Register your company"}
              </Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div style={{ gridColumn: "span 2" }} className="col-span-full sm:col-span-2">
            <h4 style={sectionTitle}>{t("browse")}</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.25rem 0.75rem" }}>
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
                { value: "abu-dhabi",          en: "Abu Dhabi",          ar: "أبوظبي" },
                { value: "abu-dhabi-al-ain",   en: "Abu Dhabi - Al Ain", ar: "أبوظبي - العين" },
                { value: "dubai",              en: "Dubai",              ar: "دبي" },
                { value: "sharjah",            en: "Sharjah",            ar: "الشارقة" },
                { value: "ajman",              en: "Ajman",              ar: "عجمان" },
                { value: "umm-al-quwain",      en: "Umm Al Quwain",     ar: "أم القيوين" },
                { value: "ras-al-khaimah",      en: "Ras Al Khaimah",    ar: "رأس الخيمة" },
                { value: "fujairah",           en: "Fujairah",           ar: "الفجيرة" },
              ].map(e => (
                <li key={e.value}><Link href={`/${locale}/search?location=${e.value}`} style={linkStyle}>{isAr ? e.ar : e.en}</Link></li>
              ))}
            </ul>
          </div>

          {/* Legal & Info */}
          <div>
            <h4 style={sectionTitle}>{t("legal")}</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <li><Link href={`/${locale}/about`} style={linkStyle}>{isAr ? "من نحن" : "About Us"}</Link></li>
              <li><Link href={`/${locale}/blog`} style={linkStyle}>{isAr ? "المدوّنة" : "Blog"}</Link></li>
              <li><Link href={`/${locale}/faq`} style={linkStyle}>{isAr ? "الأسئلة الشائعة" : "FAQ"}</Link></li>
              <li><Link href={`/${locale}/classified`} style={linkStyle}>{isAr ? "تواصل معنا" : "Contact Us"}</Link></li>
              <li><Link href={`/${locale}/terms`} style={linkStyle}>{t("terms")}</Link></li>
              <li><Link href={`/${locale}/privacy`} style={linkStyle}>{t("privacy")}</Link></li>
            </ul>
          </div>
        </div>

        {/* ── Follow Us ── */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem", paddingBottom: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.875rem" }}>
          <p style={{ color: "var(--text)", fontSize: "0.8125rem", fontWeight: 700, margin: 0, letterSpacing: "0.01em" }}>
            {isAr ? "تابعنا على" : "Follow us on"}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
            {/* Facebook */}
            <a href="https://facebook.com/classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" aria-label="Facebook"
              style={{ width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s, box-shadow 0.2s", textDecoration: "none" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(24,119,242,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            {/* Instagram */}
            <a href="https://instagram.com/classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
              style={{ width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s, box-shadow 0.2s", textDecoration: "none" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(228,64,95,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}>
              <svg width="24" height="24" viewBox="0 0 24 24"><defs><radialGradient id="ig" r="150%" cx="30%" cy="107%"><stop offset="0" stopColor="#fdf497"/><stop offset=".05" stopColor="#fdf497"/><stop offset=".45" stopColor="#fd5949"/><stop offset=".6" stopColor="#d6249f"/><stop offset=".9" stopColor="#285AEB"/></radialGradient></defs><path fill="url(#ig)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            {/* X (Twitter) */}
            <a href="https://x.com/clasifiedsuae" target="_blank" rel="noopener noreferrer" aria-label="X"
              style={{ width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s, box-shadow 0.2s", textDecoration: "none" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(255,255,255,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--text)"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            {/* Telegram */}
            <a href="https://t.me/classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" aria-label="Telegram"
              style={{ width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s, box-shadow 0.2s", textDecoration: "none" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(38,165,228,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#26A5E4"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            </a>
            {/* WhatsApp Channel */}
            <a href="https://whatsapp.com/channel/0029Vb6jcHdDDmFX0Pp7ej34" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Channel"
              style={{ width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s, box-shadow 0.2s", textDecoration: "none" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,211,102,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
            {/* YouTube */}
            <a href="https://www.youtube.com/@classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" aria-label="YouTube"
              style={{ width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s, box-shadow 0.2s", textDecoration: "none" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(255,0,0,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
            {/* Threads */}
            <a href="https://www.threads.com/@classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" aria-label="Threads"
              style={{ width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s, box-shadow 0.2s", textDecoration: "none" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(255,255,255,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--text)"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01c.028-3.576.878-6.43 2.523-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.592 12c.024 3.088.715 5.5 2.053 7.164 1.43 1.783 3.63 2.698 6.539 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.187.408-2.281 1.332-3.08.857-.742 2.063-1.2 3.59-1.364.994-.106 2.001-.075 2.988.092-.14-.751-.44-1.318-.896-1.694-.585-.483-1.44-.733-2.543-.744l-.124-.002c-1.263 0-2.34.354-3.11 1.023l-1.355-1.56C8.61 4.464 10.123 3.88 11.89 3.88l.17.002c1.604.02 2.903.458 3.86 1.302.896.79 1.476 1.882 1.727 3.248.773.141 1.48.37 2.114.69 1.068.539 1.882 1.353 2.364 2.36.856 1.79.756 4.618-1.351 6.676-1.794 1.755-4.042 2.626-7.278 2.675h-.005l.001.001zM11.29 17.96c.053 0 .108-.002.163-.005 1.652-.09 2.507-1.071 2.605-2.997-.46-.083-.94-.133-1.432-.148-1.15-.028-2.07.17-2.662.573-.47.32-.744.78-.714 1.322.038.655.577 1.255 1.84 1.255h.2z"/></svg>
            </a>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "0.25rem 0.75rem" }}>
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
