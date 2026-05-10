/**
 * WhatsApp Bot — State machine mirroring Telegram bot flow.
 * Session stored in-memory (keyed by phone number).
 * Flow: consent → language → phone → name → plan → platforms → contact
 *       → category → subCategory → location → title → text → price
 *       → priceConfirm → imageAsk → imageUpload → summary → publish
 */

import { prisma } from "@/lib/prisma";
import { sendText, sendButtons, sendList, downloadMedia, markRead } from "./index";
import { SUBCATEGORIES } from "@/lib/locations-cars";

// WhatsApp-specific emirates ordering + spacing per product spec.
// Scoped here (not in lib/locations-cars) so other consumers (web, Telegram)
// keep their existing behaviour. "all-emirates" is a virtual option that the
// publish flow translates to `null` on the submission record.
const UAE_LOCATIONS: { value: string; ar: string; en: string }[] = [
  { value: "abu-dhabi",        ar: "أبو ظبي",            en: "Abu Dhabi" },
  { value: "abu-dhabi-al-ain", ar: "أبو ظبي - العين",    en: "Abu Dhabi - Al Ain" },
  { value: "dubai",            ar: "دبي",                 en: "Dubai" },
  { value: "sharjah",          ar: "الشارقة",             en: "Sharjah" },
  { value: "ajman",            ar: "عجمان",               en: "Ajman" },
  { value: "umm-al-quwain",    ar: "أم القيوين",          en: "Umm Al Quwain" },
  { value: "ras-al-khaimah",   ar: "رأس الخيمة",          en: "Ras Al Khaimah" },
  { value: "fujairah",         ar: "الفجيرة",             en: "Fujairah" },
  { value: "all-emirates",     ar: "كل الإمارات",         en: "All Emirates" },
];
import { isPastMay1, isUAEFlagAvailable } from "@/lib/plan-config";
import { generateAdId } from "@/lib/ad-id";
import { publishToSocial } from "@/lib/social-publisher";
import { findActiveCompanyByPhone, type ActiveCompanyContext } from "@/lib/company-lookup";
import { applyWatermark } from "@/lib/image-watermark";
import { buildFollowUsText, type FollowPlatform } from "@/lib/follow-us";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

interface BotState {
  step: string;
  lang: string | null;
  name: string | null;
  phone: string | null;
  isExistingUser: boolean;
  /** When set, the phone is linked to an ACTIVE company subscription.
   *  All plan limits + free-ad cap + Ziina checkout are bypassed. */
  company: ActiveCompanyContext | null;
  selectedPlan: string | null;
  publishPlatform: string[];
  contactMethod: string[];
  category: string | null;
  categoryName: string | null;
  subCategory: string | null;
  subCategoryName: string | null;
  location: string | null;
  locationName: string | null;
  title: string | null;
  text: string | null;
  adPrice: number | null;
  isNegotiable: boolean;
  images: { localPath: string }[];
  submissionId: string | null;
}

interface IncomingMessage {
  from: string;       // sender phone (e.g. "971501234567")
  messageId: string;
  type: "text" | "interactive" | "image" | "button";
  text?: string;
  buttonId?: string;  // interactive button reply id
  listId?: string;    // interactive list reply id
  imageId?: string;   // media id for image
  senderName?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

// Fallback plan limits — overridden by DB packages
const PLAN_LIMITS_FALLBACK: Record<string, { price: number; maxChars: number; maxImages: number; displayDays: number }> = {
  free:     { price: 0,  maxChars: 150,  maxImages: 1, displayDays: 3 },
  basic:    { price: 5,  maxChars: 400,  maxImages: 2, displayDays: 7 },
  uaeflag:  { price: 0,  maxChars: 800,  maxImages: 4, displayDays: 14 },
  standard: { price: 9,  maxChars: 800,  maxImages: 4, displayDays: 14 },
  premium:  { price: 15, maxChars: 1200, maxImages: 6, displayDays: 30 },
};

let PLAN_LIMITS = { ...PLAN_LIMITS_FALLBACK };
const PLAN_KEY_MAP: Record<string, string> = { "Free": "free", "Basic": "basic", "UAE Flag": "uaeflag", "Standard": "standard", "Premium": "premium" };
let lastPkgFetch = 0;

async function refreshPackages(): Promise<void> {
  if (Date.now() - lastPkgFetch < 5 * 60 * 1000) return;
  try {
    const pkgs = await prisma.package.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
    for (const pkg of pkgs) {
      const key = PLAN_KEY_MAP[pkg.name];
      if (key) {
        PLAN_LIMITS[key] = { price: pkg.price, maxChars: pkg.maxChars, maxImages: pkg.maxImages, displayDays: pkg.durationDays };
      }
    }
    lastPkgFetch = Date.now();
  } catch {}
}

const MAX_TITLE_CHARS = 100;
const MAX_ADS_PER_DAY = 5;

const BANNED_WORDS = [
  "sex","porn","escort","drugs","cocaine","casino","gambling","weapon","nude","naked","xxx",
  "قمار","جنس","مخدرات","سلاح","إباحي","كوكايين","دعارة","بغاء","خمر","حشيش",
];

function hasBanned(t: string): boolean { const l = t.toLowerCase(); return BANNED_WORDS.some(w => l.includes(w)); }
function hasEmoji(t: string): boolean { return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t); }
function normalizeDigits(s: string): string { return s.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString()); }
function normalizePhone(raw: string): string {
  let p = normalizeDigits(raw).replace(/[^0-9]/g, "");
  if (p.startsWith("00971")) p = "971" + p.slice(5);
  else if (p.startsWith("05") && p.length === 10) p = "971" + p.slice(1);
  else if (p.startsWith("5") && p.length === 9) p = "971" + p;
  return p;
}
function isValidUAEPhone(p: string): boolean { return /^9715\d{8}$/.test(p); }

// ── Session Store ───────────────────────────────────────────────────────────
//
// Sessions are kept in memory for fast access AND mirrored to a JSON file
// inside the uploads docker volume so they survive container rebuilds.
// (`public/uploads/` is mounted as a named volume in docker-compose.yml,
//  so it persists across `docker compose up --build`.)
//
// Writes are debounced — at most one disk write every ~750 ms regardless
// of how many state mutations happen.

const sessions = new Map<string, BotState>();

// Tracks phones that have already seen the welcome screen — also persisted
// so first-time welcome doesn't re-fire for returning users after a rebuild.
const welcomed = new Set<string>();

const SESSIONS_PATH = path.join(process.cwd(), "public", "uploads", "wa-sessions.json");
let saveTimer: NodeJS.Timeout | null = null;
const SAVE_DEBOUNCE_MS = 750;
// Sessions older than this are evicted on load — prevents the file growing forever.
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface PersistedEntry { state: BotState; updatedAt: number }
interface PersistedFile { sessions: Record<string, PersistedEntry>; welcomed?: string[] }

function loadSessionsFromDisk(): void {
  try {
    if (!fs.existsSync(SESSIONS_PATH)) return;
    const raw = fs.readFileSync(SESSIONS_PATH, "utf8");
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, unknown>;
    // Tolerate the older flat shape (just session map) and the newer shape with welcomed.
    const sessionsMap = (typeof obj.sessions === "object" && obj.sessions !== null
      ? obj.sessions
      : obj) as Record<string, PersistedEntry>;
    const welcomedList: string[] = Array.isArray(obj.welcomed) ? obj.welcomed as string[] : [];
    const now = Date.now();
    let restored = 0;
    for (const [phone, entry] of Object.entries(sessionsMap)) {
      if (!entry?.state || (now - (entry.updatedAt || 0)) > SESSION_TTL_MS) continue;
      sessions.set(phone, entry.state);
      restored++;
    }
    for (const phone of welcomedList) welcomed.add(phone);
    if (restored > 0 || welcomedList.length > 0) {
      console.log(`[WA Bot] restored ${restored} session(s) and ${welcomedList.length} welcomed marker(s) from disk`);
    }
  } catch (err) {
    console.error("[WA Bot] failed to load sessions:", err);
  }
}

