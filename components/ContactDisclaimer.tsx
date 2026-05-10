"use client";

/**
 * Contact-disclaimer modal.
 *
 * Mounts once on a page and intercepts clicks on contact anchors
 * (`<a data-track="call|whatsapp|telegram|booking" ...>`). The modal shows a
 * safety message; only when the user taps "Continue" does the original
 * action proceed (and the existing /api/ads/[id]/track call fires).
 *
 * Designed to be additive — no changes to the buttons themselves are
 * required beyond the existing data-track attributes the page already has.
 * If JS is disabled, the buttons fall back to their native behaviour.
 */
import { useEffect, useState, useCallback } from "react";

interface PendingAction {
  type: string;
  href: string;
  target: string | null;
  adId: string | null;
}

export default function ContactDisclaimer({ locale }: { locale: string }) {
  const isAr = locale === "ar";
  const [pending, setPending] = useState<PendingAction | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>("a[data-track]");
      if (!anchor) return;
      const type = anchor.getAttribute("data-track") || "";
      // Only intercept contact-with-advertiser actions. Other tracked clicks
      // (e.g. ad-card clicks elsewhere) are unaffected.
      if (!["call", "whatsapp", "telegram", "booking"].includes(type)) return;

      e.preventDefault();
      // Stop propagation so the existing tracking listener doesn't fire yet —
      // we'll fire it manually in `confirm()` so analytics reflect actual
      // intent-to-contact, not just modal-opened.
      e.stopPropagation();

      setPending({
        type,
        href: anchor.href,
        target: anchor.target || null,
        adId: anchor.getAttribute("data-ad-id"),
      });
    }
    // Capture phase so we run before the tracking listener bound in bubbling.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!pending) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPending(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending]);

  const confirm = useCallback(() => {
    if (!pending) return;
    const { type, href, target, adId } = pending;

    // Fire the same tracking call the inline script would have fired.
    if (adId && type) {
      fetch(`/api/ads/${adId}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      }).catch(() => {});
    }

    setPending(null);
    if (target === "_blank") {
      window.open(href, "_blank", "noopener,noreferrer");
    } else {
      // tel: links navigate the current page — that's fine, the dialer takes over.
      window.location.href = href;
    }
  }, [pending]);

  if (!pending) return null;

  const continueLabel = (() => {
    if (pending.type === "call") return isAr ? "📞 متابعة الاتصال" : "📞 Continue to Call";
    if (pending.type === "whatsapp" || pending.type === "booking")
      return isAr ? "💬 متابعة إلى واتساب" : "💬 Continue to WhatsApp";
    if (pending.type === "telegram") return isAr ? "✈️ متابعة إلى تيليغرام" : "✈️ Continue to Telegram";
    return isAr ? "متابعة" : "Continue";
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-disclaimer-title"
      onClick={() => setPending(null)}
      dir={isAr ? "rtl" : "ltr"}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        backgroundColor: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem", animation: "contactDisclaimerFade 0.15s ease-out",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: "var(--surface)",
          border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          maxWidth: "460px", width: "100%",
          textAlign: isAr ? "right" : "left",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem", textAlign: "center" }}>⚠️</div>
        <h2 id="contact-disclaimer-title"
          style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.75rem", textAlign: "center" }}>
          {isAr ? "تنبيه السلامة" : "Safety Notice"}
        </h2>
        <p style={{
          fontSize: "0.9375rem", lineHeight: 1.75,
          color: "var(--text)", marginBottom: "1.25rem",
        }}>
          {isAr
            ? "نحن نخلي مسؤوليتنا الكاملة من التعامل مع المعلن، وننبهك بتوخي الحذر بعدم تحويل الأموال أو الاجتماع في غير الأماكن العامة حرصاً على سلامتك."
            : "We fully disclaim responsibility for any dealings with the advertiser. Please be cautious — do not transfer money and avoid meeting outside public places for your safety."}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <button
            type="button"
            onClick={confirm}
            className="btn-primary"
            style={{ height: 46, fontSize: "0.9375rem", justifyContent: "center", width: "100%" }}
            autoFocus
          >
            {continueLabel}
          </button>
          <button
            type="button"
            onClick={() => setPending(null)}
            style={{
              height: 42, borderRadius: "var(--radius-md)",
              border: "1.5px solid var(--border)", backgroundColor: "var(--surface-2)",
              color: "var(--text-muted)", fontSize: "0.875rem", fontWeight: 600,
              cursor: "pointer", width: "100%",
            }}
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
      <style>{`@keyframes contactDisclaimerFade { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}
