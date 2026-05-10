require("dotenv").config();
// Ensure bot uses localhost DB (not Docker-internal postgres:5432)
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("@postgres:")) {
  process.env.DATABASE_URL = "postgresql://classifieds_user:strongpassword123@localhost:5432/classifieds";
}
const { Telegraf, session, Markup } = require("telegraf");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const BACKEND_BASE_URL = (process.env.BACKEND_API || "http://localhost:3000").replace(/\/api\/telegram-ad\/?$/, "");
const PUBLIC_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://classifiedsuae.com";
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || "";

// May 1, 2026 00:00 UAE (UTC+4) = Apr 30, 2026 20:00 UTC
const MAY1_CUTOFF = new Date("2026-04-30T20:00:00Z");
function isPastMay1() { return new Date() >= MAY1_CUTOFF; }

// Fallback plan limits — overridden by DB packages on startup
const PLAN_LIMITS_FALLBACK = {
  free:     { price: 0,  maxChars: 150,  maxImages: 1, displayDays: 3 },
  basic:    { price: 5,  maxChars: 400,  maxImages: 2, displayDays: 7 },
  uaeflag:  { price: 0,  maxChars: 800,  maxImages: 4, displayDays: 14 },
  standard: { price: 9,  maxChars: 800,  maxImages: 4, displayDays: 14 },
  premium:  { price: 15, maxChars: 1200, maxImages: 6, displayDays: 30 },
};

// DB-driven plan limits — fetched from Package table
let PLAN_LIMITS = { ...PLAN_LIMITS_FALLBACK };

// Plan name → internal key mapping
const PLAN_KEY_MAP = { "Free": "free", "Basic": "basic", "UAE Flag": "uaeflag", "Standard": "standard", "Premium": "premium" };

async function refreshPackages() {
  try {
    const pkgs = await prisma.package.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
    for (const pkg of pkgs) {
      const key = PLAN_KEY_MAP[pkg.name];
      if (key) {
        PLAN_LIMITS[key] = { price: pkg.price, maxChars: pkg.maxChars, maxImages: pkg.maxImages, displayDays: pkg.durationDays };
      }
    }
    console.log("Packages refreshed from DB:", Object.keys(PLAN_LIMITS).filter(k => PLAN_LIMITS[k] !== PLAN_LIMITS_FALLBACK[k]).length, "updated");
  } catch (e) { console.error("Failed to refresh packages:", e.message); }
}
refreshPackages();
setInterval(refreshPackages, 5 * 60 * 1000);
const MAX_TITLE_CHARS = 100;
const MAX_ADS_PER_DAY = 5;
const MAX_IMAGE_BYTES = parseInt(process.env.TELEGRAM_MAX_IMAGE_BYTES || "", 10) || 5 * 1024 * 1024;
const ENABLE_CLAMAV   = (process.env.ENABLE_CLAMAV || "false").toLowerCase() === "true";

const BANNED_WORDS = [
  "sex","porn","escort","drugs","cocaine","casino","gambling","weapon","nude","naked","xxx",
  "قمار","جنس","مخدرات","سلاح","إباحي","كوكايين","دعارة","بغاء","خمر","حشيش",
];

// Default fallback categories — overridden by API fetch on startup
let CATEGORIES = [
  { id: "cars",              ar: "سيارات",          en: "Cars" },
  { id: "real-estate",       ar: "عقارات",           en: "Real Estate" },
  { id: "jobs",              ar: "وظائف",            en: "Jobs" },
  { id: "services",          ar: "خدمات",            en: "Services" },
  { id: "mobiles",           ar: "موبايلات",         en: "Mobiles" },
  { id: "electronics",       ar: "إلكترونيات",       en: "Electronics" },
  { id: "computers-games",   ar: "كمبيوتر وألعاب",   en: "Computers & Games" },
  { id: "furniture",         ar: "أثاث",             en: "Furniture" },
  { id: "fashion-clothing",  ar: "ملابس وأزياء",     en: "Fashion & Clothing" },
  { id: "education-training",ar: "تعليم وتدريب",     en: "Education & Training" },
  { id: "salons-beauty",     ar: "صالونات وتجميل",   en: "Salons & Beauty" },
  { id: "clinics",           ar: "عيادات",           en: "Clinics" },
  { id: "pets",              ar: "حيوانات أليفة",    en: "Pets" },
  { id: "equipment-tools",   ar: "معدات وأدوات",     en: "Equipment & Tools" },
  { id: "jewelry-accessories", ar: "مجوهرات وإكسسوارات", en: "Jewelry & Accessories" },
  { id: "watches",           ar: "ساعات",             en: "Watches" },
  { id: "others",            ar: "أخرى",             en: "Others" },
];

// UAE Locations — exact order + spacing per product spec.
// "all-emirates" is virtual: stored as null on the submission so the existing
// category/{slug}/{location} filter and publishing pipeline treat the ad as
// emirate-agnostic (visible everywhere). Mirrors the WhatsApp bot.
const UAE_LOCATIONS = [
  { value: "abu-dhabi",        ar: "أبو ظبي",          en: "Abu Dhabi" },
  { value: "abu-dhabi-al-ain", ar: "أبو ظبي - العين",  en: "Abu Dhabi - Al Ain" },
  { value: "dubai",            ar: "دبي",               en: "Dubai" },
  { value: "sharjah",          ar: "الشارقة",           en: "Sharjah" },
  { value: "ajman",            ar: "عجمان",             en: "Ajman" },
  { value: "umm-al-quwain",    ar: "أم القيوين",        en: "Umm Al Quwain" },
  { value: "ras-al-khaimah",   ar: "رأس الخيمة",        en: "Ras Al Khaimah" },
  { value: "fujairah",         ar: "الفجيرة",           en: "Fujairah" },
  { value: "all-emirates",     ar: "كل الإمارات",       en: "All Emirates" },
];

