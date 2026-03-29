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

const BACKEND_API =
  process.env.BACKEND_API || "http://localhost:3000/api/telegram-ad";

const BACKEND_BASE_URL = BACKEND_API.replace(/\/api\/telegram-ad\/?$/, "");

/* ---------- State ---------- */

function initState() {
  return {
    consent: false,
    lang: null,
    step: "consent",
    name: null,
    phone: null,
    telegramChatId: null,
    contactMethod: null, // "call" | "telegram" | "both"
    category: null,
    text: null,
    textPrice: 0,
    images: [],
    expectingImage: false,
    submissionId: null,
  };
}

/* IMPORTANT: ensure ctx.session ALWAYS exists */
bot.use(
  session({
    defaultSession: () => ({}),
  })
);

function ensureSession(ctx) {
  if (!ctx.session) ctx.session = {};
  if (!ctx.session.state) ctx.session.state = initState();
  return ctx.session.state;
}

/* Catch all errors so bot doesn't die */
bot.catch((err) => {
  console.error("BOT ERROR:", err);
});

/* ---------- Step Guard ---------- */
// Returns true if step matches, false + sends message if not
function guardStep(ctx, expectedStep) {
  const state = ensureSession(ctx);
  if (state.step !== expectedStep) {
    ctx
      .reply(
        state.lang === "ar"
          ? "⚠️ هذه الخطوة تم تنفيذها بالفعل أو غير متاحة الآن."
          : "⚠️ This step is already completed or not available now."
      )
      .catch(() => {});
    return false;
  }
  return true;
}

/* ---------- /help ---------- */

bot.command("help", async (ctx) => {
  await ctx.reply(
    `📘 Classifieds UAE — User Guide

How to post your ad:

1️⃣ Start the bot
Press /start to begin the process.

2️⃣ Choose your language
Arabic or English.

3️⃣ Enter your name
First name + last name.

4️⃣ Enter UAE phone number
Example: 971501234567

5️⃣ Choose buyer contact method
• Phone call
• Telegram
• Both

6️⃣ Choose category
• Vehicles
• Real Estate
• Electronics

7️⃣ Write your ad text
Price calculation:
• English → 10 AED per 100 characters
• Arabic → 10 AED per 100 characters

8️⃣ Add images (optional)
• Max: 2 images
• Price: 5 AED per image

9️⃣ Review the summary
Check the total price before publishing.

🔟 Complete payment
After successful payment, your ad goes live and the ad link is sent here.

━━━━━━━━━━━━━━

📘 دليل استخدام البوت

طريقة نشر الإعلان:

1️⃣ ابدأ البوت
اضغط /start لبدء العملية.

2️⃣ اختر اللغة
العربية أو الإنجليزية.

3️⃣ أدخل اسمك
الاسم الأول + اسم العائلة.

4️⃣ أدخل رقم الهاتف الإماراتي
مثال: 971501234567

5️⃣ اختر طريقة تواصل المشتري
• اتصال
• تيليجرام
• كلاهما

6️⃣ اختر الفئة
• سيارات
• عقارات
• إلكترونيات

7️⃣ اكتب نص الإعلان
حساب السعر:
• الإنجليزية → 10 درهم لكل 100 حرف
• العربية → 10 درهم لكل 100 حرف

8️⃣ إضافة الصور (اختياري)
• الحد الأقصى: صورتين
• السعر: 5 درهم لكل صورة

9️⃣ راجع الملخص
تأكد من السعر الإجمالي قبل النشر.

🔟 إتمام الدفع
بعد نجاح الدفع يتم نشر الإعلان وإرسال رابط الإعلان هنا مباشرة.`
  );
});

/* ---------- /cancel ---------- */

