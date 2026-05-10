"use client";
import { useState, useEffect, useCallback } from "react";

/**
 * Floating PWA Install button.
 *
 * ONLY shows when the browser has confirmed the app is installable
 * (beforeinstallprompt event fired). This means:
 *  - Chrome/Edge/Samsung: one tap → native install dialog → done
 *  - Safari/Firefox: button never appears (they don't support programmatic install)
 *
 * Disappears permanently after install or dismiss (per-device via localStorage).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallApp({ locale = "ar" }: { locale?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const isAr = locale === "ar";

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Already installed as PWA → never show
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) return;

    // Already handled on this device → never show
    if (localStorage.getItem("pwa-installed") || localStorage.getItem("pwa-dismissed")) return;

    // ONLY show when browser confirms installability (Chrome/Edge/Samsung)
    // This guarantees one-tap install — no manual instructions ever.
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true); // Show ONLY when we have the prompt ready
    };
    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      localStorage.setItem("pwa-installed", "1");
      setVisible(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        localStorage.setItem("pwa-installed", "1");
      }
    } catch {}
    setVisible(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = () => {
    localStorage.setItem("pwa-dismissed", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          bottom: 24,
          ...(isAr ? { left: 20 } : { right: 20 }),
          zIndex: 9998,
          animation: "pwa-slide-in 0.4s ease-out",
        }}
      >
        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          style={{
            position: "absolute", top: -8,
            ...(isAr ? { right: -8 } : { left: -8 }),
            width: 22, height: 22, borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.5)", color: "#fff",
            border: "none", cursor: "pointer", fontSize: "0.65rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1,
          }}
          aria-label="Close"
        >✕</button>

        {/* Install — one tap, native dialog */}
        <button
          onClick={handleInstall}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.75rem 1.25rem",
            backgroundColor: "var(--primary)", color: "#fff",
            border: "none", borderRadius: "999px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.25), 0 0 0 3px rgba(16,185,129,0.2)",
            cursor: "pointer", fontSize: "0.8125rem", fontWeight: 700,
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {isAr ? "تثبيت التطبيق" : "Install App"}
        </button>
      </div>

      <style>{`
        @keyframes pwa-slide-in {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