function flushSessionsToDisk(): void {
  try {
    const dir = path.dirname(SESSIONS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const now = Date.now();
    const sessionsMap: Record<string, PersistedEntry> = {};
    for (const [phone, state] of sessions.entries()) {
      // Skip purely-fresh sessions (no real progress) to keep the file small.
      if (state.step === "consent" && !state.lang && !state.phone) continue;
      sessionsMap[phone] = { state, updatedAt: now };
    }
    const payload: PersistedFile = { sessions: sessionsMap, welcomed: Array.from(welcomed) };
    // Atomic-ish write: write to tmp then rename.
    const tmp = SESSIONS_PATH + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(payload));
    fs.renameSync(tmp, SESSIONS_PATH);
  } catch (err) {
    console.error("[WA Bot] failed to save sessions:", err);
  }
}

function scheduleSave(): void {
  if (saveTimer) return; // already scheduled
  saveTimer = setTimeout(() => { saveTimer = null; flushSessionsToDisk(); }, SAVE_DEBOUNCE_MS);
}

// Load any persisted sessions once at module import time.
loadSessionsFromDisk();

function initState(): BotState {
  return {
    step: "consent", lang: null, name: null, phone: null, isExistingUser: false,
    company: null,
    selectedPlan: null, publishPlatform: [], contactMethod: [],
    category: null, categoryName: null, subCategory: null, subCategoryName: null,
    location: null, locationName: null, title: null, text: null,
    adPrice: null, isNegotiable: false, images: [], submissionId: null,
  };
}

function getState(phone: string): BotState {
  if (!sessions.has(phone)) sessions.set(phone, initState());
  return sessions.get(phone)!;
}

function resetState(phone: string): void {
  sessions.set(phone, initState());
  scheduleSave();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function t(state: BotState, ar: string, en: string): string {
  return state.lang === "ar" ? ar : en;
}

function planMaxChars(plan: string | null): number { return (PLAN_LIMITS[plan || "free"] || PLAN_LIMITS.free).maxChars; }
function planMaxImages(plan: string | null): number { return (PLAN_LIMITS[plan || "free"] || PLAN_LIMITS.free).maxImages; }
function planPrice(plan: string | null): number { return (PLAN_LIMITS[plan || "free"] || PLAN_LIMITS.free).price; }

/** Effective per-ad limits — company subscription overrides any plan choice. */
function stateMaxChars(state: BotState): number {
  return state.company ? state.company.plan.maxAdChars : planMaxChars(state.selectedPlan);
}
function stateMaxImages(state: BotState): number {
  return state.company ? state.company.plan.maxAdImages : planMaxImages(state.selectedPlan);
}

// Categories cache
let CATEGORIES: { id: string; ar: string; en: string }[] = [];
let lastCatFetch = 0;

async function getCategories(): Promise<typeof CATEGORIES> {
  if (Date.now() - lastCatFetch < 5 * 60 * 1000 && CATEGORIES.length > 0) return CATEGORIES;
  try {
    const cats = await prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, nameAr: true } });
    CATEGORIES = cats.map(c => ({ id: c.slug, ar: c.nameAr, en: c.name }));
    lastCatFetch = Date.now();
  } catch {}
  return CATEGORIES;
}

function getSubCatLabel(value: string, lang: string): string {
  for (const items of Object.values(SUBCATEGORIES)) {
    const found = items.find(i => i.value === value);
    if (found) return lang === "ar" ? found.ar : found.en;
  }
  return value;
}

/** Detect language from text — Arabic chars = ar, otherwise en */
function detectLang(text: string): "ar" | "en" {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text) ? "ar" : "en";
}

// ── Main Message Handler ─────────────────────────────────────────────────────

export async function handleWhatsAppMessage(msg: IncomingMessage): Promise<void> {
  const { from } = msg;
  const state = getState(from);
  const input = msg.text?.trim() || "";
  const buttonId = msg.buttonId || msg.listId || "";

  // Mark as read
  markRead(from, msg.messageId).catch(() => {});

  // Persist any state mutations made by this turn (covers every return path).
  try {
    return await handleWhatsAppMessageInner(msg, state, input, buttonId);
  } finally {
    scheduleSave();
  }
}

async function handleWhatsAppMessageInner(msg: IncomingMessage, state: BotState, input: string, buttonId: string): Promise<void> {
  const { from } = msg;

  // ── Auto-detect language from first message if not set ────────────────────
  if (!state.lang && input) {
    state.lang = detectLang(input);
  }

  // ── Stale mid-flow tap recovery ───────────────────────────────────────────
  // If the user taps a button that belongs deep in the flow (combo_*, plat_*,
  // cm_*, plan_*, cat_*, subcat_*, loc_*, img*, price_*, publish_*) but the
  // session is in "consent" (e.g. session was lost during deploy), explain
  // briefly and offer a Post button — don't silently re-show the welcome
  // splash, which makes the flow feel broken from the user's POV.
  const MID_FLOW_BUTTON_RE = /^(combo_|plat_|cm_|plan_|cat_|subcat_|loc_|img|img2_|price_|publish_)/;
  if (state.step === "consent" && buttonId && MID_FLOW_BUTTON_RE.test(buttonId)) {
    const isAr = state.lang === "ar" || /[؀-ۿ]/.test(input);
    await sendButtons(from,
      isAr
        ? "انتهت الجلسة السابقة. ابدأ من جديد:"
        : "Your previous session expired. Start a new ad:",
      [
        { id: "cmd_start",  title: isAr ? "نشر | Post"          : "نشر | Post" },
        { id: "cmd_help",   title: isAr ? "مساعدة | Help"        : "مساعدة | Help" },
      ]
    );
    return;
  }

  // ── Welcome message for first-time users ──────────────────────────────────
  if (!welcomed.has(from) && state.step === "consent") {
    welcomed.add(from);
    await showWelcome(from);
    // If user typed "start", proceed to consent automatically after welcome
    if (input.toLowerCase() === "start" || input === "/start") {
      resetState(from);
      await showConsent(from);
    }
    return;
  }

  // ── Global commands (work at any step) ────────────────────────────────────

  // Start
  if (input.toLowerCase() === "start" || input === "/start" || buttonId === "cmd_start") {
    if (state.step !== "consent" && buttonId !== "cmd_start") {
      await sendButtons(from,
        "لديك إعلان قيد الإنشاء.\nYou have an ad in progress.",
        [
          { id: "cmd_force_start", title: "بدء جديد | Restart" },
          { id: "cmd_resume", title: "متابعة | Continue" },
        ]
      );
      return;
    }
    resetState(from);
    await showConsent(from);
    return;
  }

  // Force restart
  if (buttonId === "cmd_force_start") {
    cleanupImages(state);
    resetState(from);
    await showConsent(from);
    return;
  }

  // Resume (do nothing — let them continue where they were)
  if (buttonId === "cmd_resume") {
    await sendText(from, t(state, "تابع من حيث توقفت", "Continuing where you left off"));
    return;
  }

  // Help
  if (input.toLowerCase() === "help" || input === "/help" || input === "مساعدة" || buttonId === "cmd_help") {
    await showHelp(from, state);
    return;
  }

  // Cancel
  if (input.toLowerCase() === "cancel" || input === "إلغاء" || input === "/cancel" || buttonId === "cmd_cancel") {
    if (state.step === "consent") {
      await sendText(from, "لا يوجد إعلان قيد الإنشاء\nNo active ad");
      await showWelcome(from);
      return;
    }
    cleanupImages(state);
    resetState(from);
    await sendButtons(from,
      "تم الإلغاء | Cancelled",
      [
        { id: "cmd_start", title: "إعلان جديد | New Ad" },
        { id: "cmd_help", title: "مساعدة | Help" },
      ]
    );
    return;
  }

  // ── Route to current step handler ─────────────────────────────────────────
  try {
    switch (state.step) {
      case "consent": await handleConsent(from, state, buttonId, input); break;
      case "language": await handleLanguage(from, state, buttonId); break;
      case "phone": await handlePhone(from, state, input); break;
      case "name": await handleName(from, state, input); break;
      case "planSelect": await handlePlanSelect(from, state, buttonId); break;
      case "platformSelect": await handlePlatformSelect(from, state, buttonId); break;
      case "contactMethod": await handleContactMethod(from, state, buttonId); break;
      case "category": await handleCategory(from, state, buttonId); break;
      case "subCategory": await handleSubCategory(from, state, buttonId); break;
      case "location": await handleLocation(from, state, buttonId); break;
      case "title": await handleTitle(from, state, input); break;
      case "text": await handleText(from, state, input); break;
      case "adPrice": await handleAdPrice(from, state, input); break;
      case "priceConfirm": await handlePriceConfirm(from, state, buttonId); break;
      case "imageAsk": await handleImageAsk(from, state, buttonId); break;
      case "imageUpload": await handleImageUpload(from, state, msg); break;
      case "summary": await handleSummary(from, state, buttonId); break;
      default:
        await showWelcome(from);
        break;
    }
  } catch (err) {
    console.error("[WA Bot] Error:", err);
    await sendButtons(from,
      "حدث خطأ | An error occurred",
      [
        { id: "cmd_start", title: "إعادة | Try Again" },
        { id: "cmd_help", title: "مساعدة | Help" },
      ]
    );
  }
  // Save is performed by the outer handleWhatsAppMessage's finally block.
}