bot.command("cancel", async (ctx) => {
  const state = ensureSession(ctx);

  if (!state || state.step === "consent") {
    await ctx.reply(
      `⚠️ No active ad submission.

Use /start to begin posting your ad.

⚠️ لا يوجد إعلان قيد الإنشاء.

استخدم /start لبدء نشر إعلانك.`
    );
    return;
  }

  cleanupTempImages(state.images);
  ctx.session.state = initState();

  await ctx.reply(
    `❌ Ad submission cancelled.

You can start again anytime using /start.

❌ تم إلغاء عملية نشر الإعلان.

يمكنك البدء من جديد باستخدام /start.`
  );
});

/* ---------- Payment / publish handlers ---------- */

bot.action("cancel_demo", async (ctx) => {
  const state = ensureSession(ctx);
  cleanupTempImages(state.images);

  await ctx.reply(
    state.lang === "ar" ? "تم إلغاء العملية." : "Operation cancelled."
  );

  ctx.session.state = initState();
});

bot.action("publish_demo", async (ctx) => {
  const state = ensureSession(ctx);

  // Guard: only allow from summary step
  if (state.step !== "summary") {
    await ctx
      .reply(
        state.lang === "ar"
          ? "⚠️ هذه الخطوة غير متاحة الآن."
          : "⚠️ This action is not available now."
      )
      .catch(() => {});
    return;
  }

  try {
    const imgPrice = state.images.length * 5;
    const total = state.textPrice + imgPrice;

    const chatId = ctx.chat?.id;

    if (!chatId) {
      throw new Error("NO_CHAT_ID_FROM_TELEGRAM");
    }

    state.telegramChatId = String(chatId);

    const submissionPayload = {
      name: state.name,
      phone: state.phone,
      telegramChatId: String(chatId),
      contactMethod: state.contactMethod,
      category: state.category,
      text: state.text,
      language: state.lang,
      price: total,
      images: state.images.map((img) => img.fileId),
    };

    console.log("SENDING TO BACKEND:", submissionPayload);
    console.log("IMAGES SENT:", submissionPayload.images);

    /* 1. create submission (backend also handles image fileIds) */
    const res = await axios.post(BACKEND_API, submissionPayload, {
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const submissionId = res?.data?.id;

    if (!submissionId) {
      throw new Error("NO_SUBMISSION_ID");
    }

    state.submissionId = submissionId;
    // Mark flow as done so user cannot re-submit
    state.step = "done";

    /* 2. create Ziina payment */
    const paymentRes = await axios.post(
      `${BACKEND_BASE_URL}/api/payments/create`,
      { submissionId },
      {
        timeout: 15000,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const checkoutUrl = paymentRes?.data?.checkoutUrl;

    if (!checkoutUrl) {
      throw new Error("NO_CHECKOUT_URL");
    }

    /* 3. send payment link */
    await ctx.reply(
      state.lang === "ar"
        ? `💳 لإكمال النشر ادفع الآن:

${checkoutUrl}

بعد نجاح الدفع سنرسل لك رابط الإعلان هنا مباشرة.`
        : `💳 Complete payment here:

${checkoutUrl}

After successful payment, we will send your live ad link here directly.`
    );
  } catch (err) {
    console.error(
      "PAYMENT FLOW ERROR:",
      err?.response?.data || err?.message || err
    );

    await ctx.reply(
      state.lang === "ar"
        ? "❌ حدث خطأ أثناء إنشاء الدفع"
        : "❌ Failed to create payment"
    );
  }
});

/* ---------- Security controls ---------- */

const MAX_IMAGE_BYTES =
  parseInt(process.env.TELEGRAM_MAX_IMAGE_BYTES || "", 10) || 5 * 1024 * 1024;

const ENABLE_CLAMAV =
  (process.env.ENABLE_CLAMAV || "true").toLowerCase() === "true";

function tempFilePath(ext = ".jpg") {
  const name = crypto.randomBytes(16).toString("hex") + ext;
  return path.join(os.tmpdir(), "tg_" + name);
}

async function downloadTelegramFile(ctx, fileId) {
  const file = await ctx.telegram.getFile(fileId);

  if (file.file_size && file.file_size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: "too_big", bytes: file.file_size };
  }

  const filePath = file.file_path;
  if (!filePath) return { ok: false, reason: "no_file_path" };

  const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;

  const ext = path.extname(filePath) || ".jpg";
  const outPath = tempFilePath(ext);

  const resp = await axios.get(url, { responseType: "stream" });

  let bytes = 0;
  const writer = fs.createWriteStream(outPath);

  const done = new Promise((resolve, reject) => {
    resp.data.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_IMAGE_BYTES) {
        resp.data.destroy(new Error("FILE_TOO_BIG"));
      }
    });

    resp.data.on("error", reject);
    writer.on("error", reject);
    writer.on("finish", resolve);
  });

  resp.data.pipe(writer);

  try {
    await done;
  } catch (e) {
    try {
      fs.unlinkSync(outPath);
    } catch {}
    return { ok: false, reason: String(e.message || "download_failed") };
  }

  return { ok: true, localPath: outPath, bytes };
}

