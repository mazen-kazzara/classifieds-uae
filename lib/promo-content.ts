/**
 * Promotional content pool for daily company ads on social media.
 * Bilingual: Arabic first, then English — to prioritize the local UAE audience.
 *
 * Rotates by (day-of-year × 7 + platformOffset) so each platform sees a different
 * message on the same day, and the same platform cycles through all messages.
 */

export interface PromoContent {
  title: string;           // Arabic headline (primary)
  titleEn: string;         // English subtitle
  descriptionAr: string;   // Arabic body
  descriptionEn: string;   // English body
  ctaAr: string;           // Arabic CTA line
  ctaEn: string;           // English CTA line
}

const APP_URL = process.env.APP_URL || "https://classifiedsuae.ae";

export const PROMO_POOL: PromoContent[] = [
  {
    title: "🚀 انشر إعلانك في 30 ثانية — وصول لآلاف المتابعين في الإمارات",
    titleEn: "🚀 Post your ad in 30 seconds — reach thousands across the UAE",
    descriptionAr: "Classifieds UAE هي أسرع طريقة للبيع، التأجير، أو الإعلان في الإمارات. انشر سيارتك، عقارك، وظائفك، خدماتك والمزيد — واحصل على ظهور على موقعنا، فيسبوك، انستقرام، قناة تيليغرام، وX بنقرة واحدة.",
    descriptionEn: "Classifieds UAE is the fastest way to sell, rent, or advertise in the Emirates. Post cars, real estate, jobs, services, and more — get seen on our website, Facebook, Instagram, Telegram channel, and X with a single click.",
    ctaAr: "✨ انشر إعلانك الآن: " + APP_URL,
    ctaEn: "✨ Post your ad now: " + APP_URL,
  },
  {
    title: "🆓 إعلانات مجانية. وصول حقيقي. مشترون حقيقيون.",
    titleEn: "🆓 Free ads. Real reach. Real buyers.",
    descriptionAr: "لماذا تدفع للنشر؟ ابدأ بخطتنا المجانية — 150 حرف، صورة واحدة، ظهور لمدة 3 أيام. يمكنك الترقية في أي وقت لوصول أكبر. بدون رسوم خفية، بدون سبام، فقط نتائج.",
    descriptionEn: "Why pay to post? Start with our FREE plan — 150 characters, 1 image, 3 days of visibility. Upgrade anytime for more reach. No hidden fees, no spam, just results.",
    ctaAr: "👉 ابدأ الآن: " + APP_URL,
    ctaEn: "👉 Start now: " + APP_URL,
  },
  {
    title: "📱 إعلان واحد. خمس منصات. بدون أي تعقيد.",
    titleEn: "📱 One ad. Five platforms. Zero hassle.",
    descriptionAr: "Classifieds UAE ينشر إعلانك على موقعنا، صفحة فيسبوك، انستقرام، قناة تيليغرام، وX — كلها في نفس الوقت. اختر الكل أو اختر ما يناسبك. أنت تتحكم بكل شيء.",
    descriptionEn: "Classifieds UAE publishes your ad to our website, Facebook Page, Instagram, Telegram channel, and X — all at the same time. Choose all or pick your favorites. You stay in control.",
    ctaAr: "جرّبها اليوم: " + APP_URL,
    ctaEn: "Try it today: " + APP_URL,
  },
  {
    title: "🇦🇪 عرض الإطلاق: خطة علم الإمارات — مجانية حتى 1 مايو",
    titleEn: "🇦🇪 Launch Offer: UAE Flag plan — FREE until May 1st",
    descriptionAr: "احتفل معنا! احصل على وصول بمستوى الخطط المميزة مجاناً حتى 1 مايو مع خطة علم الإمارات: 800 حرف، 4 صور، 14 يوماً من الظهور. عرض إطلاق لفترة محدودة.",
    descriptionEn: "Celebrate with us! Get premium-level reach for FREE until May 1st with the UAE Flag plan: 800 characters, 4 images, 14 days of visibility. Limited-time launch offer.",
    ctaAr: "🇦🇪 احصل عليها: " + APP_URL + "/pricing",
    ctaEn: "🇦🇪 Claim yours: " + APP_URL + "/pricing",
  },
  {
    title: "⭐ الخطة القياسية — الأفضل قيمة في Classifieds UAE",
    titleEn: "⭐ Standard plan — Best Value on Classifieds UAE",
    descriptionAr: "بـ 9 درهم فقط، احصل على 800 حرف، 4 صور، 14 يوم ظهور، وتثبيت في أعلى نتائج البحث. لهذا السبب الخطة القياسية هي الأكثر شعبية بيننا.",
    descriptionEn: "9 AED gets you 800 characters, 4 images, 14 days of visibility, and featured placement at the top of search results. It's why Standard is our most popular plan.",
    ctaAr: "🚀 تعرف أكثر: " + APP_URL + "/pricing",
    ctaEn: "🚀 Learn more: " + APP_URL + "/pricing",
  },
  {
    title: "🏠 تبيع شقتك؟ انشر إعلانك في دقائق.",
    titleEn: "🏠 Selling your apartment? List it in minutes.",
    descriptionAr: "إعلانات العقارات على Classifieds UAE تصل إلى مشترين جادين في دبي، أبوظبي، الشارقة، وجميع الإمارات. ارفع الصور، حدد السعر، واترك المشترين يتواصلون معك مباشرة عبر واتساب، اتصال، أو تيليغرام.",
    descriptionEn: "Real Estate ads on Classifieds UAE reach serious buyers across Dubai, Abu Dhabi, Sharjah, and all the Emirates. Upload photos, set your price, and let buyers contact you directly via WhatsApp, call, or Telegram.",
    ctaAr: "📍 تصفح العقارات: " + APP_URL + "/category/real-estate",
    ctaEn: "📍 Browse real estate: " + APP_URL + "/category/real-estate",
  },
  {
    title: "🚗 بيع سيارتك بسرعة. آلاف الزوار يومياً.",
    titleEn: "🚗 Sell your car fast. Thousands of daily visitors.",
    descriptionAr: "من السيارات العائلية إلى السيارات الرياضية الفاخرة — Classifieds UAE يربط البائعين بمشترين نشطين كل يوم. انشر سيارتك مع الصور، الممشى، والسعر في أقل من 60 ثانية.",
    descriptionEn: "From family SUVs to luxury sports cars — Classifieds UAE connects sellers with active buyers every day. List your car with photos, mileage, and price in under 60 seconds.",
    ctaAr: "🚗 انشر سيارتك: " + APP_URL + "/category/cars",
    ctaEn: "🚗 List your car: " + APP_URL + "/category/cars",
  },
  {
    title: "💼 تبحث عن وظيفة في الإمارات؟ تصفح مئات الفرص.",
    titleEn: "💼 Looking for a job in the UAE? Browse 100s of listings.",
    descriptionAr: "ابحث عن فرصتك القادمة على Classifieds UAE. وظائف جديدة تُنشر يومياً — من البيع بالتجزئة والخدمات إلى التقنية والضيافة. تواصل مع أصحاب العمل مباشرة. بدون وسطاء.",
    descriptionEn: "Find your next opportunity on Classifieds UAE. Fresh jobs posted daily — from retail and services to tech and hospitality. Contact employers directly. No middlemen.",
    ctaAr: "💼 تصفح الوظائف: " + APP_URL + "/category/jobs",
    ctaEn: "💼 Browse jobs: " + APP_URL + "/category/jobs",
  },
  {
    title: "💇 صالون تجميل؟ عيادة؟ استوديو لياقة؟",
    titleEn: "💇 Beauty salon? Clinic? Fitness studio?",
    descriptionAr: "طوّر عملك مع إعلانات محلية مستهدفة على Classifieds UAE. نربط مقدمي الخدمات بالعملاء الذين يبحثون عنهم بنشاط — في جميع أنحاء الإمارات.",
    descriptionEn: "Grow your business with targeted local ads on Classifieds UAE. We connect service providers with customers actively looking for them — across the UAE.",
    ctaAr: "🌟 أدرج عملك: " + APP_URL + "/new",
    ctaEn: "🌟 List your business: " + APP_URL + "/new",
  },
  {
    title: "📸 انشر بالصور. بِع أسرع بـ 10 أضعاف.",
    titleEn: "📸 Post with photos. Sell 10× faster.",
    descriptionAr: "الإعلانات المصحوبة بصور تحصل على 10 أضعاف المشاهدات. خططنا المدفوعة تبدأ من 5 درهم فقط وتشمل حتى 6 صور عالية الجودة. اعرض ما تبيعه — دع الصور تتحدث.",
    descriptionEn: "Ads with photos get 10× more views. Our paid plans start from just 5 AED and include up to 6 high-quality images. Show off what you're selling — let the pictures do the talking.",
    ctaAr: "📸 شاهد الخطط: " + APP_URL + "/pricing",
    ctaEn: "📸 See the plans: " + APP_URL + "/pricing",
  },
  {
    title: "🔒 آمن. بسيط. بدون احتيال.",
    titleEn: "🔒 Safe. Simple. No scams.",
    descriptionAr: "كل إعلان على Classifieds UAE يُراجع. نفلتر السبام، المحتوى المحظور، والسلوك المشبوه — لكي تتعامل مع أشخاص حقيقيين فقط. سلامتك وخصوصيتك أولويتنا.",
    descriptionEn: "Every ad on Classifieds UAE is reviewed. We filter spam, prohibited content, and suspicious behavior — so you deal with real people only. Your safety and privacy come first.",
    ctaAr: "✅ تعرف أكثر: " + APP_URL,
    ctaEn: "✅ Learn more: " + APP_URL,
  },
  {
    title: "📱 انشر الإعلانات مباشرة من تيليغرام",
    titleEn: "📱 Post ads directly from Telegram",
    descriptionAr: "مشغول جداً لفتح الموقع؟ استخدم بوت تيليغرام @classifiedsuae_bot لنشر الإعلانات مباشرة من المحادثة. اختر خطة، أضف الصور، انشر — خلال أقل من دقيقة.",
    descriptionEn: "Too busy to open the website? Use our Telegram bot @classifiedsuae_bot to post ads right from your chat. Choose a plan, add photos, publish — done in under a minute.",
    ctaAr: "💬 جرّب البوت: t.me/classifiedsuae_bot",
    ctaEn: "💬 Try the bot: t.me/classifiedsuae_bot",
  },
  {
    title: "🎯 إعلانات بريميوم — 30 يوماً، 6 صور، مثبتة في الأعلى",
    titleEn: "🎯 Premium ads — 30 days, 6 images, pinned at top",
    descriptionAr: "للبائعين الجادين: خطة بريميوم تمنحك 1,200 حرف، 6 صور، 30 يوم ظهور، شارة «مميز»، وتثبيت في الأعلى. أقصى وصول، أقصى تأثير.",
    descriptionEn: "For serious sellers: Premium plan gives you 1,200 characters, 6 images, 30 days of visibility, a Featured badge, and pinned placement. Maximum reach, maximum impact.",
    ctaAr: "💎 ترقية: " + APP_URL + "/pricing",
    ctaEn: "💎 Upgrade: " + APP_URL + "/pricing",
  },
  {
    title: "🔄 أعد نشر الإعلانات المنتهية بنصف السعر",
    titleEn: "🔄 Renew expired ads at half price",
    descriptionAr: "انتهى إعلانك ولديك المزيد؟ الإعلانات المنتهية يمكن إعادة نشرها بخصم 50% من سعر الخطة الأصلية. عدّل، حدّث، أو أعد الإطلاق في ثوانٍ من لوحة التحكم.",
    descriptionEn: "Sold out but have more? Expired ads can be republished at 50% off the original plan price. Edit, update, or relaunch in seconds from your dashboard.",
    ctaAr: "🔁 إعلاناتي: " + APP_URL + "/my-ads",
    ctaEn: "🔁 My ads: " + APP_URL + "/my-ads",
  },
  {
    title: "🐾 حيوانات، معدات، إلكترونيات — بِع أي شيء.",
    titleEn: "🐾 Pets, equipment, electronics — sell anything.",
    descriptionAr: "15 فئة. سيارات، عقارات، وظائف، موبايلات، إلكترونيات، كمبيوتر، أثاث، أزياء، تعليم، صالونات، عيادات، حيوانات، معدات — مهما كان ما تملكه، له مكان عندنا.",
    descriptionEn: "15 categories. Cars, real estate, jobs, mobiles, electronics, computers, furniture, fashion, education, salons, clinics, pets, equipment — whatever you have, there's a place for it.",
    ctaAr: "🏷 تصفّح: " + APP_URL,
    ctaEn: "🏷 Browse: " + APP_URL,
  },
  {
    title: "💬 المشترون يتواصلون معك مباشرة عبر واتساب",
    titleEn: "💬 Buyers contact you directly via WhatsApp",
    descriptionAr: "بدون نماذج، بدون وسطاء. المشترون ينقرون على زر واتساب، اتصال، أو تيليغرام في إعلانك ويصلون إليك فوراً. أنت تتحكم بكل محادثة.",
    descriptionEn: "No forms, no middlemen. Buyers click the WhatsApp, call, or Telegram button on your ad and reach you instantly. You stay in control of every conversation.",
    ctaAr: "📞 ابدأ الآن: " + APP_URL,
    ctaEn: "📞 Start now: " + APP_URL,
  },
  {
    title: "🌟 لُفت الأنظار — ظهور مميز ومثبت في الأعلى",
    titleEn: "🌟 Get noticed — Featured + Pinned placement",
    descriptionAr: "رقِّ إلى الخطة القياسية أو بريميوم لتظهر في أعلى نتائج البحث وصفحات الفئات مع شارة ذهبية «مميز». البائعون الجادون يحصلون على نتائج جادة.",
    descriptionEn: "Upgrade to Standard or Premium to show up at the top of search results and category pages with a gold Featured badge. Serious sellers get serious results.",
    ctaAr: "⭐ الخطط: " + APP_URL + "/pricing",
    ctaEn: "⭐ Plans: " + APP_URL + "/pricing",
  },
  {
    title: "📊 إحصائيات مباشرة على إعلاناتك",
    titleEn: "📊 Live stats on your ads",
    descriptionAr: "تابع المشاهدات، نقرات واتساب، ونقرات الاتصال مباشرة من لوحة التحكم. اعرف ما الذي يعمل. عدّل، حسّن، وبِع بذكاء.",
    descriptionEn: "Track views, WhatsApp clicks, and call clicks right from your dashboard. Know what's working. Adjust, optimize, and sell smarter.",
    ctaAr: "📈 لوحتي: " + APP_URL + "/my-ads",
    ctaEn: "📈 My dashboard: " + APP_URL + "/my-ads",
  },
  {
    title: "🆕 جديد في Classifieds UAE: النشر على X (تويتر)",
    titleEn: "🆕 New on Classifieds UAE: X (Twitter) publishing",
    descriptionAr: "أضفنا للتو X إلى قنوات النشر لدينا. نقرة واحدة — إعلانك يصل إلى الموقع، فيسبوك، انستقرام، قناة تيليغرام، وX. أقصى انتشار عبر كل المنصات الرئيسية.",
    descriptionEn: "We just added X to our publishing pipeline. One click — your ad reaches the website, Facebook, Instagram, Telegram channel, AND X. Maximum exposure across every major platform.",
    ctaAr: "🆕 جرّب: " + APP_URL,
    ctaEn: "🆕 Try it: " + APP_URL,
  },
  {
    title: "🚀 Classifieds UAE — صُنعت للإمارات",
    titleEn: "🚀 Classifieds UAE — built for the Emirates",
    descriptionAr: "مصممة لسوق الإمارات: ثنائية اللغة (عربي + إنجليزي)، تركيز على الموبايل، مع تكامل واتساب وتيليغرام، ومدفوعات عبر Ziina. نحن نفهم مجتمعنا.",
    descriptionEn: "Designed for the UAE market: bilingual (Arabic + English), mobile-first, with WhatsApp and Telegram integration, and payments through Ziina. We know our community.",
    ctaAr: "🇦🇪 ابدأ: " + APP_URL,
    ctaEn: "🇦🇪 Start: " + APP_URL,
  },
];

