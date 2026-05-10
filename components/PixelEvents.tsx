"use client";
import { useEffect } from "react";
import { trackEvent, hasMarketingConsent } from "@/lib/pixel";

/** Fire ViewContent when an ad detail page loads */
export function PixelViewContent({ contentName, contentCategory, value, currency = "AED" }: {
  contentName: string; contentCategory: string; value?: number | null; currency?: string;
}) {
  useEffect(() => {
    if (!hasMarketingConsent()) return;
    trackEvent("ViewContent", {
      content_name: contentName,
      content_category: contentCategory,
      ...(value != null && value > 0 ? { value, currency } : {}),
    });
  }, [contentName, contentCategory, value, currency]);
  return null;
}

/** Fire Search event */
export function PixelSearch({ searchString }: { searchString: string }) {
  useEffect(() => {
    if (!hasMarketingConsent() || !searchString) return;
    trackEvent("Search", { search_string: searchString });
  }, [searchString]);
  return null;
}

/** Fire CompleteRegistration */
export function PixelCompleteRegistration() {
  useEffect(() => {
    if (!hasMarketingConsent()) return;
    trackEvent("CompleteRegistration");
  }, []);
  return null;
}

/** Fire SubmitApplication (ad posted) */
export function PixelSubmitApplication() {
  useEffect(() => {
    if (!hasMarketingConsent()) return;
    trackEvent("SubmitApplication");
  }, []);
  return null;
}

/** Fire Lead on click (WhatsApp, Call, Telegram contact) */
export function usePixelLead() {
  return (contentName?: string) => {
    if (!hasMarketingConsent()) return;
    trackEvent("Lead", contentName ? { content_name: contentName } : undefined);
  };
}
