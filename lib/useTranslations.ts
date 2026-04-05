"use client";
import { usePathname } from "next/navigation";
import en from "../messages/en.json";
import ar from "../messages/ar.json";

const messages = { en, ar } as const;
type Locale = "en" | "ar";
type Messages = typeof en;

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return path; // fallback to key
    }
  }
  return typeof current === "string" ? current : path;
}

export function useTranslations(namespace: keyof Messages) {
  const pathname = usePathname();
  const locale: Locale = pathname.startsWith("/ar") ? "ar" : "en";
  const dict = messages[locale][namespace] as Record<string, unknown>;

  return function t(key: string, params?: Record<string, string | number>): string {
    const raw = getNestedValue(dict, key);
    if (!params) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
  };
}

export function useLocale(): Locale {
  const pathname = usePathname();
  return pathname.startsWith("/ar") ? "ar" : "en";
}