function scanWithClamAV(filePath) {
  const res = spawnSync("clamscan", ["--no-summary", filePath], {
    encoding: "utf8",
  });

  if (res.error) return { ok: false, reason: "clamav_missing" };
  if (res.status === 0) return { ok: true };
  if (res.status === 1) return { ok: false, reason: "infected" };
  return { ok: false, reason: "scan_error" };
}

/* ---------- Helpers ---------- */

function normalizeDigits(input) {
  const map = {
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
  };
  return input.replace(/[٠-٩]/g, (d) => map[d]);
}

function normalizePhone(raw) {
  let phone = normalizeDigits(raw);
  phone = phone.replace(/[^0-9]/g, "");
  if (phone.startsWith("00971")) phone = phone.substring(2);
  if (phone.startsWith("971")) return phone;
  if (phone.startsWith("05") && phone.length === 10) {
    return "971" + phone.substring(1);
  }
  return phone;
}

function hasArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

function hasEnglish(text) {
  return /[A-Za-z]/.test(text);
}

function containsEmoji(text) {
  return /[\u{1F300}-\u{1FAFF}]/u.test(text);
}

const bannedWords = [
  "sex",
  "porn",
  "escort",
  "drugs",
  "cocaine",
  "casino",
  "gambling",
  "politics",
  "weapon",
  "قمار",
  "جنس",
  "مخدرات",
  "سياسة",
  "سلاح",
];

function containsBanned(text) {
  const lower = text.toLowerCase();
  return bannedWords.some((w) => lower.includes(w));
}

function cleanupTempImages(images) {
  for (const img of images || []) {
    if (!img?.localPath) continue;
    try {
      fs.unlinkSync(img.localPath);
    } catch {}
  }
}

const contactMethods = [
  { id: "call", ar: "اتصال", en: "Phone Call" },
  { id: "telegram", ar: "تيليجرام", en: "Telegram" },
  { id: "both", ar: "كلاهما", en: "Both" },
];

function contactMethodKeyboard(state) {
  return Markup.inlineKeyboard(
    contactMethods.map((m) => [
      Markup.button.callback(
        state.lang === "ar" ? m.ar : m.en,
        "contact_" + m.id
      ),
    ])
  );
}

function getContactMethodLabel(state) {
  if (state.contactMethod === "call") {
    return state.lang === "ar" ? "اتصال" : "Phone Call";
  }
  if (state.contactMethod === "telegram") {
    return state.lang === "ar" ? "تيليجرام" : "Telegram";
  }
  if (state.contactMethod === "both") {
    return state.lang === "ar" ? "كلاهما" : "Both";
  }
  return state.lang === "ar" ? "غير محدد" : "Not set";
}

/* ---------- Categories ---------- */

const categories = [
  { id: "vehicles", ar: "سيارات", en: "Vehicles" },
  { id: "realestate", ar: "عقارات", en: "Real Estate" },
  { id: "electronics", ar: "إلكترونيات", en: "Electronics" },
];

