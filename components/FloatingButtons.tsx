"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function FloatingButtons() {
  const [showTop, setShowTop] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const pathname = usePathname();
  const isRTL = pathname.startsWith("/ar");

  useEffect(() => {
    function onScroll() {
      setShowTop(window.scrollY > 400);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Telegram Bot — fixed position */}
      <div style={{
        position: "fixed", bottom: "4.5rem", zIndex: 999,
        ...(isRTL ? { right: "1.25rem" } : { left: "1.25rem" }),
      }}>
        {/* Tooltip */}
        <div style={{
          position: "absolute", top: "50%", transform: "translateY(-50%)",
          ...(isRTL ? { right: 56 } : { left: 56 }),
          opacity: showTooltip ? 1 : 0,
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
          onMouseEnter={e => { setShowTooltip(true); e.currentTarget.style.transform = "scale(1.1)"; }}
          onMouseLeave={e => { setShowTooltip(false); e.currentTarget.style.transform = "scale(1)"; }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 48, height: 48, borderRadius: "50%",
            backgroundColor: "#229ED9", color: "#fff",
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
            transition: "transform 0.15s",
            cursor: "pointer", textDecoration: "none",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        </a>
      </div>

      {/* Back to Top — fixed position, same side, below telegram */}
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
