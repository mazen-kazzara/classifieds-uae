"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "@/lib/useTranslations";
import { usePathname, useRouter } from "next/navigation";


export default function Header() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: session, status } = useSession();
  const t = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.startsWith("/ar") ? "ar" : "en";
  const isRTL = locale === "ar";

  function toggleLocale() {
    const newLocale = locale === "en" ? "ar" : "en";
    document.cookie = `locale=${newLocale};path=/;max-age=${365 * 24 * 60 * 60}`;
    const strippedPath = pathname.replace(/^\/(en|ar)/, "") || "/";
    window.location.href = `/${newLocale}${strippedPath}`;
  }

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const preferred = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(preferred);
    document.documentElement.setAttribute("data-theme", preferred);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <header style={{ backgroundColor: "var(--surface)", borderBottom: "1.5px solid var(--border)" }} className="sticky top-0 z-50 shadow-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 h-[60px]">

          {/* Logo */}
          <Link href={`/${locale}`} className="flex-shrink-0 flex items-center gap-2">
            <img src="/Classifieds_uae_jpg.jpeg" alt="Classifieds UAE" style={{width: "36px", height: "36px"}} className="rounded-lg object-contain" />
            <span style={{ color: "var(--text)", fontFamily: "'Inter', sans-serif" }} className="text-lg font-bold hidden sm:block">
              Classifieds <span style={{ color: "#EF3B24" }}>U</span><span style={{ color: "#00B857" }}>A</span><span style={{ color: "var(--text)" }}>E</span>
            </span>
          </Link>

          {/* Search — desktop */}
          <form action={`/${locale}/search`} method="GET" className="flex-1 max-w-xl hidden sm:flex">
            <div style={{ border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)", borderRadius: "var(--radius-md)" }} className="flex w-full overflow-hidden transition-colors">
              <div className="flex items-center pl-3" style={{ color: "var(--text-muted)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <input
                name="q"
                type="text"
                placeholder={t("searchPlaceholder")}
                style={{ backgroundColor: "transparent", color: "var(--text)", outline: "none" }}
                className="flex-1 px-3 py-2 text-sm placeholder:text-[var(--text-muted)]"
              />
              <button
                type="submit"
                className="btn-primary rounded-none"
                style={{ borderRadius: "0 var(--radius-md) var(--radius-md) 0", height: "auto", padding: "0 1rem" }}
              >
                {t("search") ?? "Search"}
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search toggle — mobile */}
            <button
              className="btn-ghost sm:hidden"
              onClick={() => setSearchOpen(s => !s)}
              style={{ height: 36, width: 36, padding: 0 }}
              aria-label="Search"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>

            {/* Language toggle */}
            <button
              onClick={toggleLocale}
              className="btn-ghost"
              style={{ height: 36, padding: "0 0.625rem", fontSize: "0.8125rem", fontWeight: 700, letterSpacing: "0.02em" }}
              aria-label="Toggle language"
            >
              {locale === "en" ? "عربي" : "EN"}
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="btn-ghost"
              style={{ height: 36, width: 36, padding: 0 }}
              aria-label="Toggle theme"
            >
              {theme === "dark"
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
            </button>

            {/* Auth + Post Ad */}
            {status === "authenticated" ? (
              <>
                <Link href={`/${locale}/my-ads`} className="btn-ghost" style={{ height: 36, padding: "0 0.75rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--primary)" }}>
                  {t("myAds")}
                </Link>
                <button onClick={() => signOut({ callbackUrl: `/${locale}` })} className="btn-ghost" style={{ height: 36, padding: "0 0.75rem", fontSize: "0.8125rem" }}>
                  {t("signOut")}
                </button>
              </>
            ) : (
              <Link href={`/${locale}/login`} className="btn-ghost" style={{ height: 36, padding: "0 0.75rem", fontSize: "0.8125rem", fontWeight: 600 }}>
                {t("signIn")}
              </Link>
            )}
            <Link href={`/${locale}/new`} className="btn-primary gap-1" style={{ height: 36, padding: "0 0.875rem", fontSize: "0.8125rem" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>{t("postAd")}</span>
            </Link>
          </div>
        </div>

        {/* Search — mobile expanded */}
        {searchOpen && (
          <div className="pb-3 sm:hidden">
            <form action={`/${locale}/search`} method="GET">
              <div style={{ border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)", borderRadius: "var(--radius-md)" }} className="flex overflow-hidden">
                <input
                  name="q"
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  autoFocus
                  style={{ backgroundColor: "transparent", color: "var(--text)", outline: "none" }}
                  className="flex-1 px-4 py-2.5 text-sm placeholder:text-[var(--text-muted)]"
                />
                <button type="submit" className="btn-primary rounded-none" style={{ borderRadius: "0 var(--radius-md) var(--radius-md) 0", height: "auto", padding: "0 1rem" }}>
                  Go
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
