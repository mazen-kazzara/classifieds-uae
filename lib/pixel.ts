/**
 * Meta Pixel (Facebook Pixel) helper utilities.
 * The base pixel script is loaded by components/MetaPixel.tsx via next/script.
 * This file provides helpers for firing events from other components.
 */

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

/** Check if marketing cookies are consented */
export function hasMarketingConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("cookie-consent");
    if (!raw) return false;
    return JSON.parse(raw)?.marketing === true;
  } catch { return false; }
}

/** Fire a standard event */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !(window as any).fbq || !hasMarketingConsent()) return;
  if (params) {
    (window as any).fbq("track", name, params);
  } else {
    (window as any).fbq("track", name);
  }
}

/** Fire a custom event */
export function trackCustomEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !(window as any).fbq || !hasMarketingConsent()) return;
  if (params) {
    (window as any).fbq("trackCustom", name, params);
  } else {
    (window as any).fbq("trackCustom", name);
  }
}

/** Track PageView */
export function trackPageView(): void {
  trackEvent("PageView");
}
