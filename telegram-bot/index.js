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

const IMG_PRICE    = 2.5;
const NORMAL_BASE  = 10;
const FEATURED_ADD = 25;
const MAX_TITLE_CHARS = 50;
const MAX_DESC_CHARS  = 300;
const MAX_IMAGES      = 2;
const MAX_ADS_PER_DAY = 5;
const MAX_IMAGE_BYTES = parseInt(process.env.TELEGRAM_MAX_IMAGE_BYTES || "", 10) || 5 * 1024 * 1024;
const ENABLE_CLAMAV   = (process.env.ENABLE_CLAMAV || "false").toLowerCase() === "true";

const BANNED_WORDS = [
  "sex","porn","escort","drugs","cocaine","casino","gambling","weapon","nude","naked","xxx",
  "قمار","جنس","مخدرات","سلاح","إباحي","كوكايين","دعارة","بغاء","خمر","حشيش",
];

const CATEGORIES = [
  { id: "vehicles",    ar: "سيارات",          en: "Vehicles" },
  { id: "real-estate", ar: "عقارات",           en: "Real Estate" },
  { id: "electronics", ar: "إلكترونيات",       en: "Electronics" },
  { id: "jobs",        ar: "وظائف",            en: "Jobs" },
  { id: "services",    ar: "خدمات",            en: "Services" },
  { id: "salons",      ar: "صالونات وتجميل",   en: "Salons & Beauty" },
  { id: "clinics",     ar: "عيادات",           en: "Clinics" },
  { id: "furniture",   ar: "أثاث",             en: "Furniture" },
  { id: "education",   ar: "تعليم وتدريب",     en: "Education & Training" },
  { id: "other",       ar: "أخرى",             en: "Other" },
];