// Sub-categories per category slug (mirrors lib/locations-cars.ts)
const SUBCATEGORIES = {
  // Brands sorted alphabetically by English name; "other-brand" pinned last.
  cars: [
    { value: "audi", ar: "أودي", en: "Audi" }, { value: "bentley", ar: "بنتلي", en: "Bentley" },
    { value: "bmw", ar: "بي إم دبليو", en: "BMW" }, { value: "byd", ar: "بي واي دي", en: "BYD" },
    { value: "cadillac", ar: "كاديلاك", en: "Cadillac" }, { value: "chery", ar: "شيري", en: "Chery" },
    { value: "chevrolet", ar: "شيفروليه", en: "Chevrolet" }, { value: "dodge", ar: "دودج", en: "Dodge" },
    { value: "ferrari", ar: "فيراري", en: "Ferrari" }, { value: "ford", ar: "فورد", en: "Ford" },
    { value: "genesis", ar: "جينيسيس", en: "Genesis" }, { value: "gmc", ar: "جي إم سي", en: "GMC" },
    { value: "honda", ar: "هوندا", en: "Honda" }, { value: "hyundai", ar: "هيونداي", en: "Hyundai" },
    { value: "infiniti", ar: "إنفينيتي", en: "Infiniti" }, { value: "jaguar", ar: "جاكوار", en: "Jaguar" },
    { value: "jeep", ar: "جيب", en: "Jeep" }, { value: "kia", ar: "كيا", en: "Kia" },
    { value: "lamborghini", ar: "لامبورغيني", en: "Lamborghini" }, { value: "land-rover", ar: "لاند روفر", en: "Land Rover" },
    { value: "lexus", ar: "لكزس", en: "Lexus" }, { value: "lincoln", ar: "لينكولن", en: "Lincoln" },
    { value: "maserati", ar: "مازيراتي", en: "Maserati" }, { value: "mazda", ar: "مازدا", en: "Mazda" },
    { value: "mercedes", ar: "مرسيدس بنز", en: "Mercedes-Benz" }, { value: "mg", ar: "إم جي", en: "MG" },
    { value: "mini", ar: "ميني", en: "Mini" }, { value: "mitsubishi", ar: "ميتسوبيشي", en: "Mitsubishi" },
    { value: "nissan", ar: "نيسان", en: "Nissan" }, { value: "porsche", ar: "بورش", en: "Porsche" },
    { value: "rolls-royce", ar: "رولز رويس", en: "Rolls-Royce" }, { value: "suzuki", ar: "سوزوكي", en: "Suzuki" },
    { value: "toyota", ar: "تويوتا", en: "Toyota" }, { value: "volkswagen", ar: "فولكس فاجن", en: "Volkswagen" },
    { value: "volvo", ar: "فولفو", en: "Volvo" }, { value: "other-brand", ar: "ماركة أخرى", en: "Other Brand" },
  ],
  "real-estate": [
    { value: "rent", ar: "إيجار", en: "Rent" }, { value: "sale", ar: "بيع", en: "Sale" },
    { value: "commercial-rent", ar: "إيجار تجاري", en: "Commercial Rent" }, { value: "commercial-sale", ar: "بيع تجاري", en: "Commercial Sale" },
    { value: "roommate", ar: "سكن مشترك", en: "Roommate / Sharing" }, { value: "short-term", ar: "إيجار قصير المدة", en: "Short-term Rental" },
  ],
  // Jobs branches by intent (job seeker vs employer hiring). Mirrors lib/locations-cars.ts.
  jobs: [
    { value: "job-seeker", ar: "للبحث عن وظيفة", en: "Search for a Job" },
    { value: "hiring",     ar: "للبحث عن موظف",  en: "Search for a Candidate" },
  ],
  services: [
    { value: "cleaning", ar: "تنظيف", en: "Cleaning" }, { value: "maintenance", ar: "صيانة", en: "Maintenance" },
    { value: "moving", ar: "نقل", en: "Moving & Delivery" }, { value: "legal", ar: "قانوني", en: "Legal" },
    { value: "consulting", ar: "استشارات", en: "Consulting" }, { value: "design", ar: "تصميم", en: "Design" },
    { value: "it-tech", ar: "تقنية معلومات", en: "IT & Technology" }, { value: "other-service", ar: "خدمة أخرى", en: "Other" },
  ],
  mobiles: [
    { value: "iphone", ar: "آيفون", en: "iPhone" }, { value: "samsung", ar: "سامسونج", en: "Samsung" },
    { value: "huawei", ar: "هواوي", en: "Huawei" }, { value: "xiaomi", ar: "شاومي", en: "Xiaomi" },
    { value: "oneplus", ar: "ون بلس", en: "OnePlus" }, { value: "google-pixel", ar: "جوجل بيكسل", en: "Google Pixel" },
    { value: "oppo", ar: "أوبو", en: "OPPO" }, { value: "vivo", ar: "فيفو", en: "Vivo" },
    { value: "other-mobile", ar: "أخرى", en: "Other" },
  ],
  electronics: [
    { value: "tv-audio", ar: "تلفزيون وصوتيات", en: "TV & Audio" }, { value: "cameras", ar: "كاميرات", en: "Cameras" },
    { value: "gaming", ar: "ألعاب", en: "Gaming" }, { value: "kitchen", ar: "أجهزة مطبخ", en: "Kitchen Appliances" },
    { value: "ac-cooling", ar: "تكييف وتبريد", en: "AC & Cooling" }, { value: "other-elec", ar: "أخرى", en: "Other" },
  ],
  // Computers & Games — brand-keyed (mirrors lib/locations-cars.ts).
  "computers-games": [
    { value: "apple", ar: "أبل", en: "Apple" }, { value: "dell", ar: "ديل", en: "Dell" },
    { value: "hp", ar: "إتش بي", en: "HP" }, { value: "lenovo", ar: "لينوفو", en: "Lenovo" },
    { value: "asus", ar: "أسوس", en: "Asus" }, { value: "acer", ar: "أيسر", en: "Acer" },
    { value: "msi", ar: "إم إس آي", en: "MSI" }, { value: "samsung", ar: "سامسونج", en: "Samsung" },
    { value: "microsoft-surface", ar: "مايكروسوفت سيرفس", en: "Microsoft Surface" },
    { value: "other-comp", ar: "أخرى", en: "Other" },
  ],
  furniture: [
    { value: "living-room", ar: "غرفة معيشة", en: "Living Room" }, { value: "bedroom", ar: "غرفة نوم", en: "Bedroom" },
    { value: "office", ar: "مكتبي", en: "Office" }, { value: "kitchen-dining", ar: "مطبخ وطعام", en: "Kitchen & Dining" },
    { value: "outdoor", ar: "خارجي", en: "Outdoor" }, { value: "other-furn", ar: "أخرى", en: "Other" },
  ],
  "fashion-clothing": [
    { value: "men", ar: "رجالي", en: "Men" }, { value: "women", ar: "نسائي", en: "Women" },
    { value: "kids", ar: "أطفال", en: "Kids" }, { value: "shoes", ar: "أحذية", en: "Shoes" },
    { value: "bags", ar: "حقائب", en: "Bags" }, { value: "other-fashion", ar: "أخرى", en: "Other" },
  ],
  "education-training": [
    { value: "tutoring", ar: "دروس خصوصية", en: "Tutoring" }, { value: "courses", ar: "دورات", en: "Courses" },
    { value: "language", ar: "لغات", en: "Language" }, { value: "professional", ar: "تدريب مهني", en: "Professional Training" },
    { value: "other-edu", ar: "أخرى", en: "Other" },
  ],
  "salons-beauty": [
    { value: "hair", ar: "شعر", en: "Hair" }, { value: "skin", ar: "بشرة", en: "Skin Care" },
    { value: "nails", ar: "أظافر", en: "Nails" }, { value: "spa", ar: "سبا", en: "Spa & Massage" },
    { value: "makeup", ar: "مكياج", en: "Makeup" }, { value: "other-beauty", ar: "أخرى", en: "Other" },
  ],
  clinics: [
    { value: "dental", ar: "أسنان", en: "Dental" }, { value: "dermatology", ar: "جلدية", en: "Dermatology" },
    { value: "general", ar: "عام", en: "General" }, { value: "pediatrics", ar: "أطفال", en: "Pediatrics" },
    { value: "physiotherapy", ar: "علاج طبيعي", en: "Physiotherapy" }, { value: "other-clinic", ar: "أخرى", en: "Other" },
  ],
  pets: [
    { value: "dogs", ar: "كلاب", en: "Dogs" }, { value: "cats", ar: "قطط", en: "Cats" },
    { value: "birds", ar: "طيور", en: "Birds" }, { value: "fish", ar: "أسماك", en: "Fish" },
    { value: "pet-accessories", ar: "مستلزمات", en: "Accessories" }, { value: "other-pet", ar: "أخرى", en: "Other" },
  ],
  "equipment-tools": [
    { value: "construction", ar: "بناء", en: "Construction" }, { value: "industrial", ar: "صناعي", en: "Industrial" },
    { value: "garden", ar: "حدائق", en: "Garden" }, { value: "workshop", ar: "ورشة", en: "Workshop" },
    { value: "other-equip", ar: "أخرى", en: "Other" },
  ],
  "jewelry-accessories": [
    { value: "gold", ar: "ذهب", en: "Gold" }, { value: "silver", ar: "فضة", en: "Silver" },
    { value: "diamonds", ar: "ألماس", en: "Diamonds" }, { value: "fashion-jewel", ar: "مجوهرات أزياء", en: "Fashion Jewelry" },
    { value: "other-jewel", ar: "أخرى", en: "Other" },
  ],
  watches: [
    { value: "luxury", ar: "فاخرة", en: "Luxury" }, { value: "sport", ar: "رياضية", en: "Sport" },
    { value: "smart-watch", ar: "ساعة ذكية", en: "Smart Watch" }, { value: "classic", ar: "كلاسيكية", en: "Classic" },
    { value: "other-watch", ar: "أخرى", en: "Other" },
  ],
};

function locationKeyboard(lang) {
  const rows = [];
  for (let i = 0; i < UAE_LOCATIONS.length; i += 2) {
    const row = [Markup.button.callback(lang === "ar" ? UAE_LOCATIONS[i].ar : UAE_LOCATIONS[i].en, "loc_" + UAE_LOCATIONS[i].value)];
    if (UAE_LOCATIONS[i + 1]) row.push(Markup.button.callback(lang === "ar" ? UAE_LOCATIONS[i + 1].ar : UAE_LOCATIONS[i + 1].en, "loc_" + UAE_LOCATIONS[i + 1].value));
    rows.push(row);
  }
  return Markup.inlineKeyboard(rows);
}

function subCategoryKeyboard(lang, catSlug) {
  const items = SUBCATEGORIES[catSlug] || [];
  if (items.length === 0) return null;
  const cols = items.length > 10 ? 3 : 2;
  const rows = [];
  for (let i = 0; i < items.length; i += cols) {
    const row = [];
    for (let j = 0; j < cols && i + j < items.length; j++) {
      const item = items[i + j];
      row.push(Markup.button.callback(lang === "ar" ? item.ar : item.en, "subcat_" + item.value));
    }
    rows.push(row);
  }
  return Markup.inlineKeyboard(rows);
}

function getSubCatLabel(value, lang) {
  for (const items of Object.values(SUBCATEGORIES)) {
    const found = items.find(i => i.value === value);
    if (found) return lang === "ar" ? found.ar : found.en;
  }
  return value;
}

// Category-specific subcategory label & icon for summary/channel posts
const SUBCAT_LABELS = {
  cars:                { icon: "🚗", ar: "الماركة",          en: "Brand" },
  "real-estate":       { icon: "🏠", ar: "النوع",            en: "Type" },
  jobs:                { icon: "💼", ar: "نوع البحث",        en: "Looking for" },
  services:            { icon: "🔧", ar: "نوع الخدمة",       en: "Service Type" },
  mobiles:             { icon: "📱", ar: "الماركة",          en: "Brand" },
  electronics:         { icon: "💻", ar: "النوع",            en: "Type" },
  "computers-games":   { icon: "🎮", ar: "الماركة",          en: "Brand" },
  furniture:           { icon: "🛋️", ar: "النوع",            en: "Type" },
  "fashion-clothing":  { icon: "👗", ar: "التصنيف",          en: "Category" },
  "education-training":{ icon: "📚", ar: "النوع",            en: "Type" },
  "salons-beauty":     { icon: "💈", ar: "النوع",            en: "Type" },
  clinics:             { icon: "🏥", ar: "التخصص",          en: "Specialty" },
  pets:                { icon: "🐾", ar: "النوع",            en: "Type" },
  "equipment-tools":   { icon: "🔨", ar: "النوع",            en: "Type" },
  "jewelry-accessories":{ icon: "💎", ar: "النوع",           en: "Type" },
  watches:             { icon: "⌚", ar: "النوع",            en: "Type" },
  others:              { icon: "📦", ar: "النوع",            en: "Type" },
};

function getSubCatMeta(catSlug) {
  return SUBCAT_LABELS[catSlug] || { icon: "📋", ar: "التصنيف الفرعي", en: "Sub-category" };
}

// Fetch categories from API on startup and refresh every 5 minutes
async function refreshCategories() {
  try {
    const res = await axios.get(`${PUBLIC_URL}/api/public/categories`);
    if (res.data?.ok && res.data.categories?.length > 0) {
      CATEGORIES = res.data.categories.map(c => ({ id: c.slug, ar: c.nameAr, en: c.name }));
      console.log("Categories refreshed from API:", CATEGORIES.length);
    }
  } catch (e) { console.error("Failed to refresh categories:", e.message); }
}
refreshCategories();
setInterval(refreshCategories, 5 * 60 * 1000);

function initState() {
  return {
    step: "consent",
    lang: null,
    name: null,
    phone: null,
    isExistingUser: false,
    /** Active company subscription context — set after phone capture if matched. */
    company: null,
    telegramChatId: null,
    telegramUsername: null,
    selectedPlan: null,
    publishPlatform: [],
    contactMethod: [],
    contactMethodDone: false,
    category: null,
    categoryName: null,
    subCategory: null,
    subCategoryName: null,
    location: null,
    locationName: null,
    title: null,
    text: null,
    adPrice: null,
    isNegotiable: false,
    images: [],
    expectingImage: false,
    submissionId: null,
  };
}

bot.use(session({ defaultSession: () => ({}) }));

function getState(ctx) {
  if (!ctx.session) ctx.session = {};
  if (!ctx.session.state) ctx.session.state = initState();
  return ctx.session.state;
}

bot.catch((err) => console.error("BOT ERROR:", err));

function guardStep(ctx, expected) {
  const state = getState(ctx);
  if (state.step !== expected) {
    ctx.reply(state.lang === "ar"
      ? "⚠️ هذه الخطوة غير متاحة الآن. استخدم الأزرار للمتابعة."
      : "⚠️ This step is not available now. Please use the buttons to continue."
    ).catch(() => {});
    return false;
  }
  return true;
}

function normalizeDigits(s) {
  return s.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
}

function normalizePhone(raw) {
  let p = normalizeDigits(raw).replace(/[^0-9]/g, "");
  if (p.startsWith("00971")) p = "971" + p.slice(5);
  else if (p.startsWith("05") && p.length === 10) p = "971" + p.slice(1);
  else if (p.startsWith("5") && p.length === 9) p = "971" + p;
  return p;
}

