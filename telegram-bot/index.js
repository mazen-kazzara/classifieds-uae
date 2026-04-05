require("dotenv").config();

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

const BACKEND_BASE_URL = (process.env.BACKEND_API || "http://localhost:3000/api/telegram-ad").replace(/\/api\/telegram-ad\/?$/, "");
const PUBLIC_URL = process.env.APP_URL || BACKEND_BASE_URL;

// ── Telegram Channel Config ──────────────────────────────────────────────────
// Set TELEGRAM_CHANNEL_ID in your .env to publish ads to a channel after payment
// Example: TELEGRAM_CHANNEL_ID=-1003421420831
// Leave blank to disable channel publishing
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || "";

// Pricing constants (must match web)
const CHAR_PRICE = 10; // AED per 100 chars
const IMG_PRICE = 5;   // AED per image

function initState() {
  return {
    step: "consent",
    lang: null,
    name: null,
    phone: null,
    telegramChatId: null,
    contactMethod: null, // "call" | "telegram" | "both"
    category: null,
    categoryName: null,
    text: null,
    title: null,
    adPrice: null,       // integer AED or null
    isNegotiable: false,
    textPrice: 0,
    images: [],
    expectingImage: false,
    submissionId: null,
  };
}

bot.use(session({ defaultSession: () => ({}) }));

function ensureSession(ctx) {
  if (!ctx.session) ctx.session = {};
  if (!ctx.session.state) ctx.session.state = initState();
  return ctx.session.state;
}

bot.catch((err) => { console.error("BOT ERROR:", err); });