function categoryKeyboard(state) {
  return Markup.inlineKeyboard(
    categories.map((c) => [
      Markup.button.callback(
        state.lang === "ar" ? c.ar : c.en,
        "cat_" + c.id
      ),
    ])
  );
}

/* ---------- Start ---------- */

bot.start(async (ctx) => {
  const state = ensureSession(ctx);

  // DB-aware check: only block if the LATEST submission for this phone is still active
  if (state.phone) {
    try {
      const lastSubmission = await prisma.adSubmission.findFirst({
        where: { phone: state.phone },
        orderBy: { createdAt: "desc" },
      });

      if (
        lastSubmission &&
        ["DRAFT", "WAITING_PAYMENT"].includes(lastSubmission.status)
      ) {
        await ctx.reply(
          state.lang === "ar"
            ? `⚠️ لديك عملية إنشاء إعلان قيد التنفيذ.

يمكنك إكمالها أو إلغاؤها أولاً باستخدام /cancel.`
            : `⚠️ You already have an ad submission in progress.

Please finish it or cancel it first using /cancel.`
        );
        return;
      }
    } catch (err) {
      console.error("DB CHECK ERROR in /start:", err);
      // If DB check fails, proceed anyway to not block the user
    }
  }

  // Also check in-session step (non-DB flow guard)
  if (state.step && state.step !== "consent") {
    await ctx.reply(
      state.lang === "ar"
        ? `⚠️ لديك عملية إنشاء إعلان قيد التنفيذ.

يمكنك إكمالها أو إلغاؤها أولاً باستخدام /cancel.`
        : `⚠️ You already have an ad submission in progress.

Please finish it or cancel it first using /cancel.`
    );
    return;
  }

  // Reset and start fresh
  ctx.session.state = initState();
  ensureSession(ctx).telegramChatId = String(ctx.chat?.id || "");

  await ctx.reply(
    `🚀 مرحباً بك في Classifieds UAE
🚀 Welcome to Classifieds UAE

ابدأ الآن وانشر إعلانك خلال أقل من دقيقة.
Start now and post your ad in under 1 minute.

🚗 سيارات
🚗 Vehicles

🏠 عقارات
🏠 Real Estate

💻 إلكترونيات
💻 Electronics

━━━━━━━━━━━━━━

🔥 إعلانك سيُنشر فوراً بعد الدفع
🔥 Your ad will be published instantly after payment

📲 جهّز نص الإعلان + رقم التواصل
📲 Prepare your ad text + contact number

━━━━━━━━━━━━━━

👉 اضغط "موافق" وابدأ الآن
👉 Press "Agree" and start now

━━━━━━━━━━━━━━

⚠️ تنبيه
⚠️ Notice

ممنوع نشر:
Not allowed:
• ألفاظ نابية
• Profanity
• سياسة
• Politics
• محتوى جنسي
• Sexual content
• قمار
• Gambling
• محتوى غير قانوني

📌 يتحمل الناشر كامل المسؤولية القانونية عن محتوى الإعلان، وتخلي المنصة أي مسؤولية أو تبعات قانونية.
📌 The advertiser assumes full legal responsibility for the ad content, and the platform disclaims any liability or legal consequences.`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("أوافق", "agree"),
        Markup.button.callback("I Agree", "agree"),
      ],
    ])
  );
});

/* ---------- Agree ---------- */

bot.action("agree", async (ctx) => {
  if (!guardStep(ctx, "consent")) return;

  const state = ensureSession(ctx);
  state.step = "language";

  await ctx.editMessageReplyMarkup().catch(() => {});

  await ctx.reply(
    "Choose language / اختر اللغة",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("العربية", "lang_ar"),
        Markup.button.callback("English", "lang_en"),
      ],
    ])
  );
});

/* ---------- Language ---------- */