// ── Welcome Message ─────────────────────────────────────────────────────────

async function showWelcome(from: string) {
  // Welcome opens with the exact required headline, keeps the existing tagline
  // line, and exposes the three actions as interactive reply buttons (no
  // typed-command instructions). Button IDs map to existing handlers
  // (cmd_start / cmd_help / cmd_cancel), so flow logic is unchanged.
  await sendButtons(from,
    "أهلاً بكم | Welcome\n" +
    "Classifieds UAE\n\n" +
    "انشر إعلانك مجاناً في الإمارات\n" +
    "Post your ad for free in the UAE",
    [
      { id: "cmd_start",  title: "نشر | Post" },
      { id: "cmd_help",   title: "مساعدة | Help" },
      { id: "cmd_cancel", title: "إلغاء | Cancel" },
    ]
  );
}

// ── Help / Tutorial ─────────────────────────────────────────────────────────

async function showHelp(from: string, state: BotState) {
  const isAr = state.lang === "ar";
  await sendText(from, isAr
    ? "*كيف تنشر إعلان:*\n" +
      "1. اكتب *start*\n" +
      "2. وافق على الشروط واختر اللغة\n" +
      "3. اختر الباقة والمنصات\n" +
      "4. اختر الفئة والموقع\n" +
      "5. اكتب العنوان والوصف والسعر\n" +
      "6. أضف صور (اختياري)\n" +
      "7. راجع وانشر\n\n" +
      "*الباقات:*\n" +
      `مجاني — ${PLAN_LIMITS.free.price} د.إ | ${PLAN_LIMITS.free.displayDays} أيام | ${PLAN_LIMITS.free.maxImages} صورة\n` +
      `أساسي — ${PLAN_LIMITS.basic.price} د.إ | ${PLAN_LIMITS.basic.displayDays} أيام | ${PLAN_LIMITS.basic.maxImages} صور\n` +
      `قياسي — ${PLAN_LIMITS.standard.price} د.إ | ${PLAN_LIMITS.standard.displayDays} يوم | ${PLAN_LIMITS.standard.maxImages} صور\n` +
      `بريميوم — ${PLAN_LIMITS.premium.price} د.إ | ${PLAN_LIMITS.premium.displayDays} يوم | ${PLAN_LIMITS.premium.maxImages} صور\n\n` +
      "*start* — إعلان جديد\n" +
      "*cancel* — إلغاء\n" +
      "*help* — المساعدة"
    : "*How to post an ad:*\n" +
      "1. Type *start*\n" +
      "2. Accept terms & choose language\n" +
      "3. Pick plan & platforms\n" +
      "4. Choose category & location\n" +
      "5. Write title, description & price\n" +
      "6. Add photos (optional)\n" +
      "7. Review & publish\n\n" +
      "*Plans:*\n" +
      `Free — ${PLAN_LIMITS.free.price} AED | ${PLAN_LIMITS.free.displayDays} days | ${PLAN_LIMITS.free.maxImages} image\n` +
      `Basic — ${PLAN_LIMITS.basic.price} AED | ${PLAN_LIMITS.basic.displayDays} days | ${PLAN_LIMITS.basic.maxImages} images\n` +
      `Standard — ${PLAN_LIMITS.standard.price} AED | ${PLAN_LIMITS.standard.displayDays} days | ${PLAN_LIMITS.standard.maxImages} images\n` +
      `Premium — ${PLAN_LIMITS.premium.price} AED | ${PLAN_LIMITS.premium.displayDays} days | ${PLAN_LIMITS.premium.maxImages} images\n\n` +
      "*start* — New ad\n" +
      "*cancel* — Cancel\n" +
      "*help* — This guide"
  );
}

function cleanupImages(state: BotState) {
  for (const img of state.images) {
    try { fs.unlinkSync(img.localPath); } catch {}
  }
}

// ── Step Handlers ────────────────────────────────────────────────────────────

async function showConsent(from: string) {
  const state = getState(from);
  state.step = "consent";
  await sendButtons(from,
    "بالمتابعة، أنت توافق على الشروط والأحكام:\n" +
    "By continuing, you agree to our Terms:\n" +
    "https://classifiedsuae.ae/en/terms\n\n" +
    "هل توافق؟ | Do you agree?",
    [
      { id: "agree", title: "أوافق | Agree" },
      { id: "disagree", title: "لا أوافق | Disagree" },
    ]
  );
}

async function handleConsent(from: string, state: BotState, buttonId: string, input: string) {
  if (buttonId === "disagree") {
    await sendText(from, "يجب الموافقة للمتابعة. اكتب *start* للمحاولة.\nYou must agree to continue. Type *start* to retry.");
    return;
  }
  if (buttonId === "agree" || input.toLowerCase() === "start" || !buttonId) {
    if (!buttonId && input.toLowerCase() !== "start") {
      await showConsent(from);
      return;
    }
    // If language already detected from user's first message, skip selection
    if (state.lang) {
      state.phone = from;
      state.step = "phone";
      await handlePhoneAuto(from, state);
    } else {
      state.step = "language";
      await sendButtons(from,
        "اختر لغتك | Choose language:",
        [
          { id: "lang_ar", title: "العربية" },
          { id: "lang_en", title: "English" },
        ]
      );
    }
  }
}

async function handleLanguage(from: string, state: BotState, buttonId: string) {
  if (buttonId === "lang_ar") { state.lang = "ar"; }
  else if (buttonId === "lang_en") { state.lang = "en"; }
  else {
    await sendButtons(from, "اختر لغتك | Choose language:", [
      { id: "lang_ar", title: "العربية" },
      { id: "lang_en", title: "English" },
    ]);
    return;
  }
  // Phone is already known from WhatsApp — use it directly
  state.phone = from;
  state.step = "phone";
  await handlePhoneAuto(from, state);
}

async function handlePhoneAuto(from: string, state: BotState) {
  const phone = normalizePhone(from);
  if (!isValidUAEPhone(phone)) {
    // WhatsApp number is not UAE — ask for UAE number
    state.step = "phone";
    await sendText(from, t(state, "أدخل رقم هاتفك الإماراتي:\n0501234567", "Enter your UAE phone number:\n0501234567"));
    return;
  }
  state.phone = phone;

  // ── Company recognition ───────────────────────────────────────────────────
  // If this phone belongs to an ACTIVE company subscription, greet by trade
  // license name and skip plan selection — their plan is fixed by subscription.
  const company = await findActiveCompanyByPhone(phone).catch(() => null);
  if (company) {
    state.company = company;
    state.name = company.authorizedSignatory || company.tradeLicenseName;
    state.isExistingUser = true;
    await sendText(from, t(state,
      `🏢 مرحباً ${company.tradeLicenseName}\nباقتك: ${company.plan.nameAr} (${company.plan.maxAdChars} حرف · ${company.plan.maxAdImages} صور · إعلانات غير محدودة)`,
      `🏢 Welcome ${company.tradeLicenseName}\nYour plan: ${company.plan.name} (${company.plan.maxAdChars} chars · ${company.plan.maxAdImages} images · unlimited ads)`));
    // Subscription covers payment — go straight to platform selection.
    await showPlatformSelection(from, state);
    return;
  }

  // Check if existing user
  const user = await prisma.user.findUnique({ where: { phone } }).catch(() => null);
  if (user?.name) {
    state.isExistingUser = true;
    state.name = user.name;
    await sendText(from, t(state, "مرحباً " + user.name, "Welcome back, " + user.name));
    await showPlanSelection(from, state);
  } else {
    state.step = "name";
    await sendText(from, t(state, "أدخل اسمك:", "Enter your name:"));
  }
}

