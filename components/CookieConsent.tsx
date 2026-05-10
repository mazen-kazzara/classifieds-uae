"use client";
import { useState, useEffect, useCallback } from "react";
// Meta Pixel is handled by MetaPixel component (polls for consent)

/**
 * GDPR/UAE-style cookie consent banner.
 *
 * - Blocks non-essential cookies (analytics, marketing) until consent
 * - Stores preferences in localStorage + cookie (accessible server-side)
 * - Injects Google Analytics ONLY after analytics consent
 * - "Manage Preferences" opens category toggles
 * - Floating settings icon appears after consent for changing preferences later
 * - Fully responsive + RTL-aware
 */

type CookieCategory = "necessary" | "analytics" | "marketing";

interface ConsentState {
  necessary: boolean;  // Always true — can't be disabled
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
}

const CONSENT_KEY = "cookie-consent";
const CONSENT_COOKIE = "cookie-consent-given";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

function getStoredConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function storeConsent(consent: ConsentState) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  // Also set a simple cookie so server/middleware can check consent
  document.cookie = `${CONSENT_COOKIE}=1;path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
}

function injectGA() {
  if (!GA_ID || document.getElementById("ga-script")) return;
  // gtag.js
  const s = document.createElement("script");
  s.id = "ga-script";
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  s.async = true;
  document.head.appendChild(s);
  // gtag init
  const s2 = document.createElement("script");
  s2.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_ID}', { anonymize_ip: true });
  `;
  document.head.appendChild(s2);
}

function removeGA() {
  document.getElementById("ga-script")?.remove();
  // Can't fully unload GA, but we prevent future tracking
}