function isValidUAEPhone(p) { return /^9715\d{8}$/.test(p); }
function hasEmoji(t) { return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t); }
function hasBanned(t) { const l = t.toLowerCase(); return BANNED_WORDS.some(w => l.includes(w)); }

function planTotal(state) {
  // Company subscription covers publishing — total is always 0.
  if (state.company) return 0;
  const limits = PLAN_LIMITS[state.selectedPlan] || PLAN_LIMITS.free;
  return limits.price;
}

function planMaxChars(plan) {
  return (PLAN_LIMITS[plan] || PLAN_LIMITS.free).maxChars;
}

/** Effective char limit — company plan overrides any per-ad selection. */
function stateMaxChars(state) {
  if (state.company) return state.company.plan.maxAdChars;
  return planMaxChars(state.selectedPlan);
}

function planMaxImages(plan) {
  return (PLAN_LIMITS[plan] || PLAN_LIMITS.free).maxImages;
}

/** Effective image limit — company plan overrides any per-ad selection. */
function stateMaxImages(state) {
  if (state.company) return state.company.plan.maxAdImages;
  return planMaxImages(state.selectedPlan);
}

function planSupportsImages(plan) {
  return planMaxImages(plan) > 0;
}

/**
 * Look up an ACTIVE company subscription by phone number.
 * Returns a serializable context object matching what lib/company-lookup returns,
 * or null if no active company is tied to this phone.
 */
async function findActiveCompanyByPhone(phone) {
  if (!phone) return null;
  try {
    const company = await prisma.company.findFirst({
      where: { companyPhone: phone, subscriptionStatus: "ACTIVE" },
      include: { plan: true },
    });
    if (!company || !company.plan) {
      console.log("[company] no active subscription for phone=" + phone);
      return null;
    }
    if (company.subscriptionEndsAt && company.subscriptionEndsAt < new Date()) {
      console.log("[company] subscription expired for phone=" + phone + " endedAt=" + company.subscriptionEndsAt.toISOString());
      return null;
    }
    console.log("[company] match phone=" + phone + " id=" + company.id + " plan=" + company.plan.slug);
    return {
      id: company.id,
      username: company.username,
      tradeLicenseName: company.tradeLicenseName,
      authorizedSignatory: company.authorizedSignatory,
      activity: company.activity,
      plan: {
        id: company.plan.id,
        slug: company.plan.slug,
        name: company.plan.name,
        nameAr: company.plan.nameAr,
        maxAdChars: company.plan.maxAdChars,
        maxAdImages: company.plan.maxAdImages,
        maxActivities: company.plan.maxActivities,
        unlimitedAds: company.plan.unlimitedAds,
      },
      subscriptionEndsAt: company.subscriptionEndsAt,
    };
  } catch (e) {
    console.error("[TG Company Lookup]", e && e.message ? e.message : e);
    return null;
  }
}

function cleanupImages(images) {
  for (const img of (images || [])) {
    if (img && img.localPath) try { fs.unlinkSync(img.localPath); } catch {}
  }
}

// ── Follow-us snippet (mirrors lib/follow-us.ts) ─────────────────────────────
// Keep in sync with lib/follow-us.ts — same brand URLs, same ordering.
const FOLLOW_DEFAULTS = {
  website:   "https://classifiedsuae.ae",
  facebook:  "https://www.facebook.com/classifiedsuaeofficial",
  instagram: "https://www.instagram.com/classifiedsuae",
  telegram:  "https://t.me/classifiedsuaeofficial",
  x:         "https://x.com/clasifiedsuae",
};
function brandUrlTG(p) {
  if (p === "website")   return process.env.APP_URL || FOLLOW_DEFAULTS.website;
  if (p === "facebook")  return process.env.FB_PAGE_URL || FOLLOW_DEFAULTS.facebook;
  if (p === "instagram") return process.env.IG_PAGE_URL || FOLLOW_DEFAULTS.instagram;
  if (p === "telegram")  return FOLLOW_DEFAULTS.telegram;
  if (p === "x")         return FOLLOW_DEFAULTS.x;
  return null;
}
function buildFollowUsTextTG(platforms, locale) {
  const labels = {
    website:   { ar: "الموقع",   en: "Website",   icon: "🌍" },
    telegram:  { ar: "تيليغرام",  en: "Telegram",  icon: "📱" },
    facebook:  { ar: "فيسبوك",   en: "Facebook",  icon: "📘" },
    instagram: { ar: "إنستغرام",  en: "Instagram", icon: "📷" },
    x:         { ar: "X",         en: "X",         icon: "✖️" },
  };
  const seen = new Set();
  const lines = [];
  for (const p of (platforms || [])) {
    if (seen.has(p) || !labels[p]) continue;
    seen.add(p);
    const url = brandUrlTG(p);
    if (!url) continue;
    const meta = labels[p];
    lines.push(`${meta.icon} ${locale === "ar" ? meta.ar : meta.en}: ${url}`);
  }
  if (lines.length === 0) return "";
  const heading = locale === "ar"
    ? "💙 تابعونا على نفس المنصات التي نُشر إعلانكم عليها:"
    : "💙 Follow us on the same platforms your ad was posted to:";
  return [heading, ...lines].join("\n");
}

async function downloadTelegramFile(ctx, fileId) {
  try {
    const file = await ctx.telegram.getFile(fileId);
    if (file.file_size && file.file_size > MAX_IMAGE_BYTES) return { ok: false, reason: "too_big" };
    const url = "https://api.telegram.org/file/bot" + process.env.TELEGRAM_BOT_TOKEN + "/" + file.file_path;
    const ext = path.extname(file.file_path || "") || ".jpg";
    const outPath = path.join(os.tmpdir(), "tg_" + crypto.randomBytes(12).toString("hex") + ext);
    const res = await axios.get(url, { responseType: "stream" });
    let bytes = 0;
    const writer = fs.createWriteStream(outPath);
    await new Promise((resolve, reject) => {
      res.data.on("data", chunk => {
        bytes += chunk.length;
        if (bytes > MAX_IMAGE_BYTES) res.data.destroy(new Error("FILE_TOO_BIG"));
      });
      res.data.on("error", reject);
      writer.on("error", reject);
      writer.on("finish", resolve);
      res.data.pipe(writer);
    });
    return { ok: true, localPath: outPath, bytes };
  } catch (e) {
    return { ok: false, reason: String(e.message || "download_failed") };
  }
}

function scanClamAV(filePath) {
  const r = spawnSync("clamscan", ["--no-summary", filePath], { encoding: "utf8" });
  if (r.error || r.status === 0) return { ok: true };
  if (r.status === 1) return { ok: false, reason: "infected" };
  return { ok: true };
}

function categoryKeyboard(lang) {
  const rows = [];
  for (let i = 0; i < CATEGORIES.length; i += 2) {
    const row = [Markup.button.callback(lang === "ar" ? CATEGORIES[i].ar : CATEGORIES[i].en, "cat_" + CATEGORIES[i].id)];
    if (CATEGORIES[i + 1]) row.push(Markup.button.callback(lang === "ar" ? CATEGORIES[i + 1].ar : CATEGORIES[i + 1].en, "cat_" + CATEGORIES[i + 1].id));
    rows.push(row);
  }
  return Markup.inlineKeyboard(rows);
}

// ── /help ─────────────────────────────────────────────────────────────────────
bot.command("help", async ctx => {
  await ctx.reply(
    "📘 Classifieds UAE — دليل نشر الإعلانات\n\n" +
    "━━━━━━ English ━━━━━━\n" +
    "1️⃣ /start → Accept Terms & Conditions\n" +
    "2️⃣ Choose language\n" +
    "3️⃣ Enter UAE phone number\n" +
    "4️⃣ Choose your plan\n" +
    "5️⃣ Choose platform (Telegram / Website / Both)\n" +
    "6️⃣ Choose ad category\n" +
    "7️⃣ Enter ad title (max 50 characters)\n" +
    "8️⃣ Write ad description (max 300 characters)\n" +
    "9️⃣ Enter product price\n" +
    "🔟 Add images (if plan supports)\n" +
    "1️⃣1️⃣ Review summary and publish\n\n" +
    "📦 Plans:\n" +
    (function() { const f = PLAN_LIMITS.free; return "🆓 Free — " + f.price + " AED | " + f.displayDays + " days | " + f.maxChars + " chars | " + f.maxImages + " image\n"; })() +
    (function() { const b = PLAN_LIMITS.basic; return "📦 Basic — " + b.price + " AED | " + b.displayDays + " days | " + b.maxChars + " chars | " + b.maxImages + " images\n"; })() +
    (isPastMay1() ? "" : (function() { const u = PLAN_LIMITS.uaeflag; return "🇦🇪 UAE Flag — Free | " + u.displayDays + " days | " + u.maxChars + " chars | " + u.maxImages + " images\n"; })()) +
    (function() { const s = PLAN_LIMITS.standard; return "⭐ Standard — " + s.price + " AED | " + s.displayDays + " days | " + s.maxChars + " chars | " + s.maxImages + " images (Best Value)\n"; })() +
    (function() { const p = PLAN_LIMITS.premium; return "💎 Premium — " + p.price + " AED | " + p.displayDays + " days | " + p.maxChars + " chars | " + p.maxImages + " images\n"; })() + "\n" +
    "━━━━━━ العربية ━━━━━━\n" +
    "1️⃣ /start ← الموافقة على الشروط والأحكام\n" +
    "2️⃣ اختر اللغة\n" +
    "3️⃣ أدخل رقم هاتفك الإماراتي\n" +
    "4️⃣ اختر الباقة\n" +
    "5️⃣ اختر منصة النشر\n" +
    "6️⃣ اختر فئة الإعلان\n" +
    "7️⃣ أدخل عنوان الإعلان (50 حرفاً كحد أقصى)\n" +
    "8️⃣ اكتب نص الإعلان\n" +
    "9️⃣ أدخل سعر المنتج\n" +
    "🔟 أضف صوراً\n" +
    "1️⃣1️⃣ راجع الملخص وانشر\n\n" +
    "📦 الباقات:\n" +
    (function() { const f = PLAN_LIMITS.free; return "🆓 مجاني — " + f.price + " درهم | " + f.displayDays + " أيام | " + f.maxChars + " حرف | " + f.maxImages + " صورة\n"; })() +
    (function() { const b = PLAN_LIMITS.basic; return "📦 أساسي — " + b.price + " درهم | " + b.displayDays + " أيام | " + b.maxChars + " حرف | " + b.maxImages + " صور\n"; })() +
    (isPastMay1() ? "" : (function() { const u = PLAN_LIMITS.uaeflag; return "🇦🇪 علم الإمارات — مجاني | " + u.displayDays + " يوم | " + u.maxChars + " حرف | " + u.maxImages + " صور\n"; })()) +
    (function() { const s = PLAN_LIMITS.standard; return "⭐ قياسي — " + s.price + " درهم | " + s.displayDays + " يوم | " + s.maxChars + " حرف | " + s.maxImages + " صور (الأفضل قيمة)\n"; })() +
    (function() { const p = PLAN_LIMITS.premium; return "💎 بريميوم — " + p.price + " درهم | " + p.displayDays + " يوم | " + p.maxChars + " حرف | " + p.maxImages + " صور"; })()
  );
});