async function handlePhone(from: string, state: BotState, input: string) {
  const phone = normalizePhone(input);
  if (!isValidUAEPhone(phone)) {
    await sendText(from, t(state, "رقم غير صحيح. أدخل رقم إماراتي يبدأ بـ 05", "Invalid. Enter a UAE number starting with 05"));
    return;
  }
  state.phone = phone;

  // Company short-circuit (mirrors handlePhoneAuto)
  const company = await findActiveCompanyByPhone(phone).catch(() => null);
  if (company) {
    state.company = company;
    state.name = company.authorizedSignatory || company.tradeLicenseName;
    state.isExistingUser = true;
    await sendText(from, t(state,
      `🏢 مرحباً ${company.tradeLicenseName}\nباقتك: ${company.plan.nameAr} (${company.plan.maxAdChars} حرف · ${company.plan.maxAdImages} صور · إعلانات غير محدودة)`,
      `🏢 Welcome ${company.tradeLicenseName}\nYour plan: ${company.plan.name} (${company.plan.maxAdChars} chars · ${company.plan.maxAdImages} images · unlimited ads)`));
    await showPlatformSelection(from, state);
    return;
  }

  const user = await prisma.user.findUnique({ where: { phone } }).catch(() => null);
  if (user?.name) {
    state.isExistingUser = true;
    state.name = user.name;
    await sendText(from, t(state, "مرحباً " + user.name, "Welcome back, " + user.name));
    await showPlanSelection(from, state);
  } else {
    state.step = "name";
    await sendText(from, t(state, "أدخل اسمك:", "Enter your name:"));
  }
}

async function handleName(from: string, state: BotState, input: string) {
  if (input.length < 3) { await sendText(from, t(state, "الاسم قصير جداً", "Name too short")); return; }
  if (input.length > 50) { await sendText(from, t(state, "الاسم طويل جداً", "Name too long")); return; }
  if (hasEmoji(input)) { await sendText(from, t(state, "الإيموجي غير مسموح", "Emoji not allowed")); return; }
  if (hasBanned(input)) { await sendText(from, t(state, "يحتوي على كلمات محظورة", "Contains banned words")); return; }
  state.name = input;
  prisma.user.upsert({ where: { phone: state.phone! }, update: { name: input }, create: { phone: state.phone!, name: input } }).catch(() => {});
  await showPlanSelection(from, state);
}

// ── Plan Selection ───────────────────────────────────────────────────────────

async function showPlanSelection(from: string, state: BotState) {
  state.step = "planSelect";
  await refreshPackages();
  const showUAE = isUAEFlagAvailable();
  const isAr = state.lang === "ar";

  const planDefs = [
    { key: "free",     icon: "🆓", ar: "مجاني",     en: "Free" },
    { key: "basic",    icon: "📦", ar: "أساسي",     en: "Basic" },
    ...(showUAE ? [{ key: "uaeflag", icon: "🇦🇪", ar: "علم الإمارات", en: "UAE Flag" }] : []),
    { key: "standard", icon: "⭐", ar: "قياسي",     en: "Standard" },
    { key: "premium",  icon: "💎", ar: "بريميوم",   en: "Premium" },
  ];

  const plans = planDefs.map(p => {
    const l = PLAN_LIMITS[p.key] || PLAN_LIMITS_FALLBACK[p.key];
    const price = l.price === 0 ? (isAr ? "مجاني" : "Free") : l.price + (isAr ? " د.إ" : " AED");
    return {
      id: "plan_" + p.key,
      title: p.icon + " " + (isAr ? p.ar : p.en) + " (" + price + ")",
      desc: isAr
        ? l.maxChars + " حرف · " + l.maxImages + " صور · " + l.displayDays + " يوم"
        : l.maxChars + " chars · " + l.maxImages + " imgs · " + l.displayDays + " days",
    };
  });
  await sendList(from,
    t(state, "اختر الباقة:", "Choose plan:"),
    t(state, "الباقات", "Plans"),
    [{ title: t(state, "الباقات", "Plans"), rows: plans.map(p => ({ id: p.id, title: p.title, description: p.desc })) }]
  );
}

async function handlePlanSelect(from: string, state: BotState, buttonId: string) {
  const planMap: Record<string, string> = {
    plan_free: "free", plan_basic: "basic", plan_uaeflag: "uaeflag",
    plan_standard: "standard", plan_premium: "premium",
  };
  const plan = planMap[buttonId];
  if (!plan) { await showPlanSelection(from, state); return; }

  // Reject UAE Flag after cutoff
  if (plan === "uaeflag" && isPastMay1()) {
    await sendText(from, t(state, "❌ عرض خطة علم الإمارات انتهى.", "❌ UAE Flag plan offer has ended."));
    await showPlanSelection(from, state);
    return;
  }

  // Daily limit for free plans
  const isFreePlan = plan === "free" || plan === "uaeflag";
  if (isFreePlan && state.phone) {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const count = await prisma.adSubmission.count({
        where: { phone: state.phone, createdAt: { gte: since }, status: { not: "DRAFT" },
          OR: [{ package: { name: { in: ["Free", "UAE Flag"] } } }, { packageId: null }] },
      });
      if (count >= MAX_ADS_PER_DAY) {
        await sendText(from, t(state,
          "❌ وصلت للحد الأقصى (" + MAX_ADS_PER_DAY + " إعلانات مجانية/24 ساعة). اختر خطة مدفوعة.",
          "❌ Daily limit reached (" + MAX_ADS_PER_DAY + " free ads/24h). Choose a paid plan."));
        await showPlanSelection(from, state);
        return;
      }
    } catch {}
  }

  state.selectedPlan = plan;
  await showPlatformSelection(from, state);
}

// ── Platform Selection (combo presets) ──────────────────────────────────────
//
// One-tap combos remove the back-and-forth of per-platform multi-select.
// The free plan hides any combo containing X. Telegram is intentionally not
// in any combo per the product spec (channel reposting is an automatic
// downstream behaviour for paid plans, not a user-facing toggle here).
//
// Legacy IDs (plat_website, plat_done, plat_more, plat_all) are no longer
// emitted but the dead branches in handleContactMethod stay defensively in
// case a stale UI message is tapped.

interface PlatformCombo {
  id: string;
  platforms: string[];
  /** Title — Arabic conjunction "و" + English "+" (RTL-safe, ≤24 chars). */
  titleAr: string;
  titleEn: string;
  /** Description — emoji platform list, ≤72 chars. */
  descAr: string;
  descEn: string;
}

/**
 * Combos available to the current plan. Telegram channel is a first-class
 * option for both free and paid (it's the platform's biggest free reach
 * channel). X is paid-plan only and the "All Platforms" combo extends to
 * include X automatically when the plan allows it.
 */