function guardStep(ctx, expectedStep) {
  const state = ensureSession(ctx);
  if (state.step !== expectedStep) {
    ctx.reply(state.lang === "ar"
      ? "⚠️ هذه الخطوة تم تنفيذها بالفعل أو غير متاحة الآن."
      : "⚠️ This step is already completed or not available now."
    ).catch(() => {});
    return false;
  }
  return true;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeDigits(input) {
  const map = {"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9"};
  return input.replace(/[٠-٩]/g, d => map[d]);
}

function normalizePhone(raw) {
  let phone = normalizeDigits(raw).replace(/[^0-9]/g, "");
  if (phone.startsWith("00971")) phone = phone.substring(2);
  if (phone.startsWith("971")) return phone;
  if (phone.startsWith("05") && phone.length === 10) return "971" + phone.substring(1);
  return phone;
}

function hasArabic(text) { return /[\u0600-\u06FF]/.test(text); }
function hasEnglish(text) { return /[A-Za-z]/.test(text); }
function containsEmoji(text) { return /[\u{1F300}-\u{1FAFF}]/u.test(text); }

const bannedWords = ["sex","porn","escort","drugs","cocaine","casino","gambling","politics","weapon","قمار","جنس","مخدرات","سياسة","سلاح"];
function containsBanned(text) { const lower = text.toLowerCase(); return bannedWords.some(w => lower.includes(w)); }

function cleanupTempImages(images) {
  for (const img of images || []) {
    if (!img?.localPath) continue;
    try { fs.unlinkSync(img.localPath); } catch {}
  }
}

const MAX_IMAGE_BYTES = parseInt(process.env.TELEGRAM_MAX_IMAGE_BYTES || "", 10) || 5 * 1024 * 1024;
const ENABLE_CLAMAV = (process.env.ENABLE_CLAMAV || "true").toLowerCase() === "true";

function tempFilePath(ext = ".jpg") {
  return path.join(os.tmpdir(), "tg_" + crypto.randomBytes(16).toString("hex") + ext);
}

async function downloadTelegramFile(ctx, fileId) {
  const file = await ctx.telegram.getFile(fileId);
  if (file.file_size && file.file_size > MAX_IMAGE_BYTES) return { ok: false, reason: "too_big" };
  const filePath = file.file_path;
  if (!filePath) return { ok: false, reason: "no_file_path" };
  const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;
  const ext = path.extname(filePath) || ".jpg";
  const outPath = tempFilePath(ext);
  const resp = await axios.get(url, { responseType: "stream" });
  let bytes = 0;
  const writer = fs.createWriteStream(outPath);
  const done = new Promise((resolve, reject) => {
    resp.data.on("data", chunk => { bytes += chunk.length; if (bytes > MAX_IMAGE_BYTES) resp.data.destroy(new Error("FILE_TOO_BIG")); });
    resp.data.on("error", reject);
    writer.on("error", reject);
    writer.on("finish", resolve);
  });
  resp.data.pipe(writer);
  try { await done; } catch (e) { try { fs.unlinkSync(outPath); } catch {} return { ok: false, reason: String(e.message || "download_failed") }; }
  return { ok: true, localPath: outPath, bytes };
}

function scanWithClamAV(filePath) {
  const res = spawnSync("clamscan", ["--no-summary", filePath], { encoding: "utf8" });
  if (res.error) return { ok: false, reason: "clamav_missing" };
  if (res.status === 0) return { ok: true };
  if (res.status === 1) return { ok: false, reason: "infected" };
  return { ok: false, reason: "scan_error" };
}

// ── Categories (synced with DB seed) ─────────────────────────────────────────
const categories = [
  { id: "vehicles",    ar: "سيارات",           en: "Vehicles" },
  { id: "real-estate", ar: "عقارات",           en: "Real Estate" },
  { id: "electronics", ar: "إلكترونيات",       en: "Electronics" },
  { id: "jobs",        ar: "وظائف",            en: "Jobs" },
  { id: "services",    ar: "خدمات",            en: "Services" },
  { id: "salons",      ar: "صالونات وتجميل",   en: "Salons & Beauty" },
  { id: "clinics",     ar: "عيادات",           en: "Clinics" },
  { id: "furniture",   ar: "أثاث",             en: "Furniture" },
  { id: "education",   ar: "تعليم وتدريب",     en: "Education" },
  { id: "other",       ar: "أخرى",             en: "Other" },
];

// ── Contact methods (Telegram bot: Call | Telegram | Both) ───────────────────
const contactMethods = [
  { id: "call",     ar: "اتصال",   en: "Phone Call" },
  { id: "telegram", ar: "تيليجرام", en: "Telegram" },
  { id: "both",     ar: "كلاهما",  en: "Both" },
];

function categoryKeyboard(state) {
  const rows = [];
  for (let i = 0; i < categories.length; i += 2) {
    const row = [Markup.button.callback(state.lang === "ar" ? categories[i].ar : categories[i].en, "cat_" + categories[i].id)];
    if (categories[i+1]) row.push(Markup.button.callback(state.lang === "ar" ? categories[i+1].ar : categories[i+1].en, "cat_" + categories[i+1].id));
    rows.push(row);
  }
  return Markup.inlineKeyboard(rows);
}

function contactMethodKeyboard(state) {
  return Markup.inlineKeyboard(contactMethods.map(m => [Markup.button.callback(state.lang === "ar" ? m.ar : m.en, "contact_" + m.id)]));
}

function getContactMethodLabel(state) {
  const m = contactMethods.find(x => x.id === state.contactMethod);
  if (!m) return state.lang === "ar" ? "غير محدد" : "Not set";
  return state.lang === "ar" ? m.ar : m.en;
}

// ── /help ─────────────────────────────────────────────────────────────────────
bot.command("help", async ctx => {
  await ctx.reply(
`📘 Classifieds UAE — How to post your ad:

1️⃣ /start → Agree to terms
2️⃣ Choose language
3️⃣ Enter your full name
4️⃣ Enter UAE phone (971XXXXXXXXX)
5️⃣ Choose contact method (Call / Telegram / Both)
6️⃣ Choose category
7️⃣ Write ad title
8️⃣ Write ad description (10 AED / 100 chars)
9️⃣ Enter product price (or mark negotiable)
🔟 Add images (5 AED each, max 2)
1️⃣1️⃣ Choose plan (Free or Featured)
1️⃣2️⃣ Pay & publish

━━━━━━━━━━━━━━

📘 دليل نشر الإعلان:
1️⃣ /start → الموافقة على الشروط
2️⃣ اختر اللغة
3️⃣ ادخل اسمك الثنائي
4️⃣ رقم الهاتف الإماراتي (971XXXXXXXXX)
5️⃣ طريقة التواصل (اتصال / تيليجرام / كلاهما)
6️⃣ اختر الفئة
7️⃣ أدخل عنوان الإعلان
8️⃣ نص الإعلان (10 درهم / 100 حرف)
9️⃣ سعر المنتج (أو ضع علامة قابل للتفاوض)
🔟 صور (5 درهم للصورة، حد أقصى 2)
1️⃣1️⃣ اختر الباقة (مجاني أو مميز)
1️⃣2️⃣ ادفع وانشر`
  );
});

// ── /cancel ───────────────────────────────────────────────────────────────────
bot.command("cancel", async ctx => {
  const state = ensureSession(ctx);
  if (!state || state.step === "consent") {
    await ctx.reply("⚠️ No active submission.\n⚠️ لا يوجد إعلان قيد الإنشاء.\n\nUse /start to begin.");
    return;
  }
  cleanupTempImages(state.images);
  ctx.session.state = initState();
  await ctx.reply("❌ Cancelled. Use /start to begin again.\n❌ تم الإلغاء. استخدم /start للبدء من جديد.");
});

// ── /start ────────────────────────────────────────────────────────────────────
bot.start(async ctx => {
  const state = ensureSession(ctx);

  if (state.phone) {
    try {
      const last = await prisma.adSubmission.findFirst({ where: { phone: state.phone }, orderBy: { createdAt: "desc" } });
      if (last && ["DRAFT","WAITING_PAYMENT"].includes(last.status)) {
        await ctx.reply(state.lang === "ar"
          ? "⚠️ لديك إعلان قيد التنفيذ. أكمله أو استخدم /cancel."
          : "⚠️ You have a submission in progress. Finish it or use /cancel.");
        return;
      }
    } catch (err) { console.error("DB CHECK ERROR:", err); }
  }

  if (state.step && state.step !== "consent") {
    await ctx.reply(state.lang === "ar"
      ? "⚠️ لديك إعلان قيد التنفيذ. استخدم /cancel للإلغاء."
      : "⚠️ You have a submission in progress. Use /cancel to cancel.");
    return;
  }

  ctx.session.state = initState();
  ensureSession(ctx).telegramChatId = String(ctx.chat?.id || "");

  await ctx.reply(
`🚀 مرحباً بك في Classifieds UAE
🚀 Welcome to Classifieds UAE

ابدأ الآن وانشر إعلانك خلال أقل من دقيقة.
Start now and post your ad in under 1 minute.

━━━━━━━━━━━━━━
🔥 إعلانك سيُنشر فوراً بعد الدفع
🔥 Your ad will be published instantly after payment
📲 جهّز نص الإعلان + رقم التواصل
📲 Prepare your ad text + contact number
━━━━━━━━━━━━━━
👉 اضغط "موافق" وابدأ الآن
👉 Press "Agree" and start now
━━━━━━━━━━━━━━
⚠️ تنبيه | Notice

ممنوع نشر | Not allowed:
- ألفاظ نابية | Profanity
- سياسة | Politics
- محتوى جنسي | Sexual content
- قمار | Gambling
- محتوى غير قانوني | Illegal content

📌 يتحمل الناشر كامل المسؤولية القانونية عن محتوى الإعلان، وتخلي المنصة أي مسؤولية أو تبعات قانونية.
📌 The advertiser assumes full legal responsibility for the ad content, and the platform disclaims any liability or legal consequences.`,
    Markup.inlineKeyboard([[Markup.button.callback("أوافق ✓", "agree"), Markup.button.callback("I Agree ✓", "agree")]])
  );
});

// ── Agree ─────────────────────────────────────────────────────────────────────
bot.action("agree", async ctx => {
  if (!guardStep(ctx, "consent")) return;
  const state = ensureSession(ctx);
  state.step = "language";
  await ctx.editMessageReplyMarkup().catch(() => {});
  await ctx.reply("Choose language / اختر اللغة",
    Markup.inlineKeyboard([[Markup.button.callback("العربية", "lang_ar"), Markup.button.callback("English", "lang_en")]])
  );
});

// ── Language ──────────────────────────────────────────────────────────────────
bot.action("lang_ar", async ctx => {
  if (!guardStep(ctx, "language")) return;
  const state = ensureSession(ctx);
  state.lang = "ar"; state.step = "name";
  state.telegramChatId = String(ctx.chat?.id || "");
  await ctx.editMessageReplyMarkup().catch(() => {});
  await ctx.reply("تم اختيار العربية ✓\nاكتب اسمك الثنائي (مثال: محمد العلي)");
});

bot.action("lang_en", async ctx => {
  if (!guardStep(ctx, "language")) return;
  const state = ensureSession(ctx);
  state.lang = "en"; state.step = "name";
  state.telegramChatId = String(ctx.chat?.id || "");
  await ctx.editMessageReplyMarkup().catch(() => {});
  await ctx.reply("English selected ✓\nEnter your full name (e.g. John Smith)");
});

// ── Contact method ────────────────────────────────────────────────────────────
contactMethods.forEach(method => {
  bot.action("contact_" + method.id, async ctx => {
    if (!guardStep(ctx, "contactMethod")) return;
    const state = ensureSession(ctx);
    state.contactMethod = method.id;
    state.step = "category";
    await ctx.editMessageReplyMarkup().catch(() => {});
    await ctx.reply(
      state.lang === "ar" ? `طريقة التواصل: ${method.ar} ✓\nاختر الفئة` : `Contact: ${method.en} ✓\nChoose category`,
      categoryKeyboard(state)
    );
  });
});

// ── Category ──────────────────────────────────────────────────────────────────
categories.forEach(cat => {
  bot.action("cat_" + cat.id, async ctx => {
    if (!guardStep(ctx, "category")) return;
    const state = ensureSession(ctx);
    state.category = cat.id;
    state.categoryName = state.lang === "ar" ? cat.ar : cat.en;
    state.step = "title";
    await ctx.editMessageReplyMarkup().catch(() => {});
    await ctx.reply(state.lang === "ar"
      ? `الفئة: ${cat.ar} ✓\n\nاكتب عنوان الإعلان (مثال: تويوتا كورولا 2022 للبيع)`
      : `Category: ${cat.en} ✓\n\nEnter ad title (e.g. Toyota Corolla 2022 for sale)`
    );
  });
});

// ── Plan selection ────────────────────────────────────────────────────────────
bot.action("plan_free", async ctx => {
  if (!guardStep(ctx, "planSelect")) return;
  const state = ensureSession(ctx);
  state.step = "summary";
  await ctx.editMessageReplyMarkup().catch(() => {});
  await sendSummary(ctx);
});

bot.action("plan_featured", async ctx => {
  if (!guardStep(ctx, "planSelect")) return;
  const state = ensureSession(ctx);
  state.selectedPlan = "featured";
  state.step = "summary";
  await ctx.editMessageReplyMarkup().catch(() => {});
  await sendSummary(ctx);
});

// ── Negotiable toggle ─────────────────────────────────────────────────────────
bot.action("price_negotiable", async ctx => {
  if (!guardStep(ctx, "adPrice")) return;
  const state = ensureSession(ctx);
  state.isNegotiable = true;
  state.adPrice = null;
  state.step = "imageAsk";
  await ctx.editMessageReplyMarkup().catch(() => {});
  await ctx.reply(state.lang === "ar"
    ? "السعر: قابل للتفاوض ✓\nهل تريد إضافة صور؟ (5 درهم للصورة، حد أقصى 2)"
    : "Price: Negotiable ✓\nDo you want to add images? (5 AED each, max 2)",
    Markup.inlineKeyboard([[
      Markup.button.callback(state.lang === "ar" ? "نعم" : "Yes", "img_yes"),
      Markup.button.callback(state.lang === "ar" ? "لا" : "No", "img_no"),
    ]])
  );
});

// ── Image choice ──────────────────────────────────────────────────────────────
bot.action("img_yes", async ctx => {
  if (!guardStep(ctx, "imageAsk")) return;
  const state = ensureSession(ctx);
  state.expectingImage = true;
  await ctx.reply(state.lang === "ar" ? "أرسل الصورة الأولى" : "Send the first image");
});

bot.action("img_no", async ctx => {
  if (!guardStep(ctx, "imageAsk")) return;
  await askPlan(ctx);
});

bot.action("img2_yes", async ctx => {
  const state = ensureSession(ctx);
  if (state.images.length !== 1) { await ctx.reply(state.lang === "ar" ? "⚠️ غير متاح." : "⚠️ Not available.").catch(() => {}); return; }
  state.expectingImage = true;
  await ctx.reply(state.lang === "ar" ? "أرسل الصورة الثانية" : "Send the second image");
});

bot.action("img2_no", async ctx => {
  const state = ensureSession(ctx);
  if (state.images.length !== 1) { await ctx.reply(state.lang === "ar" ? "⚠️ غير متاح." : "⚠️ Not available.").catch(() => {}); return; }
  await askPlan(ctx);
});

// ── Cancel / Publish ──────────────────────────────────────────────────────────
bot.action("cancel_demo", async ctx => {
  const state = ensureSession(ctx);
  cleanupTempImages(state.images);
  ctx.session.state = initState();
  await ctx.reply(state.lang === "ar" ? "تم الإلغاء." : "Cancelled.");
});

bot.action("publish_demo", async ctx => {
  const state = ensureSession(ctx);
  if (state.step !== "summary") {
    await ctx.reply(state.lang === "ar" ? "⚠️ غير متاح الآن." : "⚠️ Not available now.").catch(() => {});
    return;
  }

  try {
    const imgPrice = state.images.length * IMG_PRICE;
    const total = state.textPrice + imgPrice;
    const chatId = ctx.chat?.id;
    if (!chatId) throw new Error("NO_CHAT_ID");
    state.telegramChatId = String(chatId);

    // Fetch featured package id from backend
    let featuredPackageId = null;
    if (state.selectedPlan === "featured") {
      try {
        const pkgRes = await axios.get(`${BACKEND_BASE_URL}/api/public/packages`, { timeout: 10000 });
        const featured = (pkgRes.data.packages || []).find(p => p.isFeatured);
        if (featured) featuredPackageId = featured.id;
      } catch (e) { console.error("FETCH PACKAGES ERROR:", e); }
    }

    const payload = {
      name: state.name,
      phone: state.phone,
      telegramChatId: String(chatId),
      contactMethod: state.contactMethod,
      category: state.categoryName || state.category,
      text: state.text,
      title: state.title,
      adPrice: state.adPrice,
      isNegotiable: state.isNegotiable,
      language: state.lang,
      price: total,
      images: state.images.map(img => img.fileId),
    };

    const res = await axios.post(`${BACKEND_BASE_URL}/api/telegram-ad`, payload, { timeout: 15000, headers: { "Content-Type": "application/json" } });
    const submissionId = res?.data?.id;
    if (!submissionId) throw new Error("NO_SUBMISSION_ID");
    state.submissionId = submissionId;

    // Apply featured package if selected
    if (featuredPackageId) {
      await axios.post(`${BACKEND_BASE_URL}/api/submissions/${submissionId}/package`, { packageId: featuredPackageId }, { timeout: 10000 });
    }

    const paymentRes = await axios.post(`${BACKEND_BASE_URL}/api/payments/create`, { submissionId }, { timeout: 15000 });
    
    if (paymentRes.data?.free) {
      state.step = "done";
      const adUrl = `${PUBLIC_URL}/ad/${paymentRes.data.adId}`;
      await ctx.reply(state.lang === "ar"
        ? `✅ تم نشر إعلانك مجاناً!\n\n🔗 ${adUrl}`
        : `✅ Your free ad is live!\n\n🔗 ${adUrl}`
      );

      // Publish to channel if configured
      if (TELEGRAM_CHANNEL_ID) {
        try {
          await ctx.telegram.sendMessage(TELEGRAM_CHANNEL_ID,
            `📢 ${state.title || state.text?.split(" ").slice(0,6).join(" ")}\n\n${state.categoryName || ""}\n\n🔗 ${adUrl}`
          );
        } catch(e) { console.error("CHANNEL PUBLISH ERROR:", e); }
      }
      return;
    }

    const checkoutUrl = paymentRes?.data?.checkoutUrl;
    if (!checkoutUrl) throw new Error("NO_CHECKOUT_URL");
    state.step = "done";

    await ctx.reply(state.lang === "ar"
      ? `💳 لإكمال النشر ادفع الآن:\n\n${checkoutUrl}\n\nبعد نجاح الدفع سنرسل لك رابط الإعلان مباشرة.`
      : `💳 Complete payment here:\n\n${checkoutUrl}\n\nAfter payment, we will send your live ad link here.`
    );
  } catch (err) {
    console.error("PAYMENT FLOW ERROR:", err?.response?.data || err?.message || err);
    await ctx.reply(state.lang === "ar" ? "❌ حدث خطأ أثناء إنشاء الدفع. حاول مرة أخرى." : "❌ Failed to create payment. Please try again.");
  }
});

// ── Text handler ──────────────────────────────────────────────────────────────
bot.on("text", async ctx => {
  const state = ensureSession(ctx);
  state.telegramChatId = String(ctx.chat?.id || "");
  const msg = (ctx.message.text || "").trim();
  if (msg.startsWith("/")) return;
  if (!state.step) return;

  if (["imageAsk","planSelect","summary","done"].includes(state.step)) {
    await ctx.reply(state.lang === "ar"
      ? "⚠️ هذه الخطوة تم تنفيذها. اضغط على الأزرار للمتابعة."
      : "⚠️ This step is done. Please use the buttons to continue.");
    return;
  }

  // Name
  if (state.step === "name") {
    if (state.lang === "ar" && (!hasArabic(msg) || hasEnglish(msg))) { await ctx.reply("الاسم يجب أن يكون بالعربية فقط"); return; }
    if (state.lang === "en" && (!hasEnglish(msg) || hasArabic(msg))) { await ctx.reply("Name must be English only"); return; }
    state.name = msg; state.step = "phone";
    await ctx.reply(state.lang === "ar"
      ? `تم حفظ الاسم: ${msg}\nادخل رقم الهاتف الإماراتي (مثال: 971501234567)`
      : `Name saved: ${msg}\nEnter UAE phone number (e.g. 971501234567)`);
    return;
  }

  // Phone
  if (state.step === "phone") {
    const phone = normalizePhone(msg);
    if (!phone.startsWith("971") || phone.length !== 12) {
      await ctx.reply(state.lang === "ar"
        ? "❌ رقم إماراتي غير صحيح. المطلوب: 971XXXXXXXXX (12 رقم)"
        : "❌ Invalid UAE number. Required format: 971XXXXXXXXX (12 digits)");
      return;
    }
    state.phone = phone; state.step = "contactMethod";
    await ctx.reply(state.lang === "ar"
      ? `تم حفظ الهاتف: ${phone}\nاختر طريقة تواصل المشتري`
      : `Phone saved: ${phone}\nChoose buyer contact method`,
      contactMethodKeyboard(state));
    return;
  }

  if (state.step === "contactMethod") {
    await ctx.reply(state.lang === "ar" ? "اختر من الأزرار أدناه" : "Please choose from the buttons below");
    return;
  }

  // Title
  if (state.step === "title") {
    if (msg.length < 3) { await ctx.reply(state.lang === "ar" ? "❌ العنوان قصير جداً (3 أحرف على الأقل)" : "❌ Title too short (min 3 characters)"); return; }
    if (msg.length > 100) { await ctx.reply(state.lang === "ar" ? "❌ العنوان طويل جداً (100 حرف كحد أقصى)" : "❌ Title too long (max 100 characters)"); return; }
    if (containsEmoji(msg)) { await ctx.reply(state.lang === "ar" ? "❌ لا يسمح باستخدام الإيموجي" : "❌ Emoji not allowed"); return; }
    state.title = msg; state.step = "text";
    await ctx.reply(state.lang === "ar"
      ? `العنوان: ${msg} ✓\n\naكتب وصف الإعلان\n\n💰 السعر: ${CHAR_PRICE} درهم لكل 100 حرف`
      : `Title: ${msg} ✓\n\nWrite the ad description\n\n💰 Price: ${CHAR_PRICE} AED per 100 characters`);
    return;
  }

  // Description/text
  if (state.step === "text") {
    if (containsEmoji(msg)) { await ctx.reply(state.lang === "ar" ? "❌ لا يسمح باستخدام الإيموجي" : "❌ Emoji not allowed"); return; }
    if (containsBanned(msg)) { await ctx.reply(state.lang === "ar" ? "❌ النص يحتوي كلمات محظورة" : "❌ Text contains banned words"); return; }
    if (msg.length < 10) { await ctx.reply(state.lang === "ar" ? "❌ الوصف قصير جداً (10 أحرف على الأقل)" : "❌ Description too short (min 10 characters)"); return; }
    if (msg.length > 2000) { await ctx.reply(state.lang === "ar" ? "❌ الوصف طويل جداً (2000 حرف كحد أقصى)" : "❌ Description too long (max 2000 characters)"); return; }
    state.text = msg;
    const cleaned = msg.replace(/[^A-Za-z0-9\u0600-\u06FF]/g, "");
    state.textPrice = Math.ceil(cleaned.length / 100) * CHAR_PRICE;
    await ctx.reply(state.lang === "ar"
      ? `الأحرف الفعلية: ${cleaned.length} → السعر: ${state.textPrice} درهم`
      : `Effective chars: ${cleaned.length} → Price: ${state.textPrice} AED`);
    state.step = "adPrice";
    await ctx.reply(state.lang === "ar"
      ? "أدخل سعر المنتج بالدرهم (أرقام فقط)\nمثال: 5000\n\nأو اضغط «قابل للتفاوض» إذا كان السعر تفاوضياً"
      : "Enter the product price in AED (numbers only)\nExample: 5000\n\nOr tap «Negotiable» if the price is negotiable",
      Markup.inlineKeyboard([[Markup.button.callback(state.lang === "ar" ? "قابل للتفاوض" : "Negotiable", "price_negotiable")]])
    );
    return;
  }

  // Ad price (numeric input)
  if (state.step === "adPrice") {
    const digits = normalizeDigits(msg).replace(/[^0-9]/g, "");
    const parsed = parseInt(digits, 10);
    if (isNaN(parsed) || parsed < 0) {
      await ctx.reply(state.lang === "ar"
        ? "❌ أدخل رقماً صحيحاً للسعر (مثال: 5000) أو اضغط «قابل للتفاوض»"
        : "❌ Enter a valid price number (e.g. 5000) or tap «Negotiable»");
      return;
    }
    state.adPrice = parsed;
    state.isNegotiable = false;
    state.step = "imageAsk";
    await ctx.reply(state.lang === "ar"
      ? `السعر: ${parsed} درهم ✓\n\nهل تريد إضافة صور؟ (5 درهم للصورة، حد أقصى 2)`
      : `Price: ${parsed} AED ✓\n\nAdd images? (5 AED each, max 2)`,
      Markup.inlineKeyboard([[
        Markup.button.callback(state.lang === "ar" ? "نعم" : "Yes", "img_yes"),
        Markup.button.callback(state.lang === "ar" ? "لا" : "No", "img_no"),
      ]])
    );
    return;
  }
});

// ── Photo handler ─────────────────────────────────────────────────────────────
bot.on("photo", async ctx => {
  const state = ensureSession(ctx);
  state.telegramChatId = String(ctx.chat?.id || "");
  if (!state.expectingImage) return;
  if (ctx.message.media_group_id) { await ctx.reply(state.lang === "ar" ? "❌ أرسل صورة واحدة فقط (لا ألبوم)" : "❌ Send ONE image at a time (no albums)"); return; }
  if (state.images.length >= 2) { await ctx.reply(state.lang === "ar" ? "❌ الحد الأقصى صورتين" : "❌ Maximum 2 images"); return; }

  const photos = ctx.message.photo || [];
  const fileId = photos[photos.length - 1]?.file_id;
  if (!fileId) { await ctx.reply(state.lang === "ar" ? "تعذر قراءة الصورة، أعد الإرسال." : "Could not read image, please resend."); return; }

  const waitMsg = await ctx.reply(state.lang === "ar" ? "⏳ يتم الآن رفع صورتك، يرجى الانتظار ولا تغلق المحادثة..." : "⏳ Your image is being uploaded, please wait and do not close the chat...");
  const dl = await downloadTelegramFile(ctx, fileId);
  try { await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id); } catch {}

  if (!dl.ok) { await ctx.reply(state.lang === "ar" ? "تم رفض الصورة أو فشل التحميل." : "Image rejected or download failed."); state.expectingImage = true; return; }

  if (ENABLE_CLAMAV) {
    const scan = scanWithClamAV(dl.localPath);
    if (!scan.ok) { try { fs.unlinkSync(dl.localPath); } catch {} await ctx.reply(state.lang === "ar" ? "تم رفض الصورة: ملف ضار." : "Image rejected: malware detected."); state.expectingImage = true; return; }
  }

  state.images.push({ fileId, localPath: dl.localPath, bytes: dl.bytes });
  state.expectingImage = false;

  if (state.images.length === 1) {
    await ctx.reply(state.lang === "ar" ? "تم استلام الصورة الأولى ✅\nهل تريد إضافة صورة ثانية؟" : "First image received ✅\nAdd second image?",
      Markup.inlineKeyboard([[Markup.button.callback(state.lang === "ar" ? "نعم" : "Yes", "img2_yes"), Markup.button.callback(state.lang === "ar" ? "لا" : "No", "img2_no")]])
    );
    return;
  }
  await askPlan(ctx);
});