// ── /cancel ───────────────────────────────────────────────────────────────────
bot.command("cancel", async ctx => {
  const state = getState(ctx);
  if (state.step === "consent") {
    await ctx.reply("⚠️ No active ad in progress.\n⚠️ لا يوجد إعلان قيد الإنشاء.\n\nUse /start to begin. | استخدم /start للبدء.");
    return;
  }
  cleanupImages(state.images);
  ctx.session.state = initState();
  await ctx.reply("❌ Ad cancelled. Use /start to start over.\n❌ تم إلغاء الإعلان. استخدم /start للبدء من جديد.");
});

// ── /start ────────────────────────────────────────────────────────────────────
bot.start(async ctx => {
  const state = getState(ctx);
  if (state.step && state.step !== "consent") {
    await ctx.reply(state.lang === "ar"
      ? "⚠️ لديك إعلان قيد الإنشاء. أرسل /cancel للإلغاء والبدء من جديد."
      : "⚠️ You have an ad in progress. Send /cancel to cancel and start over.");
    return;
  }
  ctx.session.state = initState();
  getState(ctx).telegramChatId = String(ctx.chat && ctx.chat.id ? ctx.chat.id : "");
  getState(ctx).telegramUsername = ctx.from && ctx.from.username ? ctx.from.username : null;

  // Short, friendly welcome with a terms link. Full prohibited-content list is on
  // the linked Terms page and in /help — no need to dump it here every session.
  await ctx.reply(
    "🏪 *Classifieds UAE* — أهلاً بك!\n" +
    "Welcome to Classifieds UAE!\n\n" +
    "Post a free classified ad in the UAE in under a minute.\n" +
    "انشر إعلانك المجاني خلال أقل من دقيقة.\n\n" +
    "By continuing you agree to our Terms:\n" +
    "بالمتابعة فإنك توافق على الشروط:\n" +
    "https://classifiedsuae.ae/en/terms\n\n" +
    "Need details? Send /help",
    {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      ...Markup.inlineKeyboard([[
        Markup.button.callback("✅ أوافق | I Agree", "agree"),
        Markup.button.callback("❌ لا أوافق | I Disagree", "disagree"),
      ]]),
    }
  );
});

bot.action("disagree", async ctx => {
  await ctx.editMessageReplyMarkup().catch(() => {});
  await ctx.reply(
    "❌ لا يمكن المتابعة بدون الموافقة على الشروط.\n" +
    "❌ You cannot continue without accepting the terms.\n\n" +
    "Use /start to try again. | استخدم /start للمحاولة مجدداً."
  );
});

bot.action("agree", async ctx => {
  if (!guardStep(ctx, "consent")) return;
  const state = getState(ctx);
  state.step = "language";
  await ctx.editMessageReplyMarkup().catch(() => {});
  await ctx.reply(
    "✅ تمت الموافقة على الشروط والأحكام.\n✅ Terms accepted.\n\n🌐 اختر لغتك | Choose your language:",
    Markup.inlineKeyboard([[
      Markup.button.callback("🇦🇪 العربية", "lang_ar"),
      Markup.button.callback("🇬🇧 English", "lang_en"),
    ]])
  );
});

bot.action("lang_ar", async ctx => {
  if (!guardStep(ctx, "language")) return;
  const state = getState(ctx);
  state.lang = "ar";
  state.step = "phone";
  await ctx.editMessageReplyMarkup().catch(() => {});
  await ctx.reply("🇦🇪 تم اختيار اللغة العربية ✓\n\n📞 أدخل رقم هاتفك الإماراتي:\nمثال: 971501234567 أو 0501234567");
});

bot.action("lang_en", async ctx => {
  if (!guardStep(ctx, "language")) return;
  const state = getState(ctx);
  state.lang = "en";
  state.step = "phone";
  await ctx.editMessageReplyMarkup().catch(() => {});
  await ctx.reply("🇬🇧 English selected ✓\n\n📞 Enter your UAE phone number:\nExample: 971501234567 or 0501234567");
});

async function askPlan(ctx) {
  const state = getState(ctx);
  state.step = "planSelect";
  const showUAE = !isPastMay1();
  const isAr = state.lang === "ar";

  // Build plan list dynamically from DB-driven PLAN_LIMITS
  const planDefs = [
    { key: "free",     icon: "🆓", ar: "مجاني",         en: "Free" },
    { key: "basic",    icon: "📦", ar: "أساسي",         en: "Basic" },
    ...(showUAE ? [{ key: "uaeflag", icon: "🇦🇪", ar: "علم الإمارات", en: "UAE Flag" }] : []),
    { key: "standard", icon: "⭐", ar: "قياسي",         en: "Standard", tag: isAr ? "(الأفضل قيمة)" : "(Best Value)" },
    { key: "premium",  icon: "💎", ar: "بريميوم",       en: "Premium" },
  ];

  const lines = planDefs.map(p => {
    const l = PLAN_LIMITS[p.key] || PLAN_LIMITS_FALLBACK[p.key];
    const name = p.icon + " " + (isAr ? p.ar : p.en) + (p.tag ? " " + p.tag : "");
    const price = l.price === 0 ? (isAr ? "مجاني" : "Free") : l.price + (isAr ? " درهم" : " AED");
    const detail = isAr
      ? "• " + l.maxChars + " حرف · " + l.maxImages + " صور · " + l.displayDays + " يوم"
      : "• " + l.maxChars + " chars · " + l.maxImages + " images · " + l.displayDays + " days";
    return name + " — " + price + "\n" + detail;
  });

  const buttons = planDefs.map(p => Markup.button.callback(p.icon + " " + (isAr ? p.ar : p.en), "plan_" + p.key));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));

  await ctx.reply(
    (isAr ? "📦 اختر الباقة:\n\n" : "📦 Choose your plan:\n\n") + lines.join("\n\n"),
    Markup.inlineKeyboard(rows)
  );
}

async function handlePlanSelected(ctx, plan) {
  if (!guardStep(ctx, "planSelect")) return;
  const state = getState(ctx);

  // Reject UAE Flag plan after cutoff
  if (plan === "uaeflag" && isPastMay1()) {
    await ctx.editMessageReplyMarkup().catch(() => {});
    await ctx.reply(state.lang === "ar"
      ? "❌ عرض خطة علم الإمارات انتهى. يرجى اختيار خطة أخرى."
      : "❌ The UAE Flag plan offer has ended. Please choose another plan.");
    await askPlan(ctx);
    return;
  }

  // Enforce daily limit for FREE plans only (free + uaeflag)
  const isFreePlan = plan === "free" || (plan === "uaeflag" && !isPastMay1());
  if (isFreePlan && state.phone) {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const freeCount = await prisma.adSubmission.count({
        where: {
          phone: state.phone,
          createdAt: { gte: since },
          status: { not: "DRAFT" },
          OR: [
            { package: { name: { in: ["Free", "UAE Flag"] } } },
            { packageId: null },
          ],
        },
      });
      if (freeCount >= MAX_ADS_PER_DAY) {
        await ctx.editMessageReplyMarkup().catch(() => {});
        await ctx.reply(state.lang === "ar"
          ? "❌ لقد وصلت إلى الحد الأقصى (" + MAX_ADS_PER_DAY + " إعلانات مجانية كل 24 ساعة).\n\n💡 يمكنك اختيار خطة مدفوعة للنشر بدون حدود."
          : "❌ You have reached the daily limit (" + MAX_ADS_PER_DAY + " free ads per 24 hours).\n\n💡 Choose a paid plan to post without limits.");
        // Re-show plan selection
        await askPlan(ctx);
        return;
      }
    } catch (e) { console.error("Free limit check error:", e); }
  }

  state.selectedPlan = plan;
  state.step = "platformSelect";
  state.publishPlatform = [];
  await ctx.editMessageReplyMarkup().catch(() => {});
  const labels = {
    free:     { ar: "🆓 مجاني (0 درهم)",            en: "🆓 Free (0 AED)" },
    basic:    { ar: "📦 أساسي (5 درهم)",            en: "📦 Basic (5 AED)" },
    uaeflag:  { ar: "🇦🇪 علم الإمارات (مجاني)",       en: "🇦🇪 UAE Flag (Free)" },
    standard: { ar: "⭐ قياسي (9 درهم)",            en: "⭐ Standard (9 AED)" },
    premium:  { ar: "💎 بريميوم (15 درهم)",          en: "💎 Premium (15 AED)" },
  };
  await ctx.reply(
    state.lang === "ar"
      ? "✅ تم اختيار الباقة: " + labels[plan].ar + "\n\n🌐 أين تريد نشر إعلانك؟\nاختر منصة واحدة أو أكثر، ثم اضغط تأكيد:"
      : "✅ Plan selected: " + labels[plan].en + "\n\n🌐 Where would you like to publish your ad?\nChoose one or more platforms, then tap Confirm:",
    buildPlatformKeyboard(state.lang, [], state.selectedPlan)
  );
}

bot.action("plan_free",     ctx => handlePlanSelected(ctx, "free"));
bot.action("plan_basic",    ctx => handlePlanSelected(ctx, "basic"));
bot.action("plan_uaeflag",  ctx => handlePlanSelected(ctx, "uaeflag"));
bot.action("plan_standard", ctx => handlePlanSelected(ctx, "standard"));
bot.action("plan_premium",  ctx => handlePlanSelected(ctx, "premium"));
// Legacy callbacks (backwards compat)
bot.action("plan_normal",   ctx => handlePlanSelected(ctx, "basic"));
bot.action("plan_featured", ctx => handlePlanSelected(ctx, "standard"));