function availableCombos(state: BotState): PlatformCombo[] {
  const isFree = state.selectedPlan === "free";

  const combos: PlatformCombo[] = [
    { id: "combo_w",       platforms: ["website"],                          titleAr: "الموقع فقط",                titleEn: "Website only",        descAr: "🌍 الموقع",                                  descEn: "🌍 Website" },
    { id: "combo_w_tg",    platforms: ["website", "telegram"],              titleAr: "الموقع وتيليغرام",          titleEn: "Website + Telegram",  descAr: "🌍 الموقع · 📱 تيليغرام",                  descEn: "🌍 Website · 📱 Telegram" },
    { id: "combo_w_fb",    platforms: ["website", "facebook"],              titleAr: "الموقع وفيسبوك",            titleEn: "Website + Facebook",  descAr: "🌍 الموقع · 📘 فيسبوك",                    descEn: "🌍 Website · 📘 Facebook" },
    { id: "combo_w_ig",    platforms: ["website", "instagram"],             titleAr: "الموقع وإنستغرام",          titleEn: "Website + Instagram", descAr: "🌍 الموقع · 📷 إنستغرام",                  descEn: "🌍 Website · 📷 Instagram" },
    { id: "combo_w_fb_ig", platforms: ["website", "facebook", "instagram"], titleAr: "الموقع وفيسبوك وإنستغرام", titleEn: "Web + Facebook + IG", descAr: "🌍 الموقع · 📘 فيسبوك · 📷 إنستغرام",   descEn: "🌍 Web · 📘 Facebook · 📷 Instagram" },
  ];

  // "All Platforms" — content extends with X automatically for paid plans.
  const allPlats = isFree
    ? ["website", "telegram", "facebook", "instagram"]
    : ["website", "telegram", "facebook", "instagram", "x"];
  const allDescAr = isFree
    ? "🌍 الموقع · 📱 تيليغرام · 📘 فيسبوك · 📷 إنستغرام"
    : "🌍 الموقع · 📱 تيليغرام · 📘 فيسبوك · 📷 إنستغرام · X";
  const allDescEn = isFree
    ? "🌍 Web · 📱 TG · 📘 FB · 📷 IG"
    : "🌍 Web · 📱 TG · 📘 FB · 📷 IG · X";
  combos.push({ id: "combo_all", platforms: allPlats, titleAr: "كل المنصات", titleEn: "All Platforms", descAr: allDescAr, descEn: allDescEn });

  // X-only combo for paid plans.
  if (!isFree) {
    combos.push({ id: "combo_w_x", platforms: ["website", "x"], titleAr: "الموقع وX", titleEn: "Website + X", descAr: "🌍 الموقع · X", descEn: "🌍 Website · X" });
  }
  return combos;
}

async function showPlatformSelection(from: string, state: BotState) {
  state.step = "platformSelect";
  state.publishPlatform = [];
  const combos = availableCombos(state);
  const rows = combos.map(c => ({
    id: c.id,
    title: t(state, c.titleAr, c.titleEn),
    description: t(state, c.descAr, c.descEn),
  }));
  await sendList(from,
    t(state, "اختر مجموعة منصات النشر:", "Choose a publishing combo:"),
    t(state, "المنصات", "Platforms"),
    [{ title: t(state, "المجموعات", "Combos"), rows }]
  );
}

async function handlePlatformSelect(from: string, state: BotState, buttonId: string) {
  const combos = availableCombos(state);
  const combo = combos.find(c => c.id === buttonId);
  if (!combo) {
    // Unknown / stale id — re-show the list.
    await showPlatformSelection(from, state);
    return;
  }
  state.publishPlatform = [...combo.platforms];
  await showContactMethod(from, state);
}

// ── Contact Method ───────────────────────────────────────────────────────────

async function showContactMethod(from: string, state: BotState) {
  state.step = "contactMethod";
  state.contactMethod = [];
  const rows = [
    { id: "cm_whatsapp", title: t(state, "📱 واتساب", "📱 WhatsApp") },
    { id: "cm_call", title: t(state, "📞 مكالمة", "📞 Call") },
    { id: "cm_all", title: t(state, "🔘 الكل", "🔘 All") },
  ];
  await sendList(from,
    t(state, "طريقة التواصل معك:", "How buyers contact you:"),
    t(state, "التواصل", "Contact"),
    [{ title: t(state, "طرق التواصل", "Contact Methods"), rows }]
  );
}

async function handleContactMethod(from: string, state: BotState, buttonId: string) {
  // Handle platform step overflow (plat_more/plat_done arrive here because state already moved)
  if (buttonId === "plat_more") {
    state.step = "platformSelect";
    await showPlatformSelection(from, state);
    return;
  }
  if (buttonId === "plat_done") {
    if (state.publishPlatform.length === 0) {
      await sendText(from, t(state, "اختر منصة واحدة على الأقل", "Select at least one platform"));
      state.step = "platformSelect";
      await showPlatformSelection(from, state);
      return;
    }
    await showContactMethod(from, state);
    return;
  }

  // Single-tap contact method choice. There are only three options
  // (WhatsApp / Call / All) so any tap is the final answer — no "Add more"
  // or "Confirm" intermediate step. If users want both, they pick "All".
  // cm_more / cm_done are kept as defensive no-ops in case a stale prior
  // message is tapped during a session that pre-dates this change.
  const cmMap: Record<string, string[]> = {
    cm_whatsapp: ["whatsapp"],
    cm_call:     ["call"],
    cm_all:      ["whatsapp", "call"],
  };
  const choice = cmMap[buttonId];
  if (!choice) {
    if (buttonId === "cm_more" || buttonId === "cm_done") {
      // Stale buttons from older session — re-show the list cleanly.
      await showContactMethod(from, state);
      return;
    }
    await showContactMethod(from, state);
    return;
  }
  state.contactMethod = choice;
  await showCategorySelection(from, state);
}

// ── Category ─────────────────────────────────────────────────────────────────

// WhatsApp lists: max 10 rows total. Paginate categories.
let categoryPage = new Map<string, number>(); // phone → page (0 or 1)

async function showCategorySelection(from: string, state: BotState, page = 0) {
  state.step = "category";
  categoryPage.set(from, page);
  const cats = await getCategories();
  const PAGE_SIZE = 9; // 9 categories + 1 "More/Back" navigation row
  const start = page * PAGE_SIZE;
  const slice = cats.slice(start, start + PAGE_SIZE);
  const hasMore = start + PAGE_SIZE < cats.length;
  const hasPrev = page > 0;

  const rows = slice.map(c => ({ id: "cat_" + c.id, title: state.lang === "ar" ? c.ar : c.en }));
  // Add navigation row
  if (hasMore) rows.push({ id: "cat_next_page", title: t(state, "➡️ المزيد من الفئات", "➡️ More Categories") });
  else if (hasPrev) rows.push({ id: "cat_prev_page", title: t(state, "⬅️ الفئات السابقة", "⬅️ Previous") });

  await sendList(from,
    t(state, "اختر الفئة:", "Choose category:"),
    t(state, "الفئات", "Categories"),
    [{ title: t(state, "الفئات", "Categories"), rows }]
  );
}

async function handleCategory(from: string, state: BotState, buttonId: string) {
  // Handle late contact method buttons that arrive after state moved to category
  if (buttonId === "cm_more" || buttonId === "cm_done") {
    state.step = "contactMethod";
    await handleContactMethod(from, state, buttonId);
    return;
  }

  // Pagination
  if (buttonId === "cat_next_page") {
    const current = categoryPage.get(from) || 0;
    await showCategorySelection(from, state, current + 1);
    return;
  }
  if (buttonId === "cat_prev_page") {
    const current = categoryPage.get(from) || 0;
    await showCategorySelection(from, state, Math.max(0, current - 1));
    return;
  }

  if (!buttonId.startsWith("cat_")) { await showCategorySelection(from, state); return; }
  const catSlug = buttonId.replace("cat_", "");
  const cats = await getCategories();
  const cat = cats.find(c => c.id === catSlug);
  if (!cat) { await showCategorySelection(from, state); return; }

  state.category = cat.id;
  state.categoryName = state.lang === "ar" ? cat.ar : cat.en;

  // Check subcategories
  const subs = SUBCATEGORIES[catSlug] || [];
  if (subs.length > 0) {
    await showSubCategorySelection(from, state, catSlug, subs);
  } else {
    await showLocationSelection(from, state);
  }
}

// ── Sub-Category ─────────────────────────────────────────────────────────────

let subCatPage = new Map<string, number>();

