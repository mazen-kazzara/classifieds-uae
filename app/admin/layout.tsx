"use client";
import "../globals.css";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import AdminProviders from "./providers";

const NAV = [
  { href: "/admin/dashboard", labelEn: "Dashboard", labelAr: "لوحة التحكم" },
  { href: "/admin/banner", labelEn: "Banner", labelAr: "البانر" },
  { href: "/admin/submissions", labelEn: "Submissions", labelAr: "الطلبات" },
  { href: "/admin/ads", labelEn: "Ads", labelAr: "الإعلانات" },
  { href: "/admin/users", labelEn: "Users", labelAr: "المستخدمون" },
  { href: "/admin/categories", labelEn: "Categories", labelAr: "الفئات" },
  { href: "/admin/packages", labelEn: "Packages", labelAr: "الباقات" },
  { href: "/admin/pricing", labelEn: "Pricing", labelAr: "التسعير" },
  { href: "/admin/audit", labelEn: "Audit Log", labelAr: "سجل العمليات" },
  { href: "/admin/2fa", labelEn: "2FA Security", labelAr: "المصادقة الثنائية" },
];

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.getAttribute("data-theme") === "dark"); }, []);
  return (
    <button onClick={() => {
      const next = dark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
      setDark(!dark);
    }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-md)" }}
      title="Toggle theme">
      {dark
        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
    </button>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { status, data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [locale, setLocale] = useState("ar");

  useEffect(() => {
    const match = document.cookie.match(/locale=(\w+)/);
    if (match) setLocale(match[1]);
    const theme = localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  const isAr = locale === "ar";

  function toggleLocale() {
    const next = isAr ? "en" : "ar";
    document.cookie = `locale=${next};path=/;max-age=${365 * 24 * 60 * 60}`;
    setLocale(next);
  }

  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/admin/login") router.replace("/admin/login");
  }, [status, pathname, router]);

  if (status === "loading") return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>Loading...</div>
  );

  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", display: "flex", flexDirection: "column" }} dir={isAr ? "rtl" : "ltr"}>
      {/* ── Header ── */}
      <header style={{ backgroundColor: "var(--surface)", borderBottom: "1.5px solid var(--border)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 1rem", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Mobile menu */}
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)", fontSize: "1.25rem", padding: "0.25rem" }}>
              ☰
            </button>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
              <img src="/Classifieds_uae_jpg.jpeg" alt="Logo" style={{ width: 32, height: 32, borderRadius: 8 }} />
              <span style={{ fontWeight: 800, fontSize: "0.9375rem", color: "var(--text)", fontFamily: "'Inter', sans-serif" }}>
                Classifieds <span style={{ color: "#EF3B24" }}>U</span><span style={{ color: "#00B857" }}>A</span><span style={{ color: "var(--text)" }}>E</span>
              </span>
            </Link>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <button onClick={toggleLocale}
              style={{ height: 36, padding: "0 0.625rem", fontSize: "0.8125rem", fontWeight: 700, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", borderRadius: "var(--radius-md)" }}>
              {isAr ? "EN" : "عربي"}
            </button>
            <ThemeToggle />
            <Link href={`/${locale}`} style={{ height: 36, padding: "0 0.75rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--primary)", textDecoration: "none", display: "flex", alignItems: "center", borderRadius: "var(--radius-md)", border: "1.5px solid var(--primary)" }}>
              {isAr ? "الموقع" : "View Site"}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Body: sidebar + main ── */}
      <div style={{ flex: 1, display: "flex", maxWidth: 1400, width: "100%", margin: "0 auto" }}>
        {/* Sidebar overlay */}
        {sidebarOpen && <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 998 }} onClick={() => setSidebarOpen(false)} />}

        {/* Sidebar */}
        <aside style={{
          width: sidebarOpen ? 260 : 220, flexShrink: 0, backgroundColor: "var(--surface)",
          borderInlineEnd: "1.5px solid var(--border)",
          flexDirection: "column",
          display: sidebarOpen ? "flex" : undefined,
          ...(sidebarOpen ? { position: "fixed" as const, top: 0, bottom: 0, zIndex: 999, ...(isAr ? { right: 0 } : { left: 0 }) } : {}),
        }} className={sidebarOpen ? "" : "hidden lg:flex"}>
          {/* Mobile close */}
          {sidebarOpen && (
            <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--primary)" }}>{isAr ? "القائمة" : "Menu"}</span>
              <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.25rem" }}>✕</button>
            </div>
          )}

          {/* Admin badge */}
          <div style={{ padding: "1rem 1.25rem 0.75rem" }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{isAr ? "لوحة الإدارة" : "Admin Panel"}</p>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "0.25rem 0.625rem", display: "flex", flexDirection: "column", gap: "0.125rem", overflowY: "auto" }}>
            {NAV.map(item => {
              const active = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                  style={{
                    display: "block", padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)", fontSize: "0.8125rem", textDecoration: "none",
                    fontWeight: active ? 700 : 500, transition: "all 0.15s",
                    backgroundColor: active ? "color-mix(in srgb, var(--primary) 12%, var(--surface))" : "transparent",
                    color: active ? "var(--primary)" : "var(--text-muted)",
                  }}>
                  {isAr ? item.labelAr : item.labelEn}
                </Link>
              );
            })}
          </nav>

          {/* User + signout */}
          <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid var(--border)" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginBottom: "0.375rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {session?.user?.email || session?.user?.name || "Admin"}
            </p>
            <button onClick={() => signOut({ callbackUrl: "/admin/login" })}
              style={{ background: "none", border: "none", color: "var(--danger)", fontSize: "0.75rem", cursor: "pointer", padding: 0, fontWeight: 600 }}>
              {isAr ? "تسجيل الخروج" : "Sign out"}
            </button>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, minWidth: 0, padding: "1.5rem", overflowX: "hidden" }}>
          {children}
        </main>
      </div>

      {/* ── Footer ── */}
      <footer style={{ backgroundColor: "var(--surface-2)", borderTop: "1px solid var(--border)", padding: "1rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>
          © {new Date().getFullYear()} Classifieds <span style={{ color: "#EF3B24" }}>U</span><span style={{ color: "#00B857" }}>A</span><span style={{ color: "var(--text)" }}>E</span>
          {" · "}{isAr ? "صُنع للإمارات 🇦🇪" : "Made for the UAE 🇦🇪"}
          {" · "}{isAr ? "بواسطة" : "By"} Shiffera
          {" · "}{isAr ? "الدفع عبر" : "Payments by"} <strong>Ziina</strong>
        </p>
      </footer>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased" suppressHydrationWarning style={{ fontFamily: "'Inter', sans-serif" }}>
        <AdminProviders>
          <AdminLayoutInner>{children}</AdminLayoutInner>
        </AdminProviders>
      </body>
    </html>
  );
}