// ── Ask plan ──────────────────────────────────────────────────────────────────
async function askPlan(ctx) {
  const state = ensureSession(ctx);
  state.step = "planSelect";
  const imgPrice = state.images.length * IMG_PRICE;
  const baseTotal = state.textPrice + imgPrice;

  await ctx.reply(state.lang === "ar"
    ? `اختر الباقة:\n\n🆓 مجاني — ${baseTotal} درهم\n• 7 أيام ظهور\n• ترتيب عادي\n\n⭐ مميز — ${baseTotal + 25} درهم\n• 7 أيام ظهور\n• 📌 مثبت في أعلى القائمة\n• شارة مميز`
    : `Choose your plan:\n\n🆓 Free — ${baseTotal} AED\n• 7 days visibility\n• Standard placement\n\n⭐ Featured — ${baseTotal + 25} AED\n• 7 days visibility\n• 📌 Pinned at top of listings\n• Featured badge`,
    Markup.inlineKeyboard([[
      Markup.button.callback(state.lang === "ar" ? "🆓 مجاني" : "🆓 Free", "plan_free"),
      Markup.button.callback(state.lang === "ar" ? "⭐ مميز" : "⭐ Featured", "plan_featured"),
    ]])
  );
}

// ── Summary ───────────────────────────────────────────────────────────────────
async function sendSummary(ctx) {
  const state = ensureSession(ctx);
  state.step = "summary";
  const imgPrice = state.images.length * IMG_PRICE;
  const pkgPrice = state.selectedPlan === "featured" ? 25 : 0;
  const total = state.textPrice + imgPrice + pkgPrice;
  const priceDisplay = state.isNegotiable
    ? (state.lang === "ar" ? "قابل للتفاوض" : "Negotiable")
    : (state.adPrice != null ? `${state.adPrice} AED` : (state.lang === "ar" ? "غير محدد" : "Not specified"));

  const summary = state.lang === "ar"
    ? `📋 ملخص الإعلان\n\nالاسم: ${state.name}\nالهاتف: ${state.phone}\nالتواصل: ${getContactMethodLabel(state)}\nالفئة: ${state.categoryName}\n\nالعنوان: ${state.title}\nالوصف:\n${state.text}\n\nسعر المنتج: ${priceDisplay}\n\nسعر النص: ${state.textPrice} درهم\nالصور (${state.images.length}): ${imgPrice} درهم\nالباقة: ${pkgPrice} درهم\nالإجمالي: ${total} درهم\n\nهل تريد نشر الإعلان؟`
    : `📋 Ad Summary\n\nName: ${state.name}\nPhone: ${state.phone}\nContact: ${getContactMethodLabel(state)}\nCategory: ${state.categoryName}\n\nTitle: ${state.title}\nDescription:\n${state.text}\n\nProduct price: ${priceDisplay}\n\nText cost: ${state.textPrice} AED\nImages (${state.images.length}): ${imgPrice} AED\nPlan: ${pkgPrice} AED\nTotal: ${total} AED\n\nPublish this ad?`;

  await ctx.reply(summary,
    Markup.inlineKeyboard([[
      Markup.button.callback(state.lang === "ar" ? "نشر الإعلان" : "Publish Ad", "publish_demo"),
      Markup.button.callback(state.lang === "ar" ? "إلغاء" : "Cancel", "cancel_demo"),
    ]])
  );
}

bot.launch();
console.log("Bot running");
