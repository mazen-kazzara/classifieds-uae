"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function FloatingButtons() {
  const [showTop, setShowTop] = useState(false);
  const [showWaTip, setShowWaTip] = useState(false);
  const [showTgTip, setShowTgTip] = useState(false);
  const pathname = usePathname();
  const isRTL = pathname.startsWith("/ar");

  useEffect(() => {
    function onScroll() {
      setShowTop(window.scrollY > 400);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tooltipSide = isRTL ? { right: 56 } : { left: 56 };

  return (
    <>
      {/* WhatsApp Bot — top floating button */}
      <div style={{
        position: "fixed", bottom: "7.75rem", zIndex: 999,
        ...(isRTL ? { right: "1.25rem" } : { left: "1.25rem" }),
      }}>
        {/* Tooltip */}
        <div style={{
          position: "absolute", top: "50%", transform: "translateY(-50%)",
          ...tooltipSide,
          opacity: showWaTip ? 1 : 0,
          transition: "opacity 0.2s",
          pointerEvents: "none",
          backgroundColor: "var(--surface)", color: "var(--text)",
          border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "0.35rem 0.625rem",
          fontSize: "0.7rem", fontWeight: 600,
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}>
          {isRTL ? "أنشئ إعلانك عبر واتساب" : "Post your ad via WhatsApp"}
        </div>

        <a
          href="https://wa.me/971541807675?text=start"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp Bot"
          onMouseEnter={e => { setShowWaTip(true); e.currentTarget.style.transform = "scale(1.1)"; }}
          onMouseLeave={e => { setShowWaTip(false); e.currentTarget.style.transform = "scale(1)"; }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 48, height: 48, borderRadius: "50%",
            backgroundColor: "#25D366", color: "#fff",
            boxShadow: "0 4px 14px rgba(37,211,102,0.35)",
            transition: "transform 0.15s",
            cursor: "pointer", textDecoration: "none",
          }}
        >
          {/* WhatsApp speech bubble + robot face */}
          <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
            {/* WhatsApp speech bubble outline */}
            <path d="M24 4C12.95 4 4 12.07 4 22c0 3.53 1.12 6.8 3.02 9.56L4.5 43l11.8-2.4C18.7 41.5 21.3 42 24 42c11.05 0 20-8.07 20-18S35.05 4 24 4z" fill="#fff"/>
            {/* Bot antenna */}
            <line x1="24" y1="11" x2="24" y2="15" stroke="#25D366" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="24" cy="10" r="1.8" fill="#25D366"/>
            {/* Bot head */}
            <rect x="14" y="16" width="20" height="14" rx="4" fill="#25D366"/>
            {/* Bot eyes */}
            <circle cx="20" cy="22" r="2.2" fill="#fff"/>
            <circle cx="28" cy="22" r="2.2" fill="#fff"/>
            {/* Bot mouth */}
            <rect x="19" y="26.5" width="10" height="2" rx="1" fill="#fff"/>
          </svg>
        </a>
      </div>

      {/* Telegram Bot — middle floating button */}
      <div style={{
        position: "fixed", bottom: "4.5rem", zIndex: 999,
        ...(isRTL ? { right: "1.25rem" } : { left: "1.25rem" }),
      }}>
        {/* Tooltip */}
        <div style={{
          position: "absolute", top: "50%", transform: "translateY(-50%)",
          ...tooltipSide,
          opacity: showTgTip ? 1 : 0,
          transition: "opacity 0.2s",
          pointerEvents: "none",
          backgroundColor: "var(--surface)", color: "var(--text)",
          border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "0.35rem 0.625rem",
          fontSize: "0.7rem", fontWeight: 600,
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}>
          {isRTL ? "أنشئ إعلانك عبر تيليغرام" : "Post your ad via Telegram"}
        </div>

        <a
          href="https://t.me/classifiedsuae_bot"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Telegram Bot"
          onMouseEnter={e => { setShowTgTip(true); e.currentTarget.style.transform = "scale(1.1)"; }}
          onMouseLeave={e => { setShowTgTip(false); e.currentTarget.style.transform = "scale(1)"; }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 48, height: 48, borderRadius: "50%",
            backgroundColor: "#229ED9", color: "#fff",
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
            transition: "transform 0.15s",
            cursor: "pointer", textDecoration: "none",
          }}
        >
          {/* Telegram circle + robot face */}
          <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
            {/* Telegram circle */}
            <circle cx="24" cy="24" r="22" fill="#fff"/>
            {/* Bot antenna */}
            <line x1="24" y1="9" x2="24" y2="13" stroke="#229ED9" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="24" cy="8" r="1.8" fill="#229ED9"/>
            {/* Bot head — wide visor style like Telegram reference */}
            <rect x="12" y="14" width="24" height="13" rx="6.5" fill="#229ED9"/>
            {/* Bot eyes */}
            <circle cx="19.5" cy="20.5" r="2.2" fill="#fff"/>
            <circle cx="28.5" cy="20.5" r="2.2" fill="#fff"/>
            {/* Bot body */}
            <rect x="15" y="29" width="18" height="10" rx="3" fill="#229ED9"/>
            {/* Bot mouth / grid line */}
            <rect x="20" y="32" width="8" height="1.5" rx="0.75" fill="#fff"/>
            <rect x="20" y="35" width="8" height="1.5" rx="0.75" fill="#fff"/>
          </svg>
        </a>
      </div>

      {/* Back to Top — bottom floating button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        style={{
          position: "fixed", bottom: "1.25rem", zIndex: 999,
          ...(isRTL ? { right: "1.25rem" } : { left: "1.25rem" }),
          width: 48, height: 48, borderRadius: "50%",
          backgroundColor: "var(--primary)", color: "#fff", border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          transition: "transform 0.15s, opacity 0.3s",
          cursor: "pointer",
          opacity: showTop ? 1 : 0,
          pointerEvents: showTop ? "auto" : "none",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>
    </>
  );
}