function buildPlatformKeyboard(lang, selected, plan) {
  const allOpts = [
    { key: "telegram",  ar: "تيليغرام",    en: "Telegram",   icon: "📱" },
    { key: "website",   ar: "الموقع",       en: "Website",    icon: "🌍" },
    { key: "facebook",  ar: "فيسبوك",      en: "Facebook",   icon: "📘" },
    { key: "instagram", ar: "انستقرام",     en: "Instagram",  icon: "📷" },
    { key: "x",         ar: "X",            en: "X",          icon: "✖️" },
  ];
  // Free plan cannot publish on X
  const opts = (plan === "free") ? allOpts.filter(o => o.key !== "x") : allOpts;
  const row1 = opts.slice(0, 2).map(o => {
    const on = selected.includes(o.key);
    const label = (on ? "✅ " : "") + o.icon + " " + (lang === "ar" ? o.ar : o.en);
    return Markup.button.callback(label, "plat_toggle_" + o.key);
  });
  const row2 = opts.slice(2, 4).map(o => {
    const on = selected.includes(o.key);
    const label = (on ? "✅ " : "") + o.icon + " " + (lang === "ar" ? o.ar : o.en);
    return Markup.button.callback(label, "plat_toggle_" + o.key);
  });
  const row3 = opts.slice(4).map(o => {
    const on = selected.includes(o.key);
    const label = (on ? "✅ " : "") + o.icon + " " + (lang === "ar" ? o.ar : o.en);
    return Markup.button.callback(label, "plat_toggle_" + o.key);
  });
  const row4 = [
    Markup.button.callback(lang === "ar" ? "🔘 تحديد الكل" : "🔘 Select All", "plat_all"),
    Markup.button.callback(lang === "ar" ? "✔️ تأكيد" : "✔️ Confirm", "plat_done"),
  ];
  return Markup.inlineKeyboard([row1, row2, row3, row4]);
}

bot.action(/^plat_toggle_(.+)$/, async ctx => {
  const state = getState(ctx);
  if (state.step !== "platformSelect") {
    await ctx.reply(state.lang === "ar" ? "⚠️ غير متاح الآن." : "⚠️ Not available now.").catch(() => {});
    return;
  }
  const plat = ctx.match[1];
  if (!Array.isArray(state.publishPlatform)) state.publishPlatform = [];
  if (state.publishPlatform.includes(plat)) {
    state.publishPlatform = state.publishPlatform.filter(p => p !== plat);
  } else {
    state.publishPlatform.push(plat);
  }
  await ctx.editMessageReplyMarkup(buildPlatformKeyboard(state.lang, state.publishPlatform, state.selectedPlan).reply_markup).catch(() => {});
});

bot.action("plat_all", async ctx => {
  const state = getState(ctx);
  if (state.step !== "platformSelect") return;
  if (!Array.isArray(state.publishPlatform)) state.publishPlatform = [];
  const allPlats = ["telegram", "website", "facebook", "instagram", "x"];
  if (state.publishPlatform.length === allPlats.length) {
    state.publishPlatform = [];
  } else {
    state.publishPlatform = [...allPlats];
  }
  await ctx.editMessageReplyMarkup(buildPlatformKeyboard(state.lang, state.publishPlatform, state.selectedPlan).reply_markup).catch(() => {});
});

bot.action("plat_done", async ctx => {
  const state = getState(ctx);
  if (state.step !== "platformSelect") {
    await ctx.reply(state.lang === "ar" ? "⚠️ غير متاح الآن." : "⚠️ Not available now.").catch(() => {});
    return;
  }
  if (!Array.isArray(state.publishPlatform) || state.publishPlatform.length === 0) {
    await ctx.answerCbQuery(state.lang === "ar" ? "⚠️ يرجى اختيار منصة واحدة على الأقل" : "⚠️ Please select at least one platform", { show_alert: true });
    return;
  }
  state.step = "contactMethod";
  await ctx.editMessageReplyMarkup().catch(() => {});
  const platLabels = {
    telegram:  { ar: "تيليغرام 📱",  en: "Telegram 📱" },
    website:   { ar: "الموقع 🌍",    en: "Website 🌍" },
    facebook:  { ar: "فيسبوك 📘",   en: "Facebook 📘" },
    instagram: { ar: "انستقرام 📷",  en: "Instagram 📷" },
    x:         { ar: "X ✖️",         en: "X ✖️" },
  };
  const chosenAr = state.publishPlatform.map(p => (platLabels[p] || { ar: p }).ar).join(" + ");
  const chosenEn = state.publishPlatform.map(p => (platLabels[p] || { en: p }).en).join(" + ");
  await ctx.reply(
    state.lang === "ar"
      ? "✅ منصات النشر: " + chosenAr + "\n\n📞 كيف تفضل أن يتواصل معك المشترون؟"
      : "✅ Publishing to: " + chosenEn + "\n\n📞 How would you like buyers to contact you?",
    buildContactKeyboard(state.lang, [], !!state.telegramUsername)
  );
});

CATEGORIES.forEach(cat => {
  bot.action("cat_" + cat.id, async ctx => {
    if (!guardStep(ctx, "category")) return;
    const state = getState(ctx);
    state.category = cat.id;
    state.categoryName = state.lang === "ar" ? cat.ar : cat.en;
    await ctx.editMessageReplyMarkup().catch(() => {});

    // Check if this category has sub-categories
    const subKb = subCategoryKeyboard(state.lang, cat.id);
    if (subKb) {
      state.step = "subCategory";
      await ctx.reply(state.lang === "ar"
        ? "✅ الفئة: " + cat.ar + "\n\n📋 اختر التصنيف الفرعي:"
        : "✅ Category: " + cat.en + "\n\n📋 Select sub-category:",
        subKb
      );
    } else {
      // No sub-categories → go to location
      state.step = "location";
      await ctx.reply(state.lang === "ar"
        ? "✅ الفئة: " + cat.ar + "\n\n📍 اختر الإمارة:"
        : "✅ Category: " + cat.en + "\n\n📍 Select the emirate:",
        locationKeyboard(state.lang)
      );
    }
  });
});

// ── Sub-category selection (generic for all categories) ─────────────────────
bot.action(/^subcat_(.+)$/, async ctx => {
  if (!guardStep(ctx, "subCategory")) return;
  const state = getState(ctx);
  const value = ctx.match[1];
  state.subCategory = value;
  state.subCategoryName = getSubCatLabel(value, state.lang);
  state.step = "location";
  await ctx.editMessageReplyMarkup().catch(() => {});
  await ctx.reply(state.lang === "ar"
    ? "✅ " + state.subCategoryName + "\n\n📍 اختر الإمارة:"
    : "✅ " + state.subCategoryName + "\n\n📍 Select the emirate:",
    locationKeyboard(state.lang)
  );
});

// ── Location selection ──────────────────────────────────────────────────────
UAE_LOCATIONS.forEach(loc => {
  bot.action("loc_" + loc.value, async ctx => {
    if (!guardStep(ctx, "location")) return;
    const state = getState(ctx);
    // "All Emirates" is virtual — store null so existing single-location filters
    // treat the ad as emirate-agnostic. Display label still reflects the choice.
    state.location = loc.value === "all-emirates" ? null : loc.value;
    state.locationName = state.lang === "ar" ? loc.ar : loc.en;
    state.step = "title";
    await ctx.editMessageReplyMarkup().catch(() => {});
    await ctx.reply(state.lang === "ar"
      ? "✅ الموقع: " + loc.ar + "\n\n📝 أدخل عنوان الإعلان (الحد الأقصى " + MAX_TITLE_CHARS + " حرفاً)\nمثال: سيارة للبيع موديل 2000"
      : "✅ Location: " + loc.en + "\n\n📝 Enter your ad title (max " + MAX_TITLE_CHARS + " characters)\nExample: Car for sale model 2000"
    );
  });
});

bot.action("price_final", async ctx => {
  const state = getState(ctx);
  if (state.step !== "priceConfirm") {
    await ctx.reply(state.lang === "ar" ? "⚠️ غير متاح الآن." : "⚠️ Not available now.").catch(() => {});
    return;
  }
  state.isNegotiable = false;
  await ctx.editMessageReplyMarkup().catch(() => {});
  await handleAfterPrice(ctx);
});

bot.action("price_negotiable", async ctx => {
  const state = getState(ctx);
  if (state.step !== "priceConfirm") {
    await ctx.reply(state.lang === "ar" ? "⚠️ غير متاح الآن." : "⚠️ Not available now.").catch(() => {});
    return;
  }
  state.isNegotiable = true;
  await ctx.editMessageReplyMarkup().catch(() => {});
  await handleAfterPrice(ctx);
});

bot.action("img_yes", async ctx => {
  if (!guardStep(ctx, "imageAsk")) return;
  const state = getState(ctx);
  state.expectingImage = true;
  state.step = "imageUpload";
  await ctx.editMessageReplyMarkup().catch(() => {});
  await ctx.reply(state.lang === "ar"
    ? "📸 أرسل الصورة الأولى الآن.\n⚠️ الحد الأقصى لحجم الصورة: 5 ميغابايت\n⚠️ أرسل صورة واحدة فقط"
    : "📸 Send your first image now.\n⚠️ Maximum image size: 5 MB\n⚠️ Send ONE image at a time"
  );
});

bot.action("img_no", async ctx => {
  if (!guardStep(ctx, "imageAsk")) return;
  const state = getState(ctx);
  await ctx.editMessageReplyMarkup().catch(() => {});
  state.step = "summary";
  await sendSummary(ctx);
});

bot.action("img2_yes", async ctx => {
  const state = getState(ctx);
  const maxImgs = stateMaxImages(state);
  if (state.step !== "imageUpload" || state.images.length >= maxImgs) {
    await ctx.reply(state.lang === "ar" ? "⚠️ غير متاح الآن." : "⚠️ Not available now.").catch(() => {});
    return;
  }
  state.expectingImage = true;
  await ctx.editMessageReplyMarkup().catch(() => {});
  const nextNum = state.images.length + 1;
  await ctx.reply(state.lang === "ar"
    ? "📸 أرسل الصورة " + nextNum + " الآن.\n⚠️ الحد الأقصى لحجم الصورة: 5 ميغابايت"
    : "📸 Send image " + nextNum + " now.\n⚠️ Maximum image size: 5 MB"
  );
});

bot.action("img2_no", async ctx => {
  const state = getState(ctx);
  if (state.step !== "imageUpload" || state.images.length === 0) {
    await ctx.reply(state.lang === "ar" ? "⚠️ غير متاح الآن." : "⚠️ Not available now.").catch(() => {});
    return;
  }
  await ctx.editMessageReplyMarkup().catch(() => {});
  state.step = "summary";
  await sendSummary(ctx);
});

bot.action("cancel_ad", async ctx => {
  const state = getState(ctx);
  cleanupImages(state.images);
  ctx.session.state = initState();
  await ctx.reply(state.lang === "ar"
    ? "❌ تم إلغاء الإعلان.\nاستخدم /start لنشر إعلان جديد."
    : "❌ Ad cancelled.\nUse /start to post a new ad."
  );
});