async function showSubCategorySelection(from: string, state: BotState, catSlug: string, subs: { value: string; ar: string; en: string }[], page = 0) {
  state.step = "subCategory";
  subCatPage.set(from, page);
  const PAGE_SIZE = 9;
  const start = page * PAGE_SIZE;
  const slice = subs.slice(start, start + PAGE_SIZE);
  const hasMore = start + PAGE_SIZE < subs.length;
  const hasPrev = page > 0;

  const rows = slice.map(s => ({ id: "subcat_" + s.value, title: state.lang === "ar" ? s.ar : s.en }));
  if (hasMore) rows.push({ id: "subcat_next_page", title: t(state, "➡️ المزيد", "➡️ More") });
  else if (hasPrev) rows.push({ id: "subcat_prev_page", title: t(state, "⬅️ السابق", "⬅️ Previous") });

  await sendList(from,
    t(state, state.categoryName + " — اختر التصنيف:", state.categoryName + " — select type:"),
    t(state, "اختر", "Select"),
    [{ title: t(state, "التصنيف الفرعي", "Sub-category"), rows }]
  );
}

async function handleSubCategory(from: string, state: BotState, buttonId: string) {
  // Pagination
  if (buttonId === "subcat_next_page") {
    const current = subCatPage.get(from) || 0;
    const subs = SUBCATEGORIES[state.category || ""] || [];
    await showSubCategorySelection(from, state, state.category || "", subs, current + 1);
    return;
  }
  if (buttonId === "subcat_prev_page") {
    const current = subCatPage.get(from) || 0;
    const subs = SUBCATEGORIES[state.category || ""] || [];
    await showSubCategorySelection(from, state, state.category || "", subs, Math.max(0, current - 1));
    return;
  }

  if (!buttonId.startsWith("subcat_")) { await showCategorySelection(from, state); return; }
  const value = buttonId.replace("subcat_", "");
  state.subCategory = value;
  state.subCategoryName = getSubCatLabel(value, state.lang || "en");
  await showLocationSelection(from, state);
}

// ── Location ─────────────────────────────────────────────────────────────────

async function showLocationSelection(from: string, state: BotState) {
  state.step = "location";
  const rows = UAE_LOCATIONS.map(l => ({
    id: "loc_" + l.value,
    title: state.lang === "ar" ? l.ar : l.en,
  }));
  await sendList(from,
    t(state, "اختر الإمارة:", "Select emirate:"),
    t(state, "الإمارات", "Emirates"),
    [{ title: t(state, "الإمارات", "Emirates"), rows }]
  );
}

async function handleLocation(from: string, state: BotState, buttonId: string) {
  if (!buttonId.startsWith("loc_")) { await showLocationSelection(from, state); return; }
  const value = buttonId.replace("loc_", "");
  const loc = UAE_LOCATIONS.find(l => l.value === value);
  if (!loc) { await showLocationSelection(from, state); return; }

  // "All Emirates" is virtual: store null on the submission so the existing
  // category/{slug}/{location} filter and publishing pipeline treat the ad as
  // emirate-agnostic (visible everywhere). The display label still shows the
  // user-facing "All Emirates" text in the summary.
  if (value === "all-emirates") {
    state.location = null;
    state.locationName = state.lang === "ar" ? loc.ar : loc.en;
  } else {
    state.location = value;
    state.locationName = state.lang === "ar" ? loc.ar : loc.en;
  }

  state.step = "title";
  await sendText(from, t(state,
    "أدخل عنوان الإعلان (" + MAX_TITLE_CHARS + " حرف كحد أقصى):",
    "Enter ad title (max " + MAX_TITLE_CHARS + " chars):"));
}

// ── Title ────────────────────────────────────────────────────────────────────

async function handleTitle(from: string, state: BotState, input: string) {
  if (input.length < 3) { await sendText(from, t(state, "العنوان قصير جداً", "Title too short")); return; }
  if (input.length > MAX_TITLE_CHARS) { await sendText(from, t(state, "العنوان طويل (" + input.length + "/" + MAX_TITLE_CHARS + ")", "Title too long (" + input.length + "/" + MAX_TITLE_CHARS + ")")); return; }
  if (hasEmoji(input)) { await sendText(from, t(state, "الإيموجي غير مسموح", "Emoji not allowed")); return; }
  if (hasBanned(input)) { await sendText(from, t(state, "يحتوي على كلمات محظورة", "Contains banned words")); return; }
  state.title = input;
  state.step = "text";
  const maxChars = stateMaxChars(state);
  await sendText(from, t(state,
    "اكتب نص الإعلان (" + maxChars + " حرف كحد أقصى):",
    "Write ad description (max " + maxChars + " chars):"));
}

// ── Description ──────────────────────────────────────────────────────────────

async function handleText(from: string, state: BotState, input: string) {
  const maxChars = stateMaxChars(state);
  if (input.length < 10) { await sendText(from, t(state, "الوصف قصير جداً", "Description too short")); return; }
  if (input.length > maxChars) { await sendText(from, t(state, "الوصف طويل (" + input.length + "/" + maxChars + ")", "Too long (" + input.length + "/" + maxChars + ")")); return; }
  if (hasEmoji(input)) { await sendText(from, t(state, "الإيموجي غير مسموح", "Emoji not allowed")); return; }
  if (hasBanned(input)) { await sendText(from, t(state, "يحتوي على كلمات محظورة", "Contains banned words")); return; }
  state.text = input;
  state.step = "adPrice";
  await sendText(from, t(state,
    "أدخل السعر بالدرهم (0 = بدون سعر):",
    "Enter price in AED (0 = no fixed price):"));
}

// ── Price ────────────────────────────────────────────────────────────────────

async function handleAdPrice(from: string, state: BotState, input: string) {
  const digits = normalizeDigits(input).replace(/[^0-9]/g, "");
  const parsed = parseInt(digits, 10);
  if (isNaN(parsed) || parsed < 0) {
    await sendText(from, t(state, "أدخل رقماً صحيحاً أو 0", "Enter a valid number or 0"));
    return;
  }
  state.adPrice = parsed;
  state.step = "priceConfirm";
  await sendButtons(from,
    t(state, parsed + " درهم — نهائي أم قابل للتفاوض؟", parsed + " AED — final or negotiable?"),
    [
      { id: "price_final", title: t(state, "نهائي", "Final") },
      { id: "price_negotiable", title: t(state, "قابل للتفاوض", "Negotiable") },
    ]
  );
}

async function handlePriceConfirm(from: string, state: BotState, buttonId: string) {
  if (buttonId === "price_final") state.isNegotiable = false;
  else if (buttonId === "price_negotiable") state.isNegotiable = true;
  else { await sendText(from, t(state, "اضغط أحد الأزرار", "Tap a button")); return; }

  const maxImgs = stateMaxImages(state);
  if (maxImgs > 0) {
    state.step = "imageAsk";
    await sendButtons(from,
      t(state,
        "إضافة صور؟ (حتى " + maxImgs + ")",
        "Add images? (up to " + maxImgs + ")"),
      [
        { id: "img_yes", title: t(state, "نعم", "Yes") },
        { id: "img_no", title: t(state, "تخطي", "Skip") },
      ]
    );
  } else {
    state.step = "summary";
    await showSummary(from, state);
  }
}

// ── Images ───────────────────────────────────────────────────────────────────

async function handleImageAsk(from: string, state: BotState, buttonId: string) {
  if (buttonId === "img_yes") {
    state.step = "imageUpload";
    // Wording mirrors the Telegram bot's img_yes prompt — count is already
    // shown on the previous question, this line adds size cap + first-image hint.
    const maxImgs = stateMaxImages(state);
    await sendText(from, t(state,
      "📸 أرسل الصورة الأولى الآن.\n⚠️ عدد الصور المسموح: حتى " + maxImgs + "\n⚠️ الحد الأقصى لحجم الصورة: 5 ميغابايت\n⚠️ أرسل صورة واحدة فقط",
      "📸 Send your first image now.\n⚠️ Allowed images: up to " + maxImgs + "\n⚠️ Maximum image size: 5 MB\n⚠️ Send ONE image at a time"
    ));
  } else if (buttonId === "img_no") {
    state.step = "summary";
    await showSummary(from, state);
  } else {
    await sendText(from, t(state, "اضغط أحد الأزرار", "Tap a button"));
  }
}