export default function CookieConsent({ locale = "ar" }: { locale?: string }) {
  const [show, setShow] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showSettingsIcon, setShowSettingsIcon] = useState(false);
  const [prefs, setPrefs] = useState<ConsentState>({
    necessary: true,
    analytics: false,
    marketing: false,
    timestamp: 0,
  });
  const isAr = locale === "ar";

  useEffect(() => {
    const stored = getStoredConsent();
    if (stored) {
      // User already consented — apply their choices
      setPrefs(stored);
      if (stored.analytics) injectGA();
      setShowSettingsIcon(true);
    } else {
      // First visit — show the banner
      setShow(true);
    }
  }, []);

  const applyConsent = useCallback((consent: ConsentState) => {
    storeConsent(consent);
    setPrefs(consent);
    setShow(false);
    setShowPrefs(false);
    setShowSettingsIcon(true);
    if (consent.analytics) injectGA();
    else removeGA();
  }, []);

  const acceptAll = () => applyConsent({ necessary: true, analytics: true, marketing: true, timestamp: Date.now() });
  const rejectAll = () => applyConsent({ necessary: true, analytics: false, marketing: false, timestamp: Date.now() });
  const savePrefs = () => applyConsent({ ...prefs, necessary: true, timestamp: Date.now() });

  const openPrefs = () => {
    setShowPrefs(true);
    setShow(true);
    setShowSettingsIcon(false);
  };

  // Labels
  const t = {
    title: isAr ? "نحترم خصوصيتك" : "We respect your privacy",
    desc: isAr
      ? "نستخدم ملفات تعريف الارتباط لتحسين تجربتك. يمكنك اختيار الأنواع التي توافق عليها."
      : "We use cookies to improve your experience. You can choose which types you consent to.",
    acceptAll: isAr ? "قبول الكل" : "Accept All",
    rejectAll: isAr ? "رفض الكل" : "Reject All",
    manage: isAr ? "إدارة التفضيلات" : "Manage Preferences",
    save: isAr ? "حفظ التفضيلات" : "Save Preferences",
    necessary: isAr ? "ضروري" : "Necessary",
    necessaryDesc: isAr ? "مطلوب لعمل الموقع — لا يمكن تعطيله" : "Required for the site to function — cannot be disabled",
    analytics: isAr ? "تحليلات" : "Analytics",
    analyticsDesc: isAr ? "يساعدنا على فهم كيفية استخدام الموقع لتحسينه" : "Helps us understand how the site is used to improve it",
    marketing: isAr ? "تسويق" : "Marketing",
    marketingDesc: isAr ? "يُستخدم لعرض إعلانات ذات صلة باهتماماتك" : "Used to show ads relevant to your interests",
    settings: isAr ? "إعدادات الخصوصية" : "Privacy Settings",
  };

  // Floating settings icon (hidden for now — set SHOW_COOKIE_GEAR=true to enable)
  const SHOW_GEAR = false;
  const settingsIcon = SHOW_GEAR && showSettingsIcon && !show ? (
    <button
      onClick={openPrefs}
      title={t.settings}
      aria-label={t.settings}
      style={{
        position: "fixed",
        bottom: "4.5rem",
        ...(isAr ? { left: "1.25rem" } : { right: "1.25rem" }),
        zIndex: 9990,
        width: 40, height: 40,
        borderRadius: "50%",
        backgroundColor: "var(--surface)",
        border: "1.5px solid var(--border)",
        color: "var(--text-muted)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)"; }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>
  ) : null;

  if (!show && !showSettingsIcon) return null;
  if (!show) return settingsIcon;

  return (
    <>
      {settingsIcon}

      {/* Overlay */}
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.title}
          style={{
            width: "100%", maxWidth: 600,
            backgroundColor: "var(--surface)",
            borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
            padding: "1.5rem",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
            animation: "cookie-slide-up 0.3s ease-out",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "1.5rem" }}>🍪</span>
            <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.0625rem", margin: 0 }}>{t.title}</h2>
          </div>

          <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", lineHeight: 1.6, marginBottom: "1rem" }}>
            {t.desc}
          </p>

          {/* Preferences panel */}
          {showPrefs && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
              {/* Necessary — always on */}
              <CookieToggle
                label={t.necessary}
                desc={t.necessaryDesc}
                checked={true}
                disabled={true}
                onChange={() => {}}
              />
              {/* Analytics */}
              <CookieToggle
                label={t.analytics}
                desc={t.analyticsDesc}
                checked={prefs.analytics}
                disabled={false}
                onChange={v => setPrefs(p => ({ ...p, analytics: v }))}
              />
              {/* Marketing */}
              <CookieToggle
                label={t.marketing}
                desc={t.marketingDesc}
                checked={prefs.marketing}
                disabled={false}
                onChange={v => setPrefs(p => ({ ...p, marketing: v }))}
              />
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {showPrefs ? (
              <>
                <button onClick={savePrefs} className="btn-primary" style={{ flex: "1 1 auto", height: 40, fontSize: "0.8125rem", fontWeight: 700 }}>
                  {t.save}
                </button>
                <button onClick={acceptAll} className="btn-secondary" style={{ flex: "1 1 auto", height: 40, fontSize: "0.8125rem" }}>
                  {t.acceptAll}
                </button>
              </>
            ) : (
              <>
                <button onClick={acceptAll} className="btn-primary" style={{ flex: "1 1 auto", height: 40, fontSize: "0.8125rem", fontWeight: 700 }}>
                  {t.acceptAll}
                </button>
                <button onClick={rejectAll} className="btn-secondary" style={{ flex: "1 1 auto", height: 40, fontSize: "0.8125rem" }}>
                  {t.rejectAll}
                </button>
                <button onClick={() => setShowPrefs(true)} style={{
                  flex: "1 1 auto", height: 40, fontSize: "0.8125rem", fontWeight: 600,
                  background: "none", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)",
                  color: "var(--text-muted)", cursor: "pointer",
                }}>
                  {t.manage}
                </button>
              </>
            )}
          </div>

          {/* Privacy link */}
          <p style={{ textAlign: "center", marginTop: "0.75rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
            <a href={`/${locale}/privacy`} style={{ color: "var(--primary)", textDecoration: "underline" }}>
              {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
            </a>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes cookie-slide-up {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

/** Toggle switch for a cookie category */
function CookieToggle({ label, desc, checked, disabled, onChange }: {
  label: string; desc: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: "0.75rem",
      padding: "0.75rem",
      backgroundColor: "var(--surface-2)", borderRadius: "var(--radius-md)",
      border: "1px solid var(--border)",
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.7 : 1,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text)" }}>{label}</div>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.4, marginTop: "0.125rem" }}>{desc}</div>
      </div>
      {/* Toggle switch */}
      <div style={{ position: "relative", width: 44, height: 24, flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={e => onChange(e.target.checked)}
          style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: disabled ? "default" : "pointer", zIndex: 1, margin: 0 }}
          aria-label={label}
        />
        <div style={{
          width: 44, height: 24, borderRadius: 12,
          backgroundColor: checked ? "var(--primary)" : "var(--border)",
          transition: "background-color 0.2s",
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: "50%",
            backgroundColor: "#fff",
            position: "absolute", top: 3,
            left: checked ? 23 : 3,
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }} />
        </div>
      </div>
    </label>
  );
}