bot.action("publish_ad", async ctx => {
  const state = getState(ctx);
  if (state.step !== "summary") {
    await ctx.reply(state.lang === "ar" ? "⚠️ غير متاح الآن." : "⚠️ Not available now.").catch(() => {});
    return;
  }
  state.step = "processing";
  await ctx.editMessageReplyMarkup().catch(() => {});
  await ctx.reply(state.lang === "ar"
    ? "⏳ جارٍ نشر إعلانك، يرجى الانتظار..."
    : "⏳ Publishing your ad, please wait..."
  );

  try {
    const chatId = String(ctx.chat && ctx.chat.id ? ctx.chat.id : "");
    state.telegramChatId = chatId;

    // Resolve packageId from backend by matching plan name (skipped for companies).
    let selectedPackageId = null;
    if (!state.company) {
      const planNameMap = { free: "Free", basic: "Basic", uaeflag: "UAE Flag", standard: "Standard", premium: "Premium" };
      try {
        const pkgRes = await axios.get(BACKEND_BASE_URL + "/api/public/packages", { timeout: 10000 });
        const pkgs = pkgRes.data.packages || [];
        const targetName = planNameMap[state.selectedPlan];
        const matched = pkgs.find(p => p.name === targetName);
        if (matched) selectedPackageId = matched.id;
      } catch (e) { console.error("FETCH PACKAGES ERROR:", e.message); }
    }

    const total = planTotal(state);
    const payload = {
      name: state.name,
      phone: state.phone,
      telegramChatId: chatId,
      contactMethod: Array.isArray(state.contactMethod) && state.contactMethod.length > 0 ? state.contactMethod.join(",") : "call",
      category: state.categoryName || state.category,
      text: state.text,
      title: state.title,
      adPrice: state.adPrice,
      isNegotiable: state.isNegotiable,
      language: state.lang,
      price: total,
      images: state.images.map(i => i.fileId),
      publishPlatform: Array.isArray(state.publishPlatform) ? state.publishPlatform.join(",") : state.publishPlatform,
      packageId: selectedPackageId || null,
      // Company subscription auto-publishes; pass companyId so backend skips Ziina + tags submission.
      companyId: state.company ? state.company.id : null,
      telegramUsername: state.telegramUsername || null,
      location: state.location || null,
      subCategory: state.subCategory || null,
    };

    const res = await axios.post(BACKEND_BASE_URL + "/api/telegram-ad", payload, {
      timeout: 60000,
      headers: { "Content-Type": "application/json" },
    });

    const submissionId = res && res.data && res.data.id ? res.data.id : null;
    if (!submissionId) throw new Error("NO_SUBMISSION_ID");
    state.submissionId = submissionId;

    if (total === 0) {
      const data = res.data || {};
      const adId = data.adId || submissionId;
      const adUrl = PUBLIC_URL + "/ad/" + adId;
      const platforms = Array.isArray(state.publishPlatform) ? state.publishPlatform : (state.publishPlatform || "").split(",").filter(Boolean);

      // Build links list with actual URLs from the API response
      const links = [];

      if (platforms.includes("website") && data.adUrl) {
        links.push("🌍 " + (state.lang === "ar" ? "الموقع" : "Website") + ":\n" + data.adUrl);
      } else if (platforms.includes("website")) {
        links.push("🌍 " + (state.lang === "ar" ? "الموقع" : "Website") + ":\n" + adUrl);
      }

      if (platforms.includes("telegram") && data.telegramChannelUrl) {
        links.push("📱 " + (state.lang === "ar" ? "قناة تيليغرام" : "Telegram Channel") + ":\n" + data.telegramChannelUrl);
      }

      if (platforms.includes("facebook") && data.facebookUrl) {
        links.push("📘 Facebook:\n" + data.facebookUrl);
      }

      if (platforms.includes("instagram") && data.instagramUrl) {
        links.push("📷 Instagram:\n" + data.instagramUrl);
      }

      if (platforms.includes("x") && data.xUrl) {
        links.push("✖️ X:\n" + data.xUrl);
      }

      // Fallback: if no links were built, show the ad URL
      if (links.length === 0) {
        links.push("🔗 " + (state.lang === "ar" ? "رابط الإعلان" : "Ad link") + ":\n" + adUrl);
      }

      cleanupImages(state.images);
      const savedPhone = state.phone;
      const savedContactMethod = state.contactMethod;
      const savedTitle = state.title;
      const savedCategoryName = state.categoryName;
      const savedText = state.text;
      const savedAdPrice = state.adPrice;
      const savedIsNegotiable = state.isNegotiable;
      const savedImages = state.images;
      const savedTgUsername = state.telegramUsername;
      ctx.session.state = initState();
      // Build a follow-us snippet for the same platforms the ad was posted to.
      // Mirrors lib/follow-us.ts (kept inline for the CJS Telegram process).
      const followText = buildFollowUsTextTG(platforms, state.lang === "ar" ? "ar" : "en");
      const followBlock = followText ? "\n\n" + followText : "";
      await ctx.reply(state.lang === "ar"
        ? "✅ تم نشر إعلانك بنجاح!\n\n🔗 روابط إعلانك:\n" + links.join("\n\n") + followBlock + "\n\nشكراً لاستخدامك Classifieds UAE.\nاستخدم /start لنشر إعلان جديد."
        : "✅ Your ad has been published successfully!\n\n🔗 Your ad links:\n" + links.join("\n\n") + followBlock + "\n\nThank you for using Classifieds UAE.\nUse /start to post a new ad."
      );

      // Post to Telegram channel with image
      if (TELEGRAM_CHANNEL_ID && (platforms.includes("telegram") || platforms.includes("both"))) {
        try {
          const methods = Array.isArray(savedContactMethod) ? savedContactMethod : (savedContactMethod || "call").split(",");
          const hasWA   = methods.includes("whatsapp");
          const hasCall = methods.includes("call");
          const hasTg   = methods.includes("telegram");
          const phone   = savedPhone || "";

          // Channel caption is emoji-free per spec (matches FB/IG/X output).
          const priceLine = savedAdPrice
            ? "\n" + Number(savedAdPrice).toLocaleString("en-AE") + " AED" + (savedIsNegotiable ? " · Negotiable" : "")
            : savedIsNegotiable ? "\nNegotiable" : "";

          const callLine = hasCall ? "\nCall: +" + phone : "";

          const savedLocationName = state.locationName;
          const savedSubCategoryName = state.subCategoryName;
          const locationLine = savedLocationName ? "\n" + savedLocationName : "";
          const brandLine = savedSubCategoryName ? " · " + savedSubCategoryName : "";
          const channelText =
            savedTitle +
            "\n" + savedCategoryName + brandLine +
            locationLine +
            priceLine +
            callLine +
            "\n\n" + savedText +
            "\n\n" + adUrl;

          const buttons = [];
          if (hasWA)  buttons.push({ text: "WhatsApp", url: "https://wa.me/" + phone });
          if (hasTg && savedTgUsername) buttons.push({ text: "Telegram", url: "https://t.me/" + savedTgUsername });
          buttons.push({ text: "View Ad", url: adUrl });

          // If images exist, use sendPhoto for the first image
          if (savedImages && savedImages.length > 0 && savedImages[0].fileId) {
            await ctx.telegram.sendPhoto(TELEGRAM_CHANNEL_ID, savedImages[0].fileId, {
              caption: channelText.slice(0, 1024),
              reply_markup: { inline_keyboard: [buttons] },
            });
          } else {
            await ctx.telegram.sendMessage(TELEGRAM_CHANNEL_ID, channelText, {
              reply_markup: { inline_keyboard: [buttons] },
            });
          }
          console.log("BOT CHANNEL POST: sent OK");
        } catch (e) { console.error("CHANNEL PUBLISH ERROR:", e.message, e.stack); }
      }
      return;
    }

    const paymentRes = await axios.post(
      BACKEND_BASE_URL + "/api/payments/create",
      { submissionId },
      { timeout: 15000 }
    );
    const checkoutUrl = paymentRes && paymentRes.data && paymentRes.data.checkoutUrl ? paymentRes.data.checkoutUrl : null;
    if (!checkoutUrl) throw new Error("NO_CHECKOUT_URL");
    state.step = "awaiting_payment";
    await ctx.reply(state.lang === "ar"
      ? "💳 لإتمام نشر إعلانك، يرجى إكمال عملية الدفع:\n\n👇 اضغط الرابط أدناه للدفع الآمن:\n" + checkoutUrl + "\n\n✅ بعد إتمام الدفع بنجاح، سيُنشر إعلانك فوراً وستصلك رسالة تأكيد.\n\n⚠️ لإلغاء الإعلان أرسل /cancel"
      : "💳 To complete publishing your ad, please complete the payment:\n\n👇 Tap the link below for secure payment:\n" + checkoutUrl + "\n\n✅ After successful payment, your ad will be published instantly and you will receive a confirmation message.\n\n⚠️ To cancel this ad send /cancel"
    );

  } catch (err) {
    console.error("PUBLISH ERROR:", err && err.response ? err.response.data : err && err.message ? err.message : err);
    state.step = "summary";
    await ctx.reply(state.lang === "ar"
      ? "❌ حدث خطأ أثناء نشر الإعلان. يرجى المحاولة مرة أخرى أو أرسل /cancel للإلغاء."
      : "❌ An error occurred while publishing. Please try again or send /cancel to cancel."
    );
  }
});

async function handleAfterPrice(ctx) {
  const state = getState(ctx);
  const priceDisplay = state.isNegotiable
    ? (state.lang === "ar" ? "قابل للتفاوض" : "Negotiable")
    : state.adPrice + " AED";

  if (planSupportsImages(state.selectedPlan)) {
    state.step = "imageAsk";
    await ctx.reply(
      state.lang === "ar"
        ? "✅ سعر المنتج: " + priceDisplay + "\n\n📸 هل تريد إضافة صور للإعلان؟\n(حتى " + stateMaxImages(state) + " صور)"
        : "✅ Product price: " + priceDisplay + "\n\n📸 Would you like to add images to your ad?\n(Up to " + stateMaxImages(state) + " images)",
      Markup.inlineKeyboard([[
        Markup.button.callback(state.lang === "ar" ? "✅ نعم، أضف صور" : "✅ Yes, add images", "img_yes"),
        Markup.button.callback(state.lang === "ar" ? "❌ لا، تخطَّ" : "❌ No, skip", "img_no"),
      ]])
    );
  } else {
    state.step = "summary";
    await sendSummary(ctx);
  }
}

