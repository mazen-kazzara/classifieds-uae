import en from "../messages/en.json";
import ar from "../messages/ar.json";

const messages = { en, ar } as const;
type Locale = "en" | "ar";
type Messages = typeof en;

export function getTranslations(locale: string, namespace: keyof Messages) {
  const lang: Locale = locale === "ar" ? "ar" : "en";
  const dict = messages[lang][namespace] as Record<string, unknown>;

  return function t(key: string, params?: Record<string, string | number>): string {
    const val = dict[key];
    const raw = typeof val === "string" ? val : key;
    if (!params) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
  };
}