/**
 * Deterministic content selection: same (platform + date) → same content, so repeated cron
 * calls in the same day don't double-post accidentally (in addition to DB log check).
 * Different platforms see different content on the same day.
 */
export function pickPromoContent(platform: string, date: Date = new Date()): { index: number; content: PromoContent } {
  const platformOffsets: Record<string, number> = {
    facebook: 0, instagram: 1, x: 2, telegram: 3,
  };
  const offset = platformOffsets[platform] ?? 0;

  // Days since 2026-01-01 (epoch-like, stable)
  const epoch = new Date(2026, 0, 1).getTime();
  const daysElapsed = Math.floor((date.getTime() - epoch) / (24 * 60 * 60 * 1000));
  const index = ((daysElapsed * 7 + offset) % PROMO_POOL.length + PROMO_POOL.length) % PROMO_POOL.length;

  return { index, content: PROMO_POOL[index] };
}

/** The logo image URL used on every promo post. */
export function getPromoImageUrl(): string {
  return `${APP_URL}/Classifieds_uae_jpg.jpeg`;
}

// ── Social media links & publishing options (shared footer block) ───────────
export const SOCIAL_LINKS = {
  website:   "https://classifiedsuae.ae",
  facebook:  "https://facebook.com/classifiedsuaeofficial",
  instagram: "https://instagram.com/classifiedsuaeofficial",
  x:         "https://x.com/clasifiedsuae",
  telegram:  "https://t.me/classifiedsuaeofficial",
  whatsapp:  "https://whatsapp.com/channel/0029Vb6jcHdDDmFX0Pp7ej34",
  threads:   "https://www.threads.com/@classifiedsuaeofficial",
  bot:       "https://t.me/classifiedsuae_bot",
};