async function sendSummary(ctx) {
  const state = getState(ctx);
  state.step = "summary";
  const total     = planTotal(state);
  const priceDisplay = state.isNegotiable
    ? (state.lang === "ar" ? "قابل للتفاوض" : "Negotiable")
    : (state.adPrice != null ? state.adPrice + " AED" : (state.lang === "ar" ? "غير محدد" : "Not specified"));
  const planLabelsAr = { free: "مجاني 🆓", basic: "أساسي 📦", uaeflag: "علم الإمارات 🇦🇪", standard: "قياسي ⭐", premium: "بريميوم 💎" };
  const planLabelsEn = { free: "Free 🆓", basic: "Basic 📦", uaeflag: "UAE Flag 🇦🇪", standard: "Standard ⭐", premium: "Premium 💎" };
  const planLabelAr = planLabelsAr[state.selectedPlan] || "مجاني 🆓";
  const planLabelEn = planLabelsEn[state.selectedPlan] || "Free 🆓";
  const limits = PLAN_LIMITS[state.selectedPlan] || PLAN_LIMITS.free;
  const platLabels = { telegram: { ar: "تيليغرام", en: "Telegram" }, website: { ar: "الموقع", en: "Website" }, facebook: { ar: "فيسبوك", en: "Facebook" }, instagram: { ar: "انستقرام", en: "Instagram" }, x: { ar: "X", en: "X" } };
  const platforms = Array.isArray(state.publishPlatform) ? state.publishPlatform : (state.publishPlatform || "website").split(",");
  const platformLabelAr = platforms.map(p => (platLabels[p] || { ar: p }).ar).join(" + ");
  const platformLabelEn = platforms.map(p => (platLabels[p] || { en: p }).en).join(" + ");

  if (state.lang === "ar") {
    const freeNote = total === 0
      ? "\n✅ إعلانك مجاني وسيُنشر فوراً بعد الضغط على «نشر»."
      : "\n💳 ستُحوَّل إلى صفحة الدفع الآمن لإتمام النشر.";
    await ctx.reply(
      "📋 ملخص الإعلان\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "👤 الاسم: " + state.name + "\n" +
      "📞 الهاتف: " + state.phone + "\n" +
      "📂 الفئة: " + state.categoryName + "\n" +
      (state.subCategoryName ? (function(){ var m = getSubCatMeta(state.category); return m.icon + " " + m.ar + ": " + state.subCategoryName + "\n"; })() : "") +
      (state.locationName ? "📍 الموقع: " + state.locationName + "\n" : "") +
      "🌐 منصة النشر: " + platformLabelAr + "\n\n" +
      "📝 العنوان: " + state.title + "\n" +
      "📄 الوصف:\n" + state.text + "\n\n" +
      "💰 سعر المنتج: " + priceDisplay + "\n\n" +
      "🧾 تفاصيل التكلفة:\n" +
      "• الباقة (" + planLabelAr + "): " + limits.price + " درهم\n" +
      "• " + limits.maxChars + " حرف · " + state.images.length + "/" + limits.maxImages + " صور · " + limits.displayDays + " أيام\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "💵 الإجمالي: " + total + " درهم" +
      freeNote + "\n\n" +
      "هل تريد نشر الإعلان؟",
      Markup.inlineKeyboard([[
        Markup.button.callback("🚀 نشر الإعلان", "publish_ad"),
        Markup.button.callback("❌ إلغاء", "cancel_ad"),
      ]])
    );
  } else {
    const freeNote = total === 0
      ? "\n✅ Your ad is free and will be published instantly after tapping «Publish»."
      : "\n💳 You will be redirected to secure payment to complete publishing.";
    await ctx.reply(
      "📋 Ad Summary\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "👤 Name: " + state.name + "\n" +
      "📞 Phone: " + state.phone + "\n" +
      "📂 Category: " + state.categoryName + "\n" +
      (state.subCategoryName ? (function(){ var m = getSubCatMeta(state.category); return m.icon + " " + m.en + ": " + state.subCategoryName + "\n"; })() : "") +
      (state.locationName ? "📍 Location: " + state.locationName + "\n" : "") +
      "🌐 Publishing to: " + platformLabelEn + "\n\n" +
      "📝 Title: " + state.title + "\n" +
      "📄 Description:\n" + state.text + "\n\n" +
      "💰 Product price: " + priceDisplay + "\n\n" +
      "🧾 Cost breakdown:\n" +
      "• Plan (" + planLabelEn + "): " + limits.price + " AED\n" +
      "• " + limits.maxChars + " chars · " + state.images.length + "/" + limits.maxImages + " images · " + limits.displayDays + " days\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "💵 Total: " + total + " AED" +
      freeNote + "\n\n" +
      "Would you like to publish your ad?",
      Markup.inlineKeyboard([[
        Markup.button.callback("🚀 Publish Ad", "publish_ad"),
        Markup.button.callback("❌ Cancel", "cancel_ad"),
      ]])
    );
  }
}


// ── Contact method multi-select ──────────────────────────────────────────────

function buildContactKeyboard(lang, selected, hasTgUsername) {
  const opts = [
    { key: "whatsapp", ar: "واتسآب",   en: "WhatsApp", icon: "📱" },
    ...(hasTgUsername ? [{ key: "telegram", ar: "تيليجرام", en: "Telegram",  icon: "✈️" }] : []),
    { key: "call",     ar: "مكالمة",   en: "Call",      icon: "📞" },
  ];
  const row1 = opts.map(o => {
    const on = selected.includes(o.key);
    const label = (on ? "✅ " : "") + o.icon + " " + (lang === "ar" ? o.ar : o.en);
    return Markup.button.callback(label, "contact_toggle_" + o.key);
  });
  const doneLabel = lang === "ar" ? "✔️ تأكيد الاختيار" : "✔️ Confirm";
  const row2 = [Markup.button.callback(doneLabel, "contact_done")];
  return Markup.inlineKeyboard([row1, row2]);
}

bot.action(/^contact_toggle_(.+)$/, async ctx => {
  const state = getState(ctx);
  if (state.step !== "contactMethod") {
    await ctx.reply(state.lang === "ar" ? "⚠️ غير متاح الآن." : "⚠️ Not available now.").catch(() => {});
    return;
  }
  const method = ctx.match[1]; // whatsapp | telegram | call
  if (!Array.isArray(state.contactMethod)) state.contactMethod = [];
  if (state.contactMethod.includes(method)) {
    state.contactMethod = state.contactMethod.filter(m => m !== method);
  } else {
    state.contactMethod.push(method);
  }
  // Update the keyboard in-place showing new toggle state
  const prompt = state.lang === "ar"
    ? "📞 اختر طريقة تواصل واحدة أو أكثر، ثم اضغط تأكيد:"
    : "📞 Choose one or more contact methods, then tap Confirm:";
  await ctx.editMessageReplyMarkup(buildContactKeyboard(state.lang, state.contactMethod, !!state.telegramUsername).reply_markup).catch(() => {});
});

