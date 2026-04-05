"use client";
import Link from "next/link";
import { useLocale } from "@/lib/useTranslations";
import { getTranslations } from "@/lib/getTranslations";


// links defined inside component to use t()

export default function Footer() {
  const locale = useLocale();
  const t = getTranslations(locale, "footer");
  return (
    <footer style={{ backgroundColor: "var(--surface-2)", borderTop: "1.5px solid var(--border)" }} className="mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <img src="/Classifieds_uae_jpg.jpeg" alt="Classifieds UAE" style={{width: "32px", height: "32px"}} className="rounded-lg object-contain" />
              <span style={{ color: "var(--text)", fontFamily: "'Inter', sans-serif" }} className="font-bold text-sm">
                Classifieds<span style={{ color: "var(--primary)" }}>UAE</span>
              </span>
            </Link>
            <p style={{ color: "var(--text-muted)" }} className="text-xs leading-relaxed">
              {t("tagline")}
            </p>
          </div>

          {/* Link groups */}
          {[
            { title: t("post"), links: [
              { label: t("postAd"), href: "/new?type=ad" },
              { label: t("postOffer"), href: "/new?type=offer" },
              { label: t("postService"), href: "/new?type=service" },
              { label: t("pricing"), href: "/pricing" },
            ]},
            { title: t("browse"), links: [
              { label: t("vehicles"), href: "/category/vehicles" },
              { label: t("realEstate"), href: "/category/real-estate" },
              { label: t("electronics"), href: "/category/electronics" },
              { label: t("jobs"), href: "/category/jobs" },
            ]},
            { title: t("legal"), links: [
              { label: t("terms"), href: "/terms" },
              { label: t("privacy"), href: "/privacy" },
            ]},
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 style={{ color: "var(--text)" }} className="text-sm font-semibold mb-3">{title}</h4>
              <ul className="space-y-2">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} style={{ color: "var(--text-muted)" }} className="text-xs hover:text-[var(--primary)] transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1.5px solid var(--border)", paddingTop: "1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", alignItems: "center", gap: "1rem" }}>
          {/* LEFT — ClassifiedsUAE */}
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
              © {new Date().getFullYear()} ClassifiedsUAE. {t("rights")}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{t("madeFor")}</p>
          </div>
          {/* CENTER — Shiffera */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("operatedBy")}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <img src="/shiffera-logo.svg" alt="Shiffera" style={{ height: "22px", width: "auto", borderRadius: "3px", background: "#fff", padding: "1px 5px" }} />
              <span style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>© Shiffera</span>
            </div>
          </div>
          {/* RIGHT — Ziina */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("paymentsBy")}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ color: "var(--text)", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "-0.01em" }}>Ziina</span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>© Ziina</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
