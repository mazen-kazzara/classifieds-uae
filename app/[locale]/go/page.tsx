"use client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";


const WhatsAppIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
const TelegramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);
const InstagramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
  </svg>
);
const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);
const ThreadsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.784 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.187.408-2.248 1.33-2.986.88-.706 2.099-1.107 3.696-1.217 1.074-.074 2.082-.038 3.016.082-.088-.986-.453-1.748-1.084-2.252-.724-.578-1.788-.876-3.164-.888h-.036c-1.048.009-1.958.259-2.702.744l-1.068-1.722c1.05-.685 2.313-1.04 3.757-1.055h.047c1.814.015 3.258.463 4.29 1.332 1.005.846 1.598 2.043 1.762 3.56.802.176 1.533.452 2.16.84 1.076.666 1.894 1.616 2.368 2.748.696 1.66.768 4.336-1.312 6.373-1.858 1.822-4.14 2.614-7.39 2.636zm.093-7.065c-.088 0-.177.002-.266.006-1.738.12-2.61.859-2.562 1.713.024.434.292.876.755 1.176.577.374 1.342.558 2.157.515 1.104-.06 1.933-.44 2.466-1.13.36-.467.6-1.075.716-1.815-.86-.2-1.758-.318-2.692-.35-.19-.007-.385-.016-.574-.016v.001z"/>
  </svg>
);
const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const LINKS = [
  { labelEn: "Post Your Ad", labelAr: "انشر إعلانك", descEn: "Free & paid plans available", descAr: "خطط مجانية ومدفوعة متاحة", href: "https://classifiedsuae.ae", Icon: PlusIcon, accent: "var(--primary)", primary: true },
  { labelEn: "Facebook", labelAr: "فيسبوك", descEn: "Like our page for daily deals", descAr: "تابع صفحتنا لأفضل العروض اليومية", href: "https://facebook.com/classifiedsuaeofficial", Icon: FacebookIcon, accent: "#1877F2", primary: false },
  { labelEn: "Instagram", labelAr: "إنستغرام", descEn: "Follow us on Instagram", descAr: "تابعنا على إنستغرام", href: "https://instagram.com/classifiedsuaeofficial", Icon: InstagramIcon, accent: "#E1306C", primary: false },
  { labelEn: "X (Twitter)", labelAr: "X (تويتر)", descEn: "@clasifiedsuae", descAr: "@clasifiedsuae", href: "https://x.com/clasifiedsuae", Icon: XIcon, accent: "var(--text)", primary: false },
  { labelEn: "Telegram Channel", labelAr: "قناة تيليغرام", descEn: "Browse ads on Telegram", descAr: "تصفح الإعلانات على تيليغرام", href: "https://t.me/classifiedsuaeofficial", Icon: TelegramIcon, accent: "#229ED9", primary: false },
  { labelEn: "WhatsApp Channel", labelAr: "قناة واتساب", descEn: "Get notified about new ads", descAr: "احصل على إشعارات بالإعلانات الجديدة", href: "https://whatsapp.com/channel/0029Vb6jcHdDDmFX0Pp7ej34", Icon: WhatsAppIcon, accent: "#25D366", primary: false },
  { labelEn: "Threads", labelAr: "ثريدز", descEn: "@classifiedsuaeofficial", descAr: "@classifiedsuaeofficial", href: "https://www.threads.com/@classifiedsuaeofficial", Icon: ThreadsIcon, accent: "var(--text)", primary: false },
];

export default function GoPage() {
  const params = useParams();
  const isAr = params?.locale === "ar";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{ minHeight: "100vh", backgroundColor: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <Header />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2.5rem 1rem" }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", backgroundColor: "color-mix(in srgb, var(--primary) 12%, var(--surface))", border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)", borderRadius: 999, padding: "0.3rem 0.875rem", fontSize: "0.72rem", fontWeight: 700, color: "var(--primary)", marginBottom: "1rem", letterSpacing: "0.05em", textTransform: "uppercase" as const }}>
              🇦🇪 {isAr ? "منصة الإعلانات المبوبة في الإمارات" : "UAE Classifieds Platform"}
            </div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.375rem", lineHeight: 1.2 }}>
              {isAr ? "بيع · اشتري · أعلن" : "Sell · Buy · Advertise"}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
              {isAr ? "كل ما تحتاجه في مكان واحد" : "Everything you need, in one place"}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {/* Post Your Ad — with platform icons */}
            <div style={{ backgroundColor: "var(--primary)", borderRadius: "var(--radius-md)", boxShadow: "0 4px 20px rgba(0,0,0,0.18)", opacity: mounted ? 1 : 0, transition: "transform 0.15s, box-shadow 0.15s", overflow: "hidden" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px) scale(1.01)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.22)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.18)"; }}
            >
              <div style={{ padding: "1rem 1.125rem", display: "flex", alignItems: "center", gap: "0.875rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", backgroundColor: "rgba(255,255,255,0.2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <PlusIcon />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#fff", lineHeight: 1.3 }}>{isAr ? "انشر إعلانك" : "Post Your Ad"}</div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.72)", marginTop: "0.1rem" }}>{isAr ? "اختر المنصة المناسبة لك" : "Choose your preferred platform"}</div>
                </div>
              </div>
              <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
                {/* Website */}
                <a href={`/${isAr ? "ar" : "en"}/new`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "0.75rem 0", color: "#fff", textDecoration: "none", fontSize: "0.8125rem", fontWeight: 700, borderRight: "1px solid rgba(255,255,255,0.15)", transition: "background 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/Classifieds_uae_jpg.jpeg" alt="Website" style={{ width: 18, height: 18, borderRadius: 4 }} />
                  🌐 {isAr ? "الموقع" : "Website"}
                </a>
                {/* Telegram Bot */}
                <a href="https://t.me/classifiedsuae_bot" target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "0.75rem 0", color: "#fff", textDecoration: "none", fontSize: "0.8125rem", fontWeight: 700, transition: "background 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <TelegramIcon />
                  🤖 {isAr ? "بوت تيليغرام" : "Telegram Bot"}
                </a>
              </div>
            </div>

            {/* Follow us badge */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: "0.75rem" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", backgroundColor: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 999, padding: "0.4rem 1rem", fontSize: "0.8rem", fontWeight: 700, color: "#DC2626", letterSpacing: "0.01em" }}>
                ❤️ {isAr ? "تابعنا على منصات التواصل" : "Follow us on social media"}
              </div>
            </div>

            {/* Social links grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {LINKS.filter(l => !l.primary).map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.625rem 0.75rem", backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", textDecoration: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s", opacity: mounted ? 1 : 0, cursor: "pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)"; e.currentTarget.style.borderColor = link.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "var(--surface-2)", color: link.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <link.Icon />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--text)", lineHeight: 1.2 }}>{isAr ? link.labelAr : link.labelEn}</div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{isAr ? link.descAr : link.descEn}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