bot.action("contact_done", async ctx => {
  const state = getState(ctx);
  if (state.step !== "contactMethod") {
    await ctx.reply(state.lang === "ar" ? "⚠️ غير متاح الآن." : "⚠️ Not available now.").catch(() => {});
    return;
  }
  if (!Array.isArray(state.contactMethod) || state.contactMethod.length === 0) {
    await ctx.answerCbQuery(state.lang === "ar" ? "⚠️ يرجى اختيار طريقة واحدة على الأقل" : "⚠️ Please select at least one method", { show_alert: true });
    return;
  }
  state.step = "category";
  await ctx.editMessageReplyMarkup().catch(() => {});
  const methodLabels = {
    whatsapp: { ar: "واتسآب 📱",    en: "WhatsApp 📱" },
    telegram: { ar: "تيليجرام ✈️", en: "Telegram ✈️" },
    call:     { ar: "مكالمة 📞",    en: "Call 📞" },
  };
  const chosenAr = state.contactMethod.map(m => methodLabels[m].ar).join(" + ");
  const chosenEn = state.contactMethod.map(m => methodLabels[m].en).join(" + ");
  await ctx.reply(
    state.lang === "ar"
      ? "✅ طريقة التواصل: " + chosenAr + "\n\n🗂 اختر فئة الإعلان:"
      : "✅ Contact method: " + chosenEn + "\n\n🗂 Choose your ad category:",
    categoryKeyboard(state.lang)
  );
});
bot.on("text", async ctx => {
  const state = getState(ctx);
  state.telegramChatId = String(ctx.chat && ctx.chat.id ? ctx.chat.id : "");
  const msg = (ctx.message.text || "").trim();
  if (msg.startsWith("/")) return;

  const buttonSteps = ["consent","language","planSelect","platformSelect","category","subCategory","location","imageAsk","imageUpload","summary","processing","awaiting_payment","priceConfirm","contactMethod"];
  if (buttonSteps.includes(state.step)) {
    await ctx.reply(state.lang === "ar"
      ? "⚠️ يرجى الضغط على أحد الأزرار للمتابعة."
      : "⚠️ Please tap one of the buttons to continue.");
    return;
  }

  if (state.step === "phone") {
    const phone = normalizePhone(msg);
    if (!isValidUAEPhone(phone)) {
      await ctx.reply(state.lang === "ar"
        ? "❌ رقم الهاتف غير صحيح.\nيجب أن يكون رقم جوال إماراتي يبدأ بـ 05.\nمثال: 971501234567 أو 0501234567"
        : "❌ Invalid phone number.\nMust be a UAE mobile number starting with 05.\nExample: 971501234567 or 0501234567");
      return;
    }
    state.phone = phone;

    // ── Company recognition ───────────────────────────────────────────────
    // If this phone has an ACTIVE company subscription, greet by trade license
    // name and skip plan selection — the subscription locks in chars/images.
    const company = await findActiveCompanyByPhone(phone);
    if (company) {
      state.company = company;
      state.name = company.authorizedSignatory || company.tradeLicenseName;
      state.isExistingUser = true;
      await ctx.reply(state.lang === "ar"
        ? "🏢 مرحباً " + company.tradeLicenseName + "!\nباقتك: " + company.plan.nameAr +
          "\n• " + company.plan.maxAdChars + " حرف · " + company.plan.maxAdImages + " صور · إعلانات غير محدودة\n" +
          "✨ سننتقل مباشرة إلى اختيار منصات النشر."
        : "🏢 Welcome " + company.tradeLicenseName + "!\nYour plan: " + company.plan.name +
          "\n• " + company.plan.maxAdChars + " chars · " + company.plan.maxAdImages + " images · unlimited ads\n" +
          "✨ Skipping plan selection — going straight to publishing platforms."
      );
      // Jump straight to platform selection (the step after planSelected normally).
      state.step = "platformSelect";
      state.publishPlatform = [];
      await ctx.reply(
        state.lang === "ar"
          ? "🌐 أين تريد نشر إعلانك؟\nاختر منصة واحدة أو أكثر، ثم اضغط تأكيد:"
          : "🌐 Where would you like to publish your ad?\nChoose one or more platforms, then tap Confirm:",
        // Companies aren't on the "free" plan — pass a sentinel that allows X.
        buildPlatformKeyboard(state.lang, [], "company")
      );
      return;
    }

    // Daily limit for free ads is enforced at plan selection, not here.
    // Users can always enter their phone — they might choose a paid plan.
    const user = await prisma.user.findUnique({ where: { phone } }).catch(() => null);
    if (user) {
      state.isExistingUser = true;
      if (user.name) {
        // Fully registered user — skip name step
        state.name = user.name;
        await ctx.reply(state.lang === "ar"
          ? "🎉 مرحباً بعودتك يا " + user.name + "!\nتم التعرف على حسابك."
          : "🎉 Welcome back, " + user.name + "!\nYour account was recognized."
        );
        await askPlan(ctx);
      } else {
        // Phone known but name not saved yet — ask name then continue
        await ctx.reply(state.lang === "ar"
          ? "📱 تم التعرف على رقمك. أدخل اسمك الثنائي لإكمال ملفك الشخصي:\nمثال: محمد العلي"
          : "📱 Your number is recognized. Please enter your full name to complete your profile:\nExample: John Smith"
        );
        state.step = "name";
      }
    } else {
      state.step = "name";
      await ctx.reply(state.lang === "ar"
        ? "👤 أدخل اسمك الثنائي:\nمثال: محمد العلي"
        : "👤 Enter your full name:\nExample: John Smith"
      )
    }
    return;
  }

  if (state.step === "name") {
    if (msg.length < 3) { await ctx.reply(state.lang === "ar" ? "❌ الاسم قصير جداً (3 أحرف على الأقل)" : "❌ Name too short (minimum 3 characters)"); return; }
    if (msg.length > 50) { await ctx.reply(state.lang === "ar" ? "❌ الاسم طويل جداً (50 حرفاً كحد أقصى)" : "❌ Name too long (maximum 50 characters)"); return; }
    if (hasEmoji(msg)) { await ctx.reply(state.lang === "ar" ? "❌ لا يُسمح بالإيموجي في الاسم" : "❌ Emoji is not allowed in the name"); return; }
    if (hasBanned(msg)) { await ctx.reply(state.lang === "ar" ? "❌ الاسم يحتوي على كلمات غير مسموح بها" : "❌ Name contains prohibited words"); return; }
    state.name = msg;
    // Save name to DB for future recognition
    prisma.user.upsert({
      where: { phone: state.phone },
      update: { name: msg },
      create: { phone: state.phone, name: msg },
    }).catch(e => console.error("UPSERT NAME ERROR:", e.message));
    await ctx.reply(state.lang === "ar" ? "✅ تم حفظ الاسم: " + msg : "✅ Name saved: " + msg);
    await askPlan(ctx);
    return;
  }

  if (state.step === "title") {
    if (msg.length < 3) { await ctx.reply(state.lang === "ar" ? "❌ العنوان قصير جداً (3 أحرف على الأقل)" : "❌ Title too short (minimum 3 characters)"); return; }
    if (msg.length > MAX_TITLE_CHARS) { await ctx.reply(state.lang === "ar" ? "❌ العنوان طويل جداً. الحد الأقصى " + MAX_TITLE_CHARS + " حرفاً. (أحرفك الحالية: " + msg.length + ")" : "❌ Title too long. Maximum " + MAX_TITLE_CHARS + " characters. (Yours: " + msg.length + ")"); return; }
    if (hasEmoji(msg)) { await ctx.reply(state.lang === "ar" ? "❌ لا يُسمح بالإيموجي في العنوان" : "❌ Emoji is not allowed in the title"); return; }
    if (hasBanned(msg)) { await ctx.reply(state.lang === "ar" ? "❌ العنوان يحتوي على كلمات محظورة" : "❌ Title contains banned words"); return; }
    state.title = msg;
    state.step = "text";
    await ctx.reply(state.lang === "ar"
      ? "✅ العنوان: " + msg + "\n\n📄 اكتب نص الإعلان:\n• الحد الأقصى: " + stateMaxChars(state) + " حرفاً\n• مسموح بالعربية والإنجليزية\n• ممنوع الإيموجي والكلمات المحظورة"
      : "✅ Title: " + msg + "\n\n📄 Write your ad description:\n• Maximum: " + stateMaxChars(state) + " characters\n• Arabic and English allowed\n• No emoji or banned words"
    );
    return;
  }

  if (state.step === "text") {
    if (msg.length < 10) { await ctx.reply(state.lang === "ar" ? "❌ الوصف قصير جداً (10 أحرف على الأقل)" : "❌ Description too short (minimum 10 characters)"); return; }
    if (msg.length > stateMaxChars(state)) { await ctx.reply(state.lang === "ar" ? "❌ الوصف طويل جداً. الحد الأقصى " + stateMaxChars(state) + " حرفاً. (أحرفك الحالية: " + msg.length + ")" : "❌ Description too long. Maximum " + stateMaxChars(state) + " characters. (Yours: " + msg.length + ")"); return; }
    if (hasEmoji(msg)) { await ctx.reply(state.lang === "ar" ? "❌ لا يُسمح بالإيموجي في الوصف" : "❌ Emoji is not allowed in the description"); return; }
    if (hasBanned(msg)) { await ctx.reply(state.lang === "ar" ? "❌ الوصف يحتوي على كلمات محظورة" : "❌ Description contains banned words"); return; }
    state.text = msg;
    state.step = "adPrice";
    await ctx.reply(state.lang === "ar"
      ? "✅ تم حفظ الوصف.\n\n💰 أدخل سعر المنتج بالدرهم الإماراتي (أرقام فقط)\nمثال: 5000\n\nإذا لم يكن لديك سعر محدد، أدخل 0"
      : "✅ Description saved.\n\n💰 Enter the product price in AED (numbers only)\nExample: 5000\n\nIf you have no fixed price, enter 0"
    );
    return;
  }

  if (state.step === "adPrice") {
    const digits = normalizeDigits(msg).replace(/[^0-9]/g, "");
    const parsed = parseInt(digits, 10);
    if (isNaN(parsed) || parsed < 0) {
      await ctx.reply(state.lang === "ar"
        ? "❌ أدخل رقماً صحيحاً للسعر (مثال: 5000) أو أدخل 0 إذا لم يكن لديك سعر محدد"
        : "❌ Enter a valid price number (e.g. 5000) or enter 0 if you have no fixed price");
      return;
    }
    state.adPrice = parsed;
    state.step = "priceConfirm";
    await ctx.reply(state.lang === "ar"
      ? "✅ السعر المدخل: " + parsed + " درهم\n\nهل هذا السعر نهائي أم قابل للتفاوض؟"
      : "✅ Price entered: " + parsed + " AED\n\nIs this price final or negotiable?",
      Markup.inlineKeyboard([[
        Markup.button.callback(state.lang === "ar" ? "✅ نهائي" : "✅ Final price", "price_final"),
        Markup.button.callback(state.lang === "ar" ? "🤝 قابل للتفاوض" : "🤝 Negotiable", "price_negotiable"),
      ]])
    );
    return;
  }
});

bot.on("photo", async ctx => {
  const state = getState(ctx);
  state.telegramChatId = String(ctx.chat && ctx.chat.id ? ctx.chat.id : "");

  if (state.step !== "imageUpload" || !state.expectingImage) {
    await ctx.reply(state.lang === "ar"
      ? "⚠️ لم يُطلب منك إرسال صورة في هذه المرحلة. استخدم الأزرار للمتابعة."
      : "⚠️ No image was requested at this stage. Please use the buttons to continue.");
    return;
  }
  if (ctx.message.media_group_id) {
    await ctx.reply(state.lang === "ar"
      ? "❌ يرجى إرسال صورة واحدة فقط في كل مرة، وليس ألبوماً."
      : "❌ Please send ONE image at a time, not an album.");
    return;
  }
  if (state.images.length >= stateMaxImages(state)) {
    await ctx.reply(state.lang === "ar" ? "❌ الحد الأقصى " + stateMaxImages(state) + " صور." : "❌ Maximum " + stateMaxImages(state) + " images allowed.");
    return;
  }
  const photos = ctx.message.photo || [];
  const fileId = photos[photos.length - 1] && photos[photos.length - 1].file_id ? photos[photos.length - 1].file_id : null;
  if (!fileId) {
    await ctx.reply(state.lang === "ar" ? "❌ تعذّر قراءة الصورة. يرجى إعادة الإرسال." : "❌ Could not read the image. Please try again.");
    return;
  }

  await ctx.reply(state.lang === "ar"
    ? "⏳ جارٍ رفع الصورة، يرجى الانتظار ولا تغلق المحادثة..."
    : "⏳ Uploading your image, please wait and do not close the chat..."
  );

  const dl = await downloadTelegramFile(ctx, fileId);

  if (!dl.ok) {
    await ctx.reply(state.lang === "ar"
      ? "❌ فشل رفع الصورة (" + (dl.reason === "too_big" ? "الحجم يتجاوز 5 ميغابايت" : "خطأ في التحميل") + "). يرجى المحاولة مرة أخرى."
      : "❌ Image upload failed (" + (dl.reason === "too_big" ? "file exceeds 5 MB" : "download error") + "). Please try again."
    );
    return;
  }

  if (ENABLE_CLAMAV) {
    const scan = scanClamAV(dl.localPath);
    if (!scan.ok) {
      try { fs.unlinkSync(dl.localPath); } catch {}
      await ctx.reply(state.lang === "ar" ? "❌ تم رفض الصورة: اكتُشف محتوى ضار." : "❌ Image rejected: malware detected.");
      return;
    }
  }

  state.images.push({ fileId, localPath: dl.localPath, bytes: dl.bytes });
  state.expectingImage = false;

  const maxImgs = stateMaxImages(state);
  if (state.images.length < maxImgs) {
    const countAr = state.images.length;
    const remainAr = maxImgs - state.images.length;
    await ctx.reply(state.lang === "ar"
      ? "✅ تم استلام الصورة " + countAr + " بنجاح.\n\nهل تريد إضافة صورة أخرى؟ (متبقي " + remainAr + ")"
      : "✅ Image " + countAr + " received.\n\nAdd another image? (" + remainAr + " remaining)",
      Markup.inlineKeyboard([[
        Markup.button.callback(state.lang === "ar" ? "✅ نعم" : "✅ Yes", "img2_yes"),
        Markup.button.callback(state.lang === "ar" ? "❌ لا" : "❌ No", "img2_no"),
      ]])
    );
    return;
  }

  state.step = "summary";
  await sendSummary(ctx);
});

bot.launch();
console.log("Bot running");
