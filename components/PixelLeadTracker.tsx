"use client";
import { useEffect } from "react";
import { trackEvent, hasMarketingConsent } from "@/lib/pixel";

/** Attaches click listeners to contact buttons (data-track attr) to fire Lead events */
export default function PixelLeadTracker({ adTitle }: { adTitle?: string }) {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!hasMarketingConsent()) return;
      const target = (e.target as HTMLElement)?.closest("[data-track]");
      if (!target) return;
      const method = target.getAttribute("data-track");
      if (["whatsapp", "call", "booking"].includes(method || "")) {
        trackEvent("Lead", { content_name: adTitle || "Ad", content_category: method });
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [adTitle]);
  return null;
}