bot.action("lang_ar", async (ctx) => {
  if (!guardStep(ctx, "language")) return;

  const state = ensureSession(ctx);
  state.lang = "ar";
  state.step = "name";
  state.telegramChatId = String(ctx.chat?.id || "");

  await ctx.editMessageReplyMarkup().catch(() => {});
  await ctx.reply("تم اختيار العربية\nاكتب اسمك الثنائي");
});

bot.action("lang_en", async (ctx) => {
  if (!guardStep(ctx, "language")) return;

  const state = ensureSession(ctx);
  state.lang = "en";
  state.step = "name";
  state.telegramChatId = String(ctx.chat?.id || "");

  await ctx.editMessageReplyMarkup().catch(() => {});
  await ctx.reply("English selected\nEnter your full name");
});

/* ---------- Contact method ---------- */

contactMethods.forEach((method) => {
  bot.action("contact_" + method.id, async (ctx) => {
    if (!guardStep(ctx, "contactMethod")) return;

    const state = ensureSession(ctx);
    state.contactMethod = method.id;
    state.step = "category";

    await ctx.editMessageReplyMarkup().catch(() => {});

    await ctx.reply(
      state.lang === "ar"
        ? `تم حفظ طريقة التواصل: ${method.ar}\nاختر الفئة`
        : `Contact method saved: ${method.en}\nChoose category`,
      categoryKeyboard(state)
    );
  });
});

/* ---------- Category ---------- */

categories.forEach((cat) => {
  bot.action("cat_" + cat.id, async (ctx) => {
    if (!guardStep(ctx, "category")) return;

    const state = ensureSession(ctx);
    state.category = cat.id;
    state.step = "text";

    await ctx.editMessageReplyMarkup().catch(() => {});

    await ctx.reply(
      state.lang === "ar"
        ? `اخترت الفئة: ${cat.ar}`
        : `You chose: ${cat.en}`
    );

    await ctx.reply(
      state.lang === "ar"
        ? `اكتب نص الإعلان

السعر:
10 درهم لكل 100 حرف`
        : `Write ad text

Price:
10 AED per 100 characters`
    );
  });
});

/* ---------- Text handler ---------- */

bot.on("text", async (ctx) => {
  const state = ensureSession(ctx);
  state.telegramChatId = String(ctx.chat?.id || "");

  const msg = (ctx.message.text || "").trim();

  // Block commands from being processed as text
  if (msg.startsWith("/")) return;

  if (!state.step) return;

  // Block text input on completed/inappropriate steps
  if (["imageAsk", "summary", "done"].includes(state.step)) {
    await ctx.reply(
      state.lang === "ar"
        ? "⚠️ هذه الخطوة تم تنفيذها بالفعل. اضغط على الأزرار للمتابعة."
        : "⚠️ This step is already completed. Please use the buttons to continue."
    );
    return;
  }

  if (state.step === "name") {
    if (state.lang === "ar" && (!hasArabic(msg) || hasEnglish(msg))) {
      await ctx.reply("الاسم يجب أن يكون بالعربية فقط");
      return;
    }

    if (state.lang === "en" && (!hasEnglish(msg) || hasArabic(msg))) {
      await ctx.reply("Name must be English only");
      return;
    }

    state.name = msg;
    state.step = "phone";

    await ctx.reply(
      state.lang === "ar"
        ? `تم حفظ الاسم: ${msg}
ادخل رقم الهاتف (مثال: 971501234567)`
        : `Name saved: ${msg}
Enter phone number (example: 971501234567)`
    );
    return;
  }

  if (state.step === "phone") {
    const phone = normalizePhone(msg);

    if (!phone.startsWith("971") || phone.length !== 12) {
      await ctx.reply(
        state.lang === "ar" ? "رقم إماراتي غير صحيح" : "Invalid UAE number"
      );
      return;
    }

    state.phone = phone;
    state.step = "contactMethod";

    await ctx.reply(
      state.lang === "ar"
        ? `تم حفظ الهاتف: ${phone}
اختر طريقة تواصل المشتري`
        : `Phone saved: ${phone}
Choose buyer contact method`,
      contactMethodKeyboard(state)
    );
    return;
  }

  if (state.step === "contactMethod") {
    await ctx.reply(
      state.lang === "ar"
        ? "اختر طريقة التواصل من الأزرار بالأسفل"
        : "Choose contact method from the buttons below"
    );
    return;
  }

  if (state.step === "text") {
    if (containsEmoji(msg)) {
      await ctx.reply(
        state.lang === "ar"
          ? "❌ لا يسمح باستخدام الإيموجي"
          : "❌ Emoji not allowed"
      );
      return;
    }

    if (state.lang === "en" && hasArabic(msg)) {
      await ctx.reply("Text must be English only (no Arabic allowed)");
      return;
    }

    if (containsBanned(msg)) {
      await ctx.reply(
        state.lang === "ar"
          ? "النص يحتوي كلمات محظورة"
          : "Text contains banned words"
      );
      return;
    }

    state.text = msg;

    const cleaned = msg.replace(/[^A-Za-z0-9\u0600-\u06FF]/g, "");
    const length = cleaned.length;

    const price = Math.ceil(length / 100) * 10;
    state.textPrice = price;

    await ctx.reply(
      state.lang === "ar"
        ? `عدد الأحرف الفعلية: ${length}
السعر: ${price} درهم`
        : `Effective characters: ${length}
Price: ${price} AED`
    );

    state.step = "imageAsk";

    await ctx.reply(
      state.lang === "ar"
        ? "هل تريد إضافة صور؟ سعر الصورة 5 درهم (حد أقصى صورتين)"
        : "Do you want to add images? Image price is 5 AED (max 2)",
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            state.lang === "ar" ? "نعم" : "Yes",
            "img_yes"
          ),
          Markup.button.callback(
            state.lang === "ar" ? "لا" : "No",
            "img_no"
          ),
        ],
      ])
    );

    return;
  }
});

