/**
 * Daily blog article generator — Google Gemini (free tier).
 *
 * Uses the Gemini REST API directly via fetch (no SDK dependency) with
 * structured-JSON output via `responseSchema`. The free tier of
 * gemini-2.0-flash gives ~1500 requests/day — we use 2/day, so headroom is
 * comfortable for years of daily articles.
 *
 * Returns null on any malformed response — caller treats as a soft failure
 * and skips publishing without writing an orphan row.
 */

import type { BlogTopic } from "./topics";

const DEFAULT_MODEL = "gemini-2.5-flash";
const TIMEOUT_MS = 60_000;

export interface GeneratedArticle {
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  excerpt: string;
  /** Markdown body — H2/H3 sub-headings; the H1 is the title. */
  content: string;
}

// Gemini-flavoured response schema: types are uppercase per the API spec.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title:           { type: "STRING", description: "Article H1. 40–80 chars. Reflects the topic clearly." },
    metaTitle:       { type: "STRING", description: "SEO <title>. 40–65 chars. Compelling, keyword-rich." },
    metaDescription: { type: "STRING", description: "SEO meta description. 130–160 chars. Action-driven." },
    keywords:        { type: "ARRAY",  items: { type: "STRING" }, description: "5–10 SEO keywords ordered by relevance." },
    excerpt:         { type: "STRING", description: "Listing-page preview. 150–220 chars." },
    content:         { type: "STRING", description: "Full Markdown article. 700–1400 words. 4–6 H2 (## ...) and at least one H3 (### ...). No top-level H1." },
  },
  required: ["title", "metaTitle", "metaDescription", "keywords", "excerpt", "content"],
};

const SYSTEM_AR = `
أنت كاتب محتوى محترف لمنصة "Classifieds UAE" (منصة إعلانات مبوّبة في الإمارات العربية المتحدة).
مهمتك: كتابة مقال متخصص باللغة العربية الفصحى الواضحة مع لمسة إماراتية احترافية في المفردات.

أسلوب الكتابة:
- لغة عربية فصحى واضحة، بأسلوب حديث، مع مفردات مألوفة لقارئ إماراتي.
- نبرة احترافية، عملية، مفيدة، بدون لغة شارع أو عبارات ضعيفة.
- استخدم أمثلة واقعية من السوق الإماراتي (دبي، أبوظبي، الشارقة، إلخ) عند المناسبة.
- اذكر ميزات منصة Classifieds UAE بشكل طبيعي عند الصلة (الإعلانات المبوّبة، النشر متعدد المنصات، حسابات الأعمال، الأتمتة).

متطلبات SEO:
- استخدام الكلمات المفتاحية بشكل طبيعي بدون حشو.
- العنوان والوصف يجذبان الضغط من نتائج البحث.
- بنية واضحة بعناوين H2 (##) و H3 (###).
- محتوى عملي قابل للتطبيق، ليس وصفياً سطحياً.

ضوابط:
- لا تذكر منصات منافسة بالاسم.
- لا تستخدم أرقاماً مبالغاً فيها أو ادّعاءات لا يمكن إثباتها.
- لا تتضمّن إيموجي في العنوان أو الميتا.
- اجعل المحتوى أصيلاً، لا تكرّر فقرات مماثلة.
- المقال بصيغة JSON المطلوبة فقط.
`.trim();

const SYSTEM_EN = `
You are a professional content writer for "Classifieds UAE" — a UAE classifieds platform.
Your task: write a high-quality article in clean, modern English with a UAE-market lens.

Style:
- Clear, professional English. No fluff, no clickbait.
- Practical, actionable tone — useful for individuals and small businesses.
- Use UAE-market examples (Dubai, Abu Dhabi, Sharjah, etc.) where relevant.
- Mention Classifieds UAE platform features naturally when they fit (classified ads, multi-platform publishing, business accounts, automation).

SEO requirements:
- Use the primary keywords naturally, no keyword stuffing.
- Title + meta description should drive clicks from search results.
- Clear structure with H2 (##) and H3 (###) headings.
- Substantive, actionable content — not surface-level fluff.

Constraints:
- Do not name competitor platforms.
- Do not use exaggerated numbers or unverifiable claims.
- No emoji in title or meta fields.
- Keep content original — don't repeat near-identical paragraphs.
- Output only the JSON in the required schema.
`.trim();

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

export async function generateArticle(
  topic: BlogTopic,
  language: "ar" | "en"
): Promise<GeneratedArticle | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[blog/ai] GEMINI_API_KEY not set — generation skipped");
    return null;
  }
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const system = language === "ar" ? SYSTEM_AR : SYSTEM_EN;
  const userPrompt = language === "ar"
    ? `الموضوع: ${topic.ar}\n\nاكتب مقالاً متكاملاً باللغة العربية يلتزم بكل المتطلبات أعلاه. أعد النتيجة بصيغة JSON فقط وفق المخطط المطلوب.`
    : `Topic: ${topic.en}\n\nWrite a complete English article respecting all requirements above. Return JSON only, matching the required schema.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.7,
      // 8192 covers a ~1400-word article + JSON envelope without truncation.
      maxOutputTokens: 8192,
    },
  };

  let raw: GeminiResponse;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    raw = (await res.json()) as GeminiResponse;
    if (!res.ok) {
      console.error(`[blog/ai] Gemini ${res.status}: ${raw?.error?.message || "unknown"}`);
      return null;
    }
  } catch (err: any) {
    console.error("[blog/ai] Gemini request failed:", err?.message || err);
    return null;
  }

  if (raw.promptFeedback?.blockReason) {
    console.error(`[blog/ai] Gemini blocked: ${raw.promptFeedback.blockReason}`);
    return null;
  }

  const text = raw.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error("[blog/ai] Gemini returned no text", { finish: raw.candidates?.[0]?.finishReason });
    return null;
  }

  let parsed: GeneratedArticle;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    console.error("[blog/ai] Gemini JSON parse failed:", String(err));
    return null;
  }

  // Hard validation — reject anything that won't render or rank well.
  // Bounds are intentionally generous — the model occasionally overshoots
  // descriptions/excerpts. Hard rejection is reserved for genuinely unusable output.
  if (!parsed.title           || parsed.title.length < 20            || parsed.title.length > 160)            return logReject("title length", parsed.title?.length);
  if (!parsed.metaTitle       || parsed.metaTitle.length < 25        || parsed.metaTitle.length > 100)        return logReject("metaTitle length", parsed.metaTitle?.length);
  if (!parsed.metaDescription || parsed.metaDescription.length < 80  || parsed.metaDescription.length > 260)  return logReject("metaDescription length", parsed.metaDescription?.length);
  if (!Array.isArray(parsed.keywords) || parsed.keywords.length < 3  || parsed.keywords.length > 20)          return logReject("keywords count", parsed.keywords?.length);
  if (!parsed.excerpt         || parsed.excerpt.length < 80          || parsed.excerpt.length > 500)          return logReject("excerpt length", parsed.excerpt?.length);
  if (!parsed.content         || parsed.content.length < 1200)                                                return logReject("content length", parsed.content?.length);

  return parsed;
}

function logReject(reason: string, value: unknown): null {
  console.error(`[blog/ai] validation rejected (${reason}=${value})`);
  return null;
}