async function handleImageUpload(from: string, state: BotState, msg: IncomingMessage) {
  if (!msg.imageId) {
    // User sent text instead of image
    if (msg.buttonId === "img2_no" || msg.buttonId === "img_done") {
      state.step = "summary";
      await showSummary(from, state);
      return;
    }
    if (msg.buttonId === "img2_yes") {
      await sendText(from, t(state, "📸 أرسل الصورة التالية الآن.", "📸 Send the next image now."));
      return;
    }
    await sendText(from, t(state, "أرسل صورة أو اضغط الأزرار", "Send an image or tap a button"));
    return;
  }

  const maxImgs = stateMaxImages(state);
  if (state.images.length >= maxImgs) {
    await sendText(from, t(state, "الحد الأقصى " + maxImgs + " صور", "Maximum " + maxImgs + " images"));
    state.step = "summary";
    await showSummary(from, state);
    return;
  }

  await sendText(from, t(state, "جارٍ الرفع...", "Uploading..."));

  const media = await downloadMedia(msg.imageId);
  if (!media) {
    await sendText(from, t(state, "فشل الرفع. حاول مرة أخرى", "Upload failed. Try again"));
    return;
  }

  const uploadDir = path.join(process.cwd(), "public/uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const ext = media.mimeType.includes("png") ? ".png" : ".jpg";
  const fileName = `${Date.now()}-wa-${crypto.randomBytes(8).toString("hex")}${ext}`;
  const filePath = path.join(uploadDir, fileName);
  // Watermark before saving; fail-soft (returns original on any error).
  const watermarked = await applyWatermark(media.buffer, { mimeType: media.mimeType });
  fs.writeFileSync(filePath, watermarked);
  state.images.push({ localPath: `/uploads/${fileName}` });

  const count = state.images.length;
  const remaining = maxImgs - count;

  if (remaining > 0) {
    await sendButtons(from,
      t(state, "صورة " + count + " — إضافة أخرى؟ (" + remaining + " متبقي)", "Image " + count + " — add more? (" + remaining + " left)"),
      [
        { id: "img2_yes", title: t(state, "نعم", "Yes") },
        { id: "img2_no", title: t(state, "لا", "No") },
      ]
    );
  } else {
    state.step = "summary";
    await showSummary(from, state);
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────

async function showSummary(from: string, state: BotState) {
  state.step = "summary";
  const isAr = state.lang === "ar";
  const isCompany = !!state.company;
  const plan = state.selectedPlan || "free";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const total = isCompany ? 0 : limits.price;
  const priceDisplay = state.isNegotiable ? t(state, "قابل للتفاوض", "Negotiable") : (state.adPrice + " AED");

  // Footer line varies between regular plans (price/free) and company subscription.
  const footer = isCompany
    ? (isAr
        ? `${state.company!.plan.nameAr} — مغطى بالاشتراك`
        : `${state.company!.plan.name} — covered by subscription`)
    : (total === 0
        ? (isAr ? "مجاني" : "Free")
        : (isAr ? `${total} درهم — يتطلب دفع` : `${total} AED — payment required`));

  const summary = isAr
    ? "*ملخص الإعلان*\n" +
      state.name + " | " + state.phone + "\n" +
      state.categoryName + (state.subCategoryName ? " > " + state.subCategoryName : "") + "\n" +
      (state.locationName || "") + "\n\n" +
      "*" + state.title + "*\n" + state.text + "\n\n" +
      priceDisplay + " | " + state.images.length + " صور\n" +
      footer
    : "*Ad Summary*\n" +
      state.name + " | " + state.phone + "\n" +
      state.categoryName + (state.subCategoryName ? " > " + state.subCategoryName : "") + "\n" +
      (state.locationName || "") + "\n\n" +
      "*" + state.title + "*\n" + state.text + "\n\n" +
      priceDisplay + " | " + state.images.length + " images\n" +
      footer;

  await sendButtons(from, summary, [
    { id: "publish_ad", title: t(state, "نشر", "Publish") },
    { id: "cancel_ad", title: t(state, "إلغاء", "Cancel") },
  ]);
}

async function handleSummary(from: string, state: BotState, buttonId: string) {
  if (buttonId === "cancel_ad") {
    cleanupImages(state);
    resetState(from);
    await sendButtons(from,
      t(state, "تم الإلغاء", "Cancelled"),
      [
        { id: "cmd_start", title: t(state, "إعلان جديد", "New Ad") },
        { id: "cmd_help", title: t(state, "مساعدة", "Help") },
      ]
    );
    return;
  }
  if (buttonId !== "publish_ad") {
    await sendText(from, t(state, "اضغط أحد الأزرار", "Tap a button"));
    return;
  }

  await sendText(from, t(state, "جارٍ النشر...", "Publishing..."));

  try {
    const APP_URL = process.env.APP_URL || "https://classifiedsuae.ae";

    // Resolve package — companies bypass per-ad packages (subscription covers it).
    let pkg: any = null;
    const isCompany = !!state.company;
    if (!isCompany) {
      const planNameMap: Record<string, string> = { free: "Free", basic: "Basic", uaeflag: "UAE Flag", standard: "Standard", premium: "Premium" };
      try {
        const pkgs = await prisma.package.findMany({ where: { isActive: true } });
        pkg = pkgs.find(p => p.name === planNameMap[state.selectedPlan || "free"]) || null;
      } catch {}
    }

    const contactMethodStr = state.contactMethod.join(",") || "call";
    const hasWhatsApp = state.contactMethod.includes("whatsapp");
    const hasCall = state.contactMethod.includes("call");
    const whatsappNumber = hasWhatsApp ? state.phone : null;

    // Normalize category
    const dbCats = await prisma.category.findMany({ where: { isActive: true }, select: { name: true, nameAr: true, slug: true } });
    const catMap: Record<string, string> = {};
    for (const cat of dbCats) { catMap[cat.slug] = cat.name; catMap[cat.name.toLowerCase()] = cat.name; catMap[cat.nameAr] = cat.name; }
    const normalizedCategory = catMap[state.category || ""] || catMap[(state.categoryName || "").toLowerCase()] || state.categoryName || "Other";

    // Build publish target — companies bypass the X-paywall too.
    const targetParts = state.publishPlatform.filter(p => !(p === "x" && !isCompany && (pkg?.price ?? 0) === 0));
    const publishTarget = targetParts.join("+") || "website";
    const hasTelegram = targetParts.includes("telegram");
    const hasFacebook = targetParts.includes("facebook");
    const hasInstagram = targetParts.includes("instagram");

    // Upsert user
    if (state.name && state.phone) {
      await prisma.user.upsert({ where: { phone: state.phone! }, update: {}, create: { phone: state.phone!, name: state.name } }).catch(() => {});
    }

    // Create submission. source="whatsapp" lets the payment webhook DM the
    // user back via WhatsApp once Ziina confirms the charge.
    const submission = await prisma.adSubmission.create({
      data: {
        phone: state.phone!, contactPhone: hasCall || hasWhatsApp ? state.phone : null,
        whatsappNumber, categoryName: normalizedCategory, text: state.text || "",
        title: state.title, language: state.lang || "ar",
        priceTotal: isCompany ? 0 : (pkg?.price ?? 0), adPrice: state.adPrice, isNegotiable: state.isNegotiable,
        status: isCompany || (pkg?.price ?? 0) === 0 ? "PUBLISHED" : "WAITING_PAYMENT",
        publishTarget, contactMethod: contactMethodStr,
        packageId: pkg?.id || undefined,
        companyId: state.company?.id || undefined,
        source: "whatsapp",
        location: state.location, subCategory: state.subCategory,
        images: state.images.map(i => i.localPath), imagesCount: state.images.length,
      } as any,
    });

    // Save submission media
    for (let i = 0; i < state.images.length; i++) {
      await prisma.submissionMedia.create({
        data: { submissionId: submission.id, tempKey: state.images[i].localPath, position: i, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      }).catch(() => {});
    }

    // Companies skip Ziina checkout — their monthly subscription covers publishing.
    const total = isCompany ? 0 : (pkg?.price ?? 0);

    if (total === 0) {
      // ── FREE: Create ad + publish immediately ──────────────────────────
      const durationDays = pkg?.durationDays ?? 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      const ad = await prisma.ad.create({
        data: {
          id: generateAdId(), submissionId: submission.id,
          title: state.title || state.text?.split(" ").slice(0, 6).join(" ") || "Ad",
          description: state.text || "", category: normalizedCategory,
          contactPhone: hasCall || hasWhatsApp ? state.phone : null, whatsappNumber,
          contactMethod: contactMethodStr, location: state.location, subCategory: state.subCategory,
          status: "PUBLISHED", publishedAt: new Date(), expiresAt,
          adPrice: state.adPrice, isNegotiable: state.isNegotiable,
        } as any,
      });

      // Attach images to ad
      for (let i = 0; i < state.images.length; i++) {
        await prisma.media.create({ data: { adId: ad.id, url: state.images[i].localPath, position: i } }).catch(() => {});
      }
      await prisma.adSubmission.update({ where: { id: submission.id }, data: { status: "PUBLISHED" } });

      const adUrl = `${APP_URL}/ad/${ad.id}`;
      const imageUrls = state.images.map(i => `${APP_URL}${i.localPath.startsWith("/") ? i.localPath : "/uploads/" + i.localPath}`);

      // ── Telegram channel ──────────────────────────────────────────────
      let telegramChannelUrl: string | null = null;
      if (hasTelegram) {
        const BOT = process.env.TELEGRAM_BOT_TOKEN || "";
        const CHAN = process.env.TELEGRAM_CHANNEL_ID || "";
        if (BOT && CHAN) {
          // Captions are emoji-free per spec.
          const priceLine = state.adPrice ? `\n${Number(state.adPrice).toLocaleString("en-AE")} AED${state.isNegotiable ? " · Negotiable" : ""}` : state.isNegotiable ? "\nNegotiable" : "";
          const callLine = hasCall && state.phone ? `\nCall: +${state.phone}` : "";
          const caption = `${ad.title}\n${ad.category}${priceLine}${callLine}\n\n${(ad.description || "").slice(0, 700)}\n\n${adUrl}`;
          const buttons: { text: string; url: string }[] = [];
          if (hasWhatsApp) buttons.push({ text: "WhatsApp", url: `https://wa.me/${state.phone}` });
          buttons.push({ text: "View Ad", url: adUrl });
          const replyMarkup = { inline_keyboard: [buttons] };

          try {
            let sent = false;
            if (imageUrls.length > 0) {
              const tgRes = await fetch(`https://api.telegram.org/bot${BOT}/sendPhoto`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: CHAN, photo: imageUrls[0], caption: caption.slice(0, 1024), reply_markup: replyMarkup }),
              });
              const tgJson = await tgRes.json();
              if (tgJson?.ok) {
                sent = true;
                if (tgJson.result?.message_id) await prisma.ad.update({ where: { id: ad.id }, data: { telegramMessageId: String(tgJson.result.message_id) } });
              }
            }
            if (!sent) {
              const tgRes = await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: CHAN, text: caption.slice(0, 4096), reply_markup: replyMarkup }),
              });
              const tgJson = await tgRes.json();
              if (tgJson?.ok && tgJson.result?.message_id) await prisma.ad.update({ where: { id: ad.id }, data: { telegramMessageId: String(tgJson.result.message_id) } });
            }
            telegramChannelUrl = "https://t.me/classifiedsuaeofficial";
          } catch (e) { console.error("[WA Bot] TG channel error:", e); }
        }
      }

      // ── Facebook + Instagram ──────────────────────────────────────────
      let facebookUrl: string | null = null;
      let instagramUrl: string | null = null;
      if (hasFacebook || hasInstagram) {
        const socialContactLines: string[] = [];
        if (hasCall && state.phone) socialContactLines.push(`Call: +${state.phone}`);
        if (hasWhatsApp && state.phone) socialContactLines.push(`WhatsApp: wa.me/${state.phone}`);
        try {
          const socialResult = await publishToSocial({
            title: ad.title || "", description: ad.description, category: ad.category, adUrl,
            imageUrl: imageUrls[0] || null, allImageUrls: imageUrls,
            adPrice: state.adPrice, isNegotiable: state.isNegotiable,
            contactLines: socialContactLines, publishFacebook: hasFacebook, publishInstagram: hasInstagram,
          });
          const socialIds: Record<string, string> = {};
          if (socialResult.facebookPostId) { socialIds.facebookPostId = socialResult.facebookPostId; facebookUrl = socialResult.facebookUrl || null; }
          if (socialResult.instagramPostId) { socialIds.instagramPostId = socialResult.instagramPostId; instagramUrl = socialResult.instagramUrl || null; }
          if (Object.keys(socialIds).length > 0) await prisma.ad.update({ where: { id: ad.id }, data: socialIds });
        } catch (e) { console.error("[WA Bot] Social publish error:", e); }
      }

      // ── Send success message with links ───────────────────────────────
      const links: string[] = [];
      if (targetParts.includes("website")) links.push("🌍 " + t(state, "الموقع", "Website") + ":\n" + adUrl);
      if (telegramChannelUrl) links.push("📱 " + t(state, "تيليغرام", "Telegram") + ":\n" + telegramChannelUrl);
      if (facebookUrl) links.push("📘 Facebook:\n" + facebookUrl);
      if (instagramUrl) links.push("📷 Instagram:\n" + instagramUrl);
      if (links.length === 0) links.push("🔗 " + adUrl);

      // Build a "Follow us" snippet pointing to our brand pages on the same
      // platforms the user just published to (skips Telegram if the bot only
      // reposts to the channel without a usable URL fallback).
      const followPlatforms: FollowPlatform[] = targetParts.filter(p =>
        p === "website" || p === "telegram" || p === "facebook" || p === "instagram" || p === "x"
      ) as FollowPlatform[];
      const followText = buildFollowUsText(followPlatforms, state.lang === "ar" ? "ar" : "en");

      resetState(from);
      const headline = t(state, "تم النشر", "Published");
      const body = links.join("\n\n") + (followText ? "\n\n" + followText : "");
      await sendText(from, headline + "\n\n" + body);
      await sendButtons(from,
        t(state, "شكراً لاستخدامك Classifieds UAE", "Thank you for using Classifieds UAE"),
        [
          { id: "cmd_start", title: t(state, "إعلان جديد", "Post Another") },
          { id: "cmd_help", title: t(state, "مساعدة", "Help") },
        ]
      );
    } else {
      // ── PAID: Create payment + checkout URL ───────────────────────────
      const BACKEND_URL = APP_URL;
      await prisma.payment.create({
        data: { submissionId: submission.id, provider: "whatsapp", providerRef: "WA_" + submission.id, amount: total, currency: "AED", status: "PENDING" },
      });
      const payRes = await fetch(`${BACKEND_URL}/api/payments/create`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: submission.id }), signal: AbortSignal.timeout(15000),
      });
      const payData = await payRes.json();
      if (!payData.checkoutUrl) throw new Error("NO_CHECKOUT_URL");

      await sendText(from, t(state,
        "أكمل الدفع للنشر:\n" + payData.checkoutUrl + "\n\nبعد الدفع سيُنشر فوراً.\n*cancel* للإلغاء",
        "Complete payment to publish:\n" + payData.checkoutUrl + "\n\nYour ad publishes instantly after payment.\n*cancel* to cancel"));
      state.step = "awaiting_payment";
    }
  } catch (err: any) {
    console.error("[WA Bot] Publish error:", err?.message || err);
    await sendText(from, t(state, "حدث خطأ. حاول مرة أخرى أو اكتب *cancel*", "Error. Try again or type *cancel*"));
    state.step = "summary";
  }
}