/* ---------- Image choice ---------- */

bot.action("img_yes", async (ctx) => {
  if (!guardStep(ctx, "imageAsk")) return;

  const state = ensureSession(ctx);
  state.expectingImage = true;

  await ctx.reply(
    state.lang === "ar"
      ? `أرسل الصورة الأولى (صورة واحدة فقط)
(حد أقصى: صورتين - 5 درهم لكل صورة)`
      : `Send the first image (one image only)
(Max 2 images - 5 AED per image)`
  );
});

bot.action("img_no", async (ctx) => {
  if (!guardStep(ctx, "imageAsk")) return;

  await sendSummary(ctx);
});

bot.action("img2_yes", async (ctx) => {
  const state = ensureSession(ctx);

  // img2_yes is valid only when we've received 1 image and are waiting for the second
  if (state.images.length !== 1) {
    await ctx
      .reply(
        state.lang === "ar"
          ? "⚠️ هذا الخيار غير متاح الآن."
          : "⚠️ This option is not available now."
      )
      .catch(() => {});
    return;
  }

  state.expectingImage = true;

  await ctx.reply(
    state.lang === "ar"
      ? "أرسل الصورة الثانية (صورة واحدة فقط)"
      : "Send the second image (one image only)"
  );
});

bot.action("img2_no", async (ctx) => {
  const state = ensureSession(ctx);

  // img2_no is valid only when we've received 1 image
  if (state.images.length !== 1) {
    await ctx
      .reply(
        state.lang === "ar"
          ? "⚠️ هذا الخيار غير متاح الآن."
          : "⚠️ This option is not available now."
      )
      .catch(() => {});
    return;
  }

  await sendSummary(ctx);
});

/* ---------- Photo ---------- */