/**
 * Footer block shown on every promo post.
 * - Two bold ways to publish (website + Telegram bot)
 * - All our social media links
 */
export function buildFooter(): string {
  const divider = "━━━━━━━━━━━━━━━━━━━━";
  return [
    divider,
    "✨ انشر إعلانك بطريقتين ✨",
    "✨ Two ways to post your ad ✨",
    "",
    `🌐 الموقع | Website`,
    `   ${SOCIAL_LINKS.website}`,
    "",
    `🤖 بوت تيليغرام | Telegram Bot`,
    `   ${SOCIAL_LINKS.bot}`,
    "",
    divider,
    "📲 تواصل معنا | Follow us",
    "",
    `📘 Facebook:  ${SOCIAL_LINKS.facebook}`,
    `📷 Instagram: ${SOCIAL_LINKS.instagram}`,
    `✖️ X:         ${SOCIAL_LINKS.x}`,
    `📱 Telegram:  ${SOCIAL_LINKS.telegram}`,
    `💬 WhatsApp:  ${SOCIAL_LINKS.whatsapp}`,
    `🧵 Threads:   ${SOCIAL_LINKS.threads}`,
    divider,
  ].join("\n");
}

/** Compact footer for platforms with strict character limits (e.g. X). */
export function buildFooterShort(): string {
  return [
    "━━━━━━━━━━━",
    "✨ انشر إعلانك | Post your ad",
    `🌐 ${SOCIAL_LINKS.website}`,
    `🤖 ${SOCIAL_LINKS.bot}`,
  ].join("\n");
}

/**
 * Formats content as a bilingual post body.
 * Structure (Arabic prioritised):
 *   Arabic title + English title
 *   Arabic description
 *   Arabic CTA
 *   ─── divider ───
 *   English description
 *   English CTA
 *   ─── footer ───
 *   Two publishing options
 *   Social media links
 */
export function formatBilingualPost(content: PromoContent): { title: string; body: string } {
  const title = `${content.title}\n${content.titleEn}`;
  const body = [
    content.descriptionAr,
    "",
    content.ctaAr,
    "",
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    content.descriptionEn,
    "",
    content.ctaEn,
    "",
    buildFooter(),
  ].join("\n");
  return { title, body };
}