function initState() {
  return {
    step: "consent",
    lang: null,
    name: null,
    phone: null,
    isExistingUser: false,
    telegramChatId: null,
    telegramUsername: null,
    selectedPlan: null,
    publishPlatform: [],
    contactMethod: [],
    contactMethodDone: false,
    category: null,
    categoryName: null,
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
  const imgs = state.images.length * IMG_PRICE;
  if (state.selectedPlan === "free")     return 0;
  if (state.selectedPlan === "normal")   return NORMAL_BASE + imgs;
  if (state.selectedPlan === "featured") return FEATURED_ADD + imgs;
  return 0;
}

function planSupportsImages(plan) {
  return plan === "normal" || plan === "featured";
}

function cleanupImages(images) {
  for (const img of (images || [])) {
    if (img && img.localPath) try { fs.unlinkSync(img.localPath); } catch {}
  }
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
    "🆓 Free     — 0 AED    | 3 days  | No images\n" +
    "📦 Normal   — 10 AED   | 30 days | Up to 2 images (2.5 AED each)\n" +
    "⭐ Featured — 35 AED   | 30 days | Up to 2 images (2.5 AED each) | Pinned at top\n\n" +
    "━━━━━━ العربية ━━━━━━\n" +
    "1️⃣ /start ← الموافقة على الشروط والأحكام\n" +
    "2️⃣ اختر اللغة\n" +
    "3️⃣ أدخل رقم هاتفك الإماراتي\n" +
    "4️⃣ اختر الباقة\n" +
    "5️⃣ اختر منصة النشر\n" +
    "6️⃣ اختر فئة الإعلان\n" +
    "7️⃣ أدخل عنوان الإعلان (50 حرفاً كحد أقصى)\n" +
    "8️⃣ اكتب وصف الإعلان (300 حرف كحد أقصى)\n" +
    "9️⃣ أدخل سعر المنتج\n" +
    "🔟 أضف صوراً إن كانت باقتك تدعمها\n" +
    "1️⃣1️⃣ راجع الملخص وانشر\n\n" +
    "📦 الباقات:\n" +
    "🆓 مجاني  — 0 درهم  | 3 أيام  | بدون صور\n" +
    "📦 عادي   — 10 درهم | 30 يوماً | صورتان (2.5 درهم للصورة)\n" +
    "⭐ مميز   — 35 درهم | 30 يوماً | صورتان (2.5 درهم للصورة) | مثبّت في الأعلى"
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

  await ctx.reply(
    "🏪 أهلاً بك في Classifieds UAE\n" +
    "Welcome to Classifieds UAE 🏪\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n\n" +
    "📋 الشروط والأحكام | Terms & Conditions\n\n" +
    "🚫 ممنوع تماماً | Strictly Prohibited:\n" +
    "• الألفاظ النابية | Profanity\n" +
    "• المحتوى السياسي | Political content\n" +
    "• المحتوى الإباحي | Sexual content\n" +
    "• القمار والمراهنات | Gambling & Betting\n" +
    "• المخدرات | Drugs\n" +
    "• الأسلحة | Weapons\n" +
    "• أي محتوى غير قانوني | Any illegal content\n\n" +
    "⚖️ يتحمّل الناشر كامل المسؤولية القانونية عن محتوى إعلانه.\n" +
    "⚖️ The advertiser bears full legal responsibility for all ad content.\n\n" +
    "🔒 المنصة لا تتحمّل أي مسؤولية عن محتوى الإعلانات.\n" +
    "🔒 The platform disclaims all liability for ad content.\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "👇 هل توافق على الشروط؟ | Do you agree to the terms?",
    Markup.inlineKeyboard([[
      Markup.button.callback("✅ أوافق | I Agree", "agree"),
      Markup.button.callback("❌ لا أوافق | I Disagree", "disagree"),
    ]])
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
  if (state.lang === "ar") {
    await ctx.reply(
      "📦 اختر الباقة المناسبة لإعلانك:\n\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "🆓 مجاني — 0 درهم\n" +
      "• مدة الظهور: 3 أيام فقط\n" +
      "• لا تدعم إضافة صور\n" +
      "• ترتيب عادي في نتائج البحث\n\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "📦 عادي — 10 درهم\n" +
      "• مدة الظهور: 7 أيام\n" +
      "• تدعم إضافة صورتين (2.5 درهم للصورة)\n" +
      "• ترتيب عادي في نتائج البحث\n\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "⭐ مميز — 25 درهم\n" +
      "• مدة الظهور: 14 يوماً\n" +
      "• تدعم إضافة صورتين (2.5 درهم للصورة)\n" +
      "• 📌 مثبّت في أعلى نتائج البحث\n" +
      "• شارة «مميز» على إعلانك",
      Markup.inlineKeyboard([[
        Markup.button.callback("🆓 مجاني", "plan_free"),
        Markup.button.callback("📦 عادي", "plan_normal"),
        Markup.button.callback("⭐ مميز", "plan_featured"),
      ]])
    );
  } else {
    await ctx.reply(
      "📦 Choose the right plan for your ad:\n\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "🆓 Free — 0 AED\n" +
      "• Visibility: 3 days only\n" +
      "• No images allowed\n" +
      "• Standard listing placement\n\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "📦 Normal — 10 AED\n" +
      "• Visibility: 7 days\n" +
      "• Supports up to 2 images (2.5 AED each)\n" +
      "• Standard listing placement\n\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "⭐ Featured — 25 AED\n" +
      "• Visibility: 14 days\n" +
      "• Supports up to 2 images (2.5 AED each)\n" +
      "• 📌 Pinned at the top of search results\n" +
      "• \"Featured\" badge on your ad",
      Markup.inlineKeyboard([[
        Markup.button.callback("🆓 Free", "plan_free"),
        Markup.button.callback("📦 Normal", "plan_normal"),
        Markup.button.callback("⭐ Featured", "plan_featured"),
      ]])
    );
  }
}

async function handlePlanSelected(ctx, plan) {
  if (!guardStep(ctx, "planSelect")) return;
  const state = getState(ctx);
  state.selectedPlan = plan;
  state.step = "platformSelect";
  state.publishPlatform = [];
  await ctx.editMessageReplyMarkup().catch(() => {});
  const labels = {
    free:     { ar: "🆓 مجاني (0 درهم)",   en: "🆓 Free (0 AED)" },
    normal:   { ar: "📦 عادي (10 درهم)",    en: "📦 Normal (10 AED)" },
    featured: { ar: "⭐ مميز (25 درهم)",    en: "⭐ Featured (35 AED)" },
  };
  await ctx.reply(
    state.lang === "ar"
      ? "✅ تم اختيار الباقة: " + labels[plan].ar + "\n\n🌐 أين تريد نشر إعلانك؟\nاختر منصة واحدة أو أكثر، ثم اضغط تأكيد:"
      : "✅ Plan selected: " + labels[plan].en + "\n\n🌐 Where would you like to publish your ad?\nChoose one or more platforms, then tap Confirm:",
    buildPlatformKeyboard(state.lang, [])
  );
}

bot.action("plan_free",     ctx => handlePlanSelected(ctx, "free"));
bot.action("plan_normal",   ctx => handlePlanSelected(ctx, "normal"));
bot.action("plan_featured", ctx => handlePlanSelected(ctx, "featured"));

function buildPlatformKeyboard(lang, selected) {
  const opts = [
    { key: "telegram",  ar: "تيليغرام",    en: "Telegram",   icon: "📱" },
    { key: "website",   ar: "الموقع",       en: "Website",    icon: "🌍" },
    { key: "facebook",  ar: "فيسبوك",      en: "Facebook",   icon: "📘" },
    { key: "instagram", ar: "انستقرام",     en: "Instagram",  icon: "📷" },
  ];
  const row1 = opts.slice(0, 2).map(o => {
    const on = selected.includes(o.key);
    const label = (on ? "✅ " : "") + o.icon + " " + (lang === "ar" ? o.ar : o.en);
    return Markup.button.callback(label, "plat_toggle_" + o.key);
  });
  const row2 = opts.slice(2).map(o => {
    const on = selected.includes(o.key);
    const label = (on ? "✅ " : "") + o.icon + " " + (lang === "ar" ? o.ar : o.en);
    return Markup.button.callback(label, "plat_toggle_" + o.key);
  });
  const row3 = [
    Markup.button.callback(lang === "ar" ? "🔘 تحديد الكل" : "🔘 Select All", "plat_all"),
    Markup.button.callback(lang === "ar" ? "✔️ تأكيد" : "✔️ Confirm", "plat_done"),
  ];
  return Markup.inlineKeyboard([row1, row2, row3]);
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
  await ctx.editMessageReplyMarkup(buildPlatformKeyboard(state.lang, state.publishPlatform).reply_markup).catch(() => {});
});

bot.action("plat_all", async ctx => {
  const state = getState(ctx);
  if (state.step !== "platformSelect") return;
  if (!Array.isArray(state.publishPlatform)) state.publishPlatform = [];
  const allPlats = ["telegram", "website", "facebook", "instagram"];
  if (state.publishPlatform.length === allPlats.length) {
    state.publishPlatform = [];
  } else {
    state.publishPlatform = [...allPlats];
  }
  await ctx.editMessageReplyMarkup(buildPlatformKeyboard(state.lang, state.publishPlatform).reply_markup).catch(() => {});
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
  };
  const chosenAr = state.publishPlatform.map(p => platLabels[p].ar).join(" + ");
  const chosenEn = state.publishPlatform.map(p => platLabels[p].en).join(" + ");
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
    state.step = "title";
    await ctx.editMessageReplyMarkup().catch(() => {});
    await ctx.reply(state.lang === "ar"
      ? "✅ الفئة: " + cat.ar + "\n\n📝 أدخل عنوان الإعلان (الحد الأقصى " + MAX_TITLE_CHARS + " حرفاً)\nمثال: تويوتا كامري 2022 للبيع"
      : "✅ Category: " + cat.en + "\n\n📝 Enter your ad title (max " + MAX_TITLE_CHARS + " characters)\nExample: Toyota Camry 2022 for sale"
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
  if (state.step !== "imageUpload" || state.images.length !== 1) {
    await ctx.reply(state.lang === "ar" ? "⚠️ غير متاح الآن." : "⚠️ Not available now.").catch(() => {});
    return;
  }
  state.expectingImage = true;
  await ctx.editMessageReplyMarkup().catch(() => {});
  await ctx.reply(state.lang === "ar"
    ? "📸 أرسل الصورة الثانية الآن.\n⚠️ الحد الأقصى لحجم الصورة: 5 ميغابايت"
    : "📸 Send your second image now.\n⚠️ Maximum image size: 5 MB"
  );
});

bot.action("img2_no", async ctx => {
  const state = getState(ctx);
  if (state.step !== "imageUpload" || state.images.length !== 1) {
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

    let selectedPackageId = null;
    if (state.selectedPlan === "normal" || state.selectedPlan === "featured") {
      try {
        const pkgRes = await axios.get(BACKEND_BASE_URL + "/api/public/packages", { timeout: 10000 });
        const pkgs = pkgRes.data.packages || [];
        if (state.selectedPlan === "featured") {
          const p = pkgs.find(p => p.isFeatured);
          if (p) selectedPackageId = p.id;
        } else {
          const p = pkgs.find(p => !p.isFeatured && p.price > 0);
          if (p) selectedPackageId = p.id;
        }
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
      telegramUsername: state.telegramUsername || null,
    };

    const res = await axios.post(BACKEND_BASE_URL + "/api/telegram-ad", payload, {
      timeout: 20000,
      headers: { "Content-Type": "application/json" },
    });

    const submissionId = res && res.data && res.data.id ? res.data.id : null;
    if (!submissionId) throw new Error("NO_SUBMISSION_ID");
    state.submissionId = submissionId;

    if (total === 0) {
      const adUrl = (res.data && res.data.adUrl) ? res.data.adUrl : PUBLIC_URL + "/ad/" + submissionId;
      const facebookUrl = res.data && res.data.facebookUrl ? res.data.facebookUrl : null;
      const instagramUrl = res.data && res.data.instagramUrl ? res.data.instagramUrl : null;
      const platforms = Array.isArray(state.publishPlatform) ? state.publishPlatform : [state.publishPlatform];

      // Build links list
      const links = [];
      if (platforms.includes("website"))   links.push("🌍 " + (state.lang === "ar" ? "الموقع" : "Website") + ":\n" + adUrl);
      if (facebookUrl)                     links.push("📘 " + (state.lang === "ar" ? "فيسبوك" : "Facebook") + ":\n" + facebookUrl);
      if (instagramUrl)                    links.push("📷 " + (state.lang === "ar" ? "انستقرام" : "Instagram") + ":\n" + instagramUrl);
      if (platforms.includes("telegram"))  links.push("📱 " + (state.lang === "ar" ? "قناة تيليغرام" : "Telegram Channel"));

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
      await ctx.reply(state.lang === "ar"
        ? "✅ تم نشر إعلانك بنجاح!\n\n🔗 روابط إعلانك:\n" + links.join("\n\n") + "\n\nشكراً لاستخدامك Classifieds UAE.\nاستخدم /start لنشر إعلان جديد."
        : "✅ Your ad has been published successfully!\n\n🔗 Your ad links:\n" + links.join("\n\n") + "\n\nThank you for using Classifieds UAE.\nUse /start to post a new ad."
      );

      // Post to Telegram channel with image
      if (TELEGRAM_CHANNEL_ID && (platforms.includes("telegram") || platforms.includes("both"))) {
        try {
          const methods = Array.isArray(savedContactMethod) ? savedContactMethod : (savedContactMethod || "call").split(",");
          const hasWA   = methods.includes("whatsapp");
          const hasCall = methods.includes("call");
          const hasTg   = methods.includes("telegram");
          const phone   = savedPhone || "";

          const priceLine = savedAdPrice
            ? "\n💰 " + Number(savedAdPrice).toLocaleString("en-AE") + " AED" + (savedIsNegotiable ? " · Negotiable" : "")
            : savedIsNegotiable ? "\n💰 Negotiable" : "";

          const callLine = hasCall ? "\n📞 +" + phone : "";

          const channelText =
            "📢 " + savedTitle +
            "\n📂 " + savedCategoryName +
            priceLine +
            callLine +
            "\n\n" + savedText +
            "\n\n🔗 " + adUrl;

          const buttons = [];
          if (hasWA)  buttons.push({ text: "💬 WhatsApp", url: "https://wa.me/" + phone });
          if (hasTg && savedTgUsername) buttons.push({ text: "✈️ Telegram", url: "https://t.me/" + savedTgUsername });
          buttons.push({ text: "🔗 View Ad", url: adUrl });

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
        ? "✅ سعر المنتج: " + priceDisplay + "\n\n📸 هل تريد إضافة صور للإعلان؟\n(" + IMG_PRICE + " درهم لكل صورة، صورتان كحد أقصى)"
        : "✅ Product price: " + priceDisplay + "\n\n📸 Would you like to add images to your ad?\n(" + IMG_PRICE + " AED each, max 2 images)",
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
  const imgCost   = state.images.length * IMG_PRICE;
  const planBase  = state.selectedPlan === "normal" ? NORMAL_BASE : 0;
  const planExtra = state.selectedPlan === "featured" ? FEATURED_ADD : 0;
  const priceDisplay = state.isNegotiable
    ? (state.lang === "ar" ? "قابل للتفاوض" : "Negotiable")
    : (state.adPrice != null ? state.adPrice + " AED" : (state.lang === "ar" ? "غير محدد" : "Not specified"));
  const planLabelAr = state.selectedPlan === "featured" ? "مميز ⭐" : state.selectedPlan === "normal" ? "عادي 📦" : "مجاني 🆓";
  const planLabelEn = state.selectedPlan === "featured" ? "Featured ⭐" : state.selectedPlan === "normal" ? "Normal 📦" : "Free 🆓";
  const platLabels = { telegram: { ar: "تيليغرام", en: "Telegram" }, website: { ar: "الموقع", en: "Website" }, facebook: { ar: "فيسبوك", en: "Facebook" }, instagram: { ar: "انستقرام", en: "Instagram" } };
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
      "🌐 منصة النشر: " + platformLabelAr + "\n\n" +
      "📝 العنوان: " + state.title + "\n" +
      "📄 الوصف:\n" + state.text + "\n\n" +
      "💰 سعر المنتج: " + priceDisplay + "\n\n" +
      "🧾 تفاصيل التكلفة:\n" +
      "• الباقة (" + planLabelAr + "): " + (planBase + planExtra) + " درهم\n" +
      "• الصور (" + state.images.length + "): " + imgCost + " درهم\n" +
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
      "🌐 Publishing to: " + platformLabelEn + "\n\n" +
      "📝 Title: " + state.title + "\n" +
      "📄 Description:\n" + state.text + "\n\n" +
      "💰 Product price: " + priceDisplay + "\n\n" +
      "🧾 Cost breakdown:\n" +
      "• Plan (" + planLabelEn + "): " + (planBase + planExtra) + " AED\n" +
      "• Images (" + state.images.length + "): " + imgCost + " AED\n" +
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

  const buttonSteps = ["consent","language","planSelect","platformSelect","category","imageAsk","imageUpload","summary","processing","awaiting_payment","priceConfirm","contactMethod"];
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
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todayCount = await prisma.adSubmission.count({ where: { phone, createdAt: { gte: since } } }).catch(() => 0);
    if (todayCount >= MAX_ADS_PER_DAY) {
      await ctx.reply(state.lang === "ar"
        ? "❌ لقد وصلت إلى الحد الأقصى (" + MAX_ADS_PER_DAY + " إعلانات كل 24 ساعة). يرجى المحاولة لاحقاً."
        : "❌ You have reached the daily limit (" + MAX_ADS_PER_DAY + " ads per 24 hours). Please try again later.");
      return;
    }
    const user = await prisma.user.findUnique({ where: { phone } }).catch(() => null);
    state.phone = phone;
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
      ? "✅ العنوان: " + msg + "\n\n📄 اكتب وصف الإعلان:\n• الحد الأقصى: " + MAX_DESC_CHARS + " حرفاً\n• مسموح بالعربية والإنجليزية\n• ممنوع الإيموجي والكلمات المحظورة"
      : "✅ Title: " + msg + "\n\n📄 Write your ad description:\n• Maximum: " + MAX_DESC_CHARS + " characters\n• Arabic and English allowed\n• No emoji or banned words"
    );
    return;
  }

  if (state.step === "text") {
    if (msg.length < 10) { await ctx.reply(state.lang === "ar" ? "❌ الوصف قصير جداً (10 أحرف على الأقل)" : "❌ Description too short (minimum 10 characters)"); return; }
    if (msg.length > MAX_DESC_CHARS) { await ctx.reply(state.lang === "ar" ? "❌ الوصف طويل جداً. الحد الأقصى " + MAX_DESC_CHARS + " حرفاً. (أحرفك الحالية: " + msg.length + ")" : "❌ Description too long. Maximum " + MAX_DESC_CHARS + " characters. (Yours: " + msg.length + ")"); return; }
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
  if (state.images.length >= MAX_IMAGES) {
    await ctx.reply(state.lang === "ar" ? "❌ الحد الأقصى " + MAX_IMAGES + " صور." : "❌ Maximum " + MAX_IMAGES + " images allowed.");
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

  if (state.images.length === 1) {
    await ctx.reply(state.lang === "ar"
      ? "✅ تم استلام الصورة الأولى بنجاح.\n\nهل تريد إضافة صورة ثانية؟"
      : "✅ First image received successfully.\n\nWould you like to add a second image?",
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