bot.on("photo", async (ctx) => {
  const state = ensureSession(ctx);
  state.telegramChatId = String(ctx.chat?.id || "");

  if (!state.expectingImage) return;

  if (ctx.message.media_group_id) {
    await ctx.reply(
      state.lang === "ar"
        ? "❌ أرسل صورة واحدة فقط في كل مرة (لا ترسل ألبوم)."
        : "❌ Send only ONE image at a time (no albums)."
    );
    return;
  }

  if (state.images.length >= 2) {
    await ctx.reply(
      state.lang === "ar"
        ? "❌ الحد الأقصى صورتين فقط"
        : "❌ Maximum 2 images allowed"
    );
    return;
  }

  const photos = ctx.message.photo || [];
  const fileId = photos[photos.length - 1]?.file_id;

  if (!fileId) {
    await ctx.reply(
      state.lang === "ar"
        ? "تعذر قراءة الصورة، أعد الإرسال."
        : "Could not read image, please resend."
    );
    return;
  }

  const waitMsg = await ctx.reply(
    state.lang === "ar"
      ? "⏳ جاري رفع الصورة... انتظر قليلاً"
      : "⏳ Uploading image... please wait"
  );

  const dl = await downloadTelegramFile(ctx, fileId);

  if (!dl.ok) {
    try {
      await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id);
    } catch {}

    await ctx.reply(
      state.lang === "ar"
        ? "تم رفض الصورة أو فشل تحميلها."
        : "Image rejected or download failed."
    );
    state.expectingImage = true;
    return;
  }

  if (ENABLE_CLAMAV) {
    const scan = scanWithClamAV(dl.localPath);
    if (!scan.ok) {
      try {
        fs.unlinkSync(dl.localPath);
      } catch {}

      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id);
      } catch {}

      await ctx.reply(
        state.lang === "ar"
          ? "تم رفض الصورة: ملف ضار."
          : "Image rejected: malware detected."
      );
      state.expectingImage = true;
      return;
    }
  }

  try {
    await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id);
  } catch {}

  state.images.push({ fileId, localPath: dl.localPath, bytes: dl.bytes });
  state.expectingImage = false;

  if (state.images.length === 1) {
    await ctx.reply(
      state.lang === "ar"
        ? "تم استلام الصورة الأولى ✅\nهل تريد إضافة صورة ثانية؟"
        : "First image received ✅\nAdd second image?",
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            state.lang === "ar" ? "نعم" : "Yes",
            "img2_yes"
          ),
          Markup.button.callback(
            state.lang === "ar" ? "لا" : "No",
            "img2_no"
          ),
        ],
      ])
    );
    return;
  }

  await sendSummary(ctx);
});

/* ---------- Summary ---------- */

async function sendSummary(ctx) {
  const s = ensureSession(ctx);

  const cat = categories.find((c) => c.id === s.category);
  const imgPrice = s.images.length * 5;
  const total = s.textPrice + imgPrice;
  const contactMethod = getContactMethodLabel(s);

  // Mark step as summary so text input is blocked
  s.step = "summary";

  const summaryText =
    s.lang === "ar"
      ? `ملخص الإعلان

الاسم: ${s.name}
الهاتف: ${s.phone}
طريقة التواصل: ${contactMethod}
الفئة: ${cat?.ar || s.category}

النص:
${s.text}

سعر النص: ${s.textPrice}

عدد الصور: ${s.images.length}
سعر الصور: ${imgPrice}

الإجمالي: ${total} درهم

هل تريد نشر الإعلان؟`
      : `Ad Summary

Name: ${s.name}
Phone: ${s.phone}
Contact method: ${contactMethod}
Category: ${cat?.en || s.category}

Text:
${s.text}

Text price: ${s.textPrice}

Images: ${s.images.length}
Images price: ${imgPrice}

Total: ${total} AED

Do you want to publish the ad?`;

  await ctx.reply(
    summaryText,
    Markup.inlineKeyboard([
      [
        Markup.button.callback(
          s.lang === "ar" ? "نشر الإعلان" : "Publish Ad",
          "publish_demo"
        ),
        Markup.button.callback(
          s.lang === "ar" ? "إلغاء" : "Cancel",
          "cancel_demo"
        ),
      ],
    ])
  );
}

bot.launch();

console.log("Bot running");