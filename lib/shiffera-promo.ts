/**
 * Shiffera.com daily promotional posts on all social platforms.
 * Rotates content daily, alternates dark/light logo.
 * Runs 30 minutes after the Classifieds UAE promo cron.
 */

import { prisma } from "@/lib/prisma";
import { publishToSocial } from "@/lib/social-publisher";

const APP_URL = process.env.APP_URL || "https://classifiedsuae.ae";

interface ShifferaPost {
  ar: string;
  en: string;
}

// 20 rotating bilingual posts (Arabic first, then English) — ~20-25 words each
const POSTS: ShifferaPost[] = [
  {
    ar: "حلول تقنية متكاملة من Shiffera — تصميم مواقع، تطبيقات، تسويق رقمي، وخدمات IT. نبني نجاحك الرقمي.",
    en: "Complete tech solutions from Shiffera — web design, apps, digital marketing & IT services. We code your digital success.",
  },
  {
    ar: "أكثر من 15 سنة خبرة في تقنية المعلومات والتسويق الرقمي. Shiffera شريكك التقني في الإمارات.",
    en: "15+ years of experience in IT and digital marketing. Shiffera is your tech partner in the UAE.",
  },
  {
    ar: "تصميم مواقع احترافية وتطبيقات موبايل بأحدث التقنيات. Shiffera — نحوّل أفكارك إلى واقع رقمي.",
    en: "Professional website design and mobile apps with latest technologies. Shiffera — turning ideas into digital reality.",
  },
  {
    ar: "تسويق رقمي يحقق نتائج — إعلانات جوجل، SEO، إدارة حسابات التواصل. Shiffera خبراء النمو الرقمي.",
    en: "Digital marketing that delivers — Google Ads, SEO, social media management. Shiffera, your digital growth experts.",
  },
  {
    ar: "خدمات IT متكاملة — عقود صيانة سنوية، حلول سحابية، أمن شبكات. Shiffera تحمي وتدير بيئتك التقنية.",
    en: "Full IT services — annual contracts, cloud solutions, network security. Shiffera protects and manages your tech.",
  },
  {
    ar: "هوية بصرية تميّزك — تصميم شعارات، جرافيك، وبراندينج احترافي. Shiffera نصنع علامتك التجارية.",
    en: "Visual identity that stands out — logo design, graphics & professional branding. Shiffera crafts your brand.",
  },
  {
    ar: "حلول التجارة الإلكترونية الشاملة — من التصميم للدفع للتوصيل. Shiffera متجرك الإلكتروني جاهز.",
    en: "Complete e-commerce solutions — from design to payment to delivery. Shiffera gets your online store ready.",
  },
  {
    ar: "نتكلم لغات متعددة ونفهم احتياجات السوق المحلي. Shiffera — حلول تقنية بأسعار منافسة في دبي.",
    en: "We speak multiple languages and understand local market needs. Shiffera — competitive tech solutions in Dubai.",
  },
  {
    ar: "تطبيقات iOS و Android مخصصة لعملك — تصميم عصري وأداء سريع. Shiffera نطوّر تطبيقك.",
    en: "Custom iOS & Android apps for your business — modern design and fast performance. Shiffera builds your app.",
  },
  {
    ar: "بوابات حكومية إلكترونية وأنظمة مؤسسية متقدمة. Shiffera شريك التحول الرقمي للمؤسسات.",
    en: "E-government portals and advanced enterprise systems. Shiffera is your digital transformation partner.",
  },
  {
    ar: "خدمة ما بعد البيع تضمن استمرار نموك — نتابع مشروعك حتى بعد التسليم. Shiffera نهتم بنجاحك.",
    en: "After-sale service ensures your growth — we follow up even after delivery. Shiffera cares about your success.",
  },
  {
    ar: "إعلانات جوجل PPC وحملات يوتيوب فعّالة — نوصل رسالتك للجمهور الصحيح. Shiffera تسويق ذكي.",
    en: "Google PPC ads and effective YouTube campaigns — reaching your right audience. Shiffera, smart marketing.",
  },
  {
    ar: "أمن الشبكات وكاميرات المراقبة — نحمي بيئة عملك بالكامل. Shiffera حلول أمنية متكاملة.",
    en: "Network security and surveillance cameras — protecting your entire workspace. Shiffera, complete security solutions.",
  },
  {
    ar: "SEO يرفع موقعك في نتائج البحث — نتصدّر جوجل معاً. Shiffera خبراء تحسين محركات البحث.",
    en: "SEO that ranks your site higher — let's top Google together. Shiffera, search engine optimization experts.",
  },
  {
    ar: "سيرفرات، كلاود، واستضافة — نثبّت وندير بنيتك التحتية بالكامل. Shiffera حلول الاستضافة.",
    en: "Servers, cloud & hosting — we install and manage your full infrastructure. Shiffera hosting solutions.",
  },
  {
    ar: "تسويق عبر واتساب واستراتيجيات محتوى مخصصة — نبني حضورك الرقمي. Shiffera تسويق مبتكر.",
    en: "WhatsApp marketing and custom content strategies — building your digital presence. Shiffera, innovative marketing.",
  },
  {
    ar: "من الفكرة للتنفيذ — Shiffera فريق متكامل يضم مطورين، مصممين، ومسوقين رقميين. ابدأ مشروعك معنا.",
    en: "From idea to execution — Shiffera has developers, designers & digital marketers. Start your project with us.",
  },
  {
    ar: "شركة تقنية مرخصة في دبي — رخصة رقم 1553634. Shiffera نعمل معك لا من أجلك.",
    en: "Licensed tech company in Dubai — license #1553634. Shiffera works with you, not just for you.",
  },
  {
    ar: "رسوم تنافسية وخبرة طويلة وخدمة واسعة — لماذا تختار غيرنا؟ Shiffera الحل الأمثل لعملك.",
    en: "Competitive prices, long experience & wide services — why choose anyone else? Shiffera, the best for your business.",
  },
  {
    ar: "حلول رقمية شاملة تحت سقف واحد — IT، تصميم، تسويق، وبراندينج. Shiffera كل ما تحتاجه.",
    en: "Complete digital solutions under one roof — IT, design, marketing & branding. Shiffera, everything you need.",
  },
];

const CONTACT_AR = `\n\n📍 دبي، الإمارات\n📞 971507408075+\n📧 info@shiffera.com\n🌐 www.shiffera.com`;
const CONTACT_EN = `\n\n📍 Dubai, UAE\n📞 +971507408075\n📧 info@shiffera.com\n🌐 www.shiffera.com`;

const HASHTAGS = "#Shiffera #ShifferaUAE #IT #WebDesign #DigitalMarketing #Dubai #UAE #تقنية #تصميم_مواقع #تسويق_رقمي #دبي";

function pickPost(date: Date = new Date()): { index: number; post: ShifferaPost; useDarkLogo: boolean } {
  const epoch = new Date(2026, 0, 1).getTime();
  const day = Math.floor((date.getTime() - epoch) / (24 * 60 * 60 * 1000));
  const index = ((day * 3) % POSTS.length + POSTS.length) % POSTS.length;
  const useDarkLogo = day % 2 === 0; // alternate dark/light daily
  return { index, post: POSTS[index], useDarkLogo };
}

// Optimal publishing time: 7 PM UAE (evening peak — good for FB, IG, Telegram)
const SHIFFERA_TARGET_HOUR = 19; // 7 PM UAE time

export async function publishShifferaPromo(opts: { force?: boolean } = {}): Promise<Record<string, any>> {
  // Only publish at target hour (unless forced)
  if (!opts.force) {
    const uaeHour = (new Date().getUTCHours() + 4) % 24;
    if (uaeHour !== SHIFFERA_TARGET_HOUR) return { skipped: "NOT_DUE", currentUAEHour: uaeHour, targetHour: SHIFFERA_TARGET_HOUR };
  }

  // Check if already published today (UAE calendar day, UTC+4)
  if (!opts.force) {
    const nowUTC = new Date();
    const uaeNow = new Date(nowUTC.getTime() + 4 * 60 * 60 * 1000);
    const uaeTodayStart = new Date(Date.UTC(uaeNow.getUTCFullYear(), uaeNow.getUTCMonth(), uaeNow.getUTCDate()));
    const uaeTodayStartUTC = new Date(uaeTodayStart.getTime() - 4 * 60 * 60 * 1000);
    const recent = await prisma.promoLog.findFirst({
      where: { platform: "shiffera-all", status: "SUCCESS", publishedAt: { gte: uaeTodayStartUTC } },
    });
    if (recent) return { skipped: "ALREADY_PUBLISHED_TODAY" };
  }

  const { index, post, useDarkLogo } = pickPost();
  const imageUrl = `${APP_URL}/${useDarkLogo ? "shiffera-dark.png" : "shiffera-light.png"}`;

  const fullText = [
    post.ar,
    CONTACT_AR,
    "",
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    post.en,
    CONTACT_EN,
    "",
    HASHTAGS,
  ].join("\n");

  const results: Record<string, any> = {};

  // Facebook
  try {
    const fb = await publishToSocial({
      title: post.ar + "\n" + post.en,
      description: fullText,
      category: "Shiffera",
      adUrl: "https://shiffera.com",
      imageUrl,
      hideCategory: true,
      skipHashtags: true,
      publishFacebook: true,
    });
    results.facebook = { ok: !!fb.facebookPostId, postId: fb.facebookPostId, url: fb.facebookUrl };
  } catch (e: any) { results.facebook = { ok: false, error: e.message }; }

  // Instagram
  try {
    const ig = await publishToSocial({
      title: post.ar + "\n" + post.en,
      description: fullText,
      category: "Shiffera",
      adUrl: "https://shiffera.com",
      imageUrl,
      hideCategory: true,
      skipHashtags: true,
      publishInstagram: true,
    });
    results.instagram = { ok: !!ig.instagramPostId, postId: ig.instagramPostId, url: ig.instagramUrl };
  } catch (e: any) { results.instagram = { ok: false, error: e.message }; }

  // X publishing removed

  // Telegram
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    if (botToken && channelId) {
      const caption = [
        `🏢 ${post.ar}`,
        CONTACT_AR,
        "",
        `🏢 ${post.en}`,
        CONTACT_EN,
        "",
        HASHTAGS,
      ].join("\n").slice(0, 1024);

      const replyMarkup = {
        inline_keyboard: [[
          { text: "🌐 Shiffera.com", url: "https://shiffera.com" },
          { text: "📞 Contact", url: "https://wa.me/971507408075" },
        ]],
      };

      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: channelId, photo: imageUrl, caption, reply_markup: replyMarkup }),
      });
      const json = await res.json();
      results.telegram = { ok: !!json?.ok, messageId: json?.result?.message_id };
    } else {
      results.telegram = { ok: false, error: "telegram not configured" };
    }
  } catch (e: any) { results.telegram = { ok: false, error: e.message }; }

  // Log
  const anySuccess = Object.values(results).some((r: any) => r.ok);
  await prisma.promoLog.create({
    data: {
      platform: "shiffera-all",
      contentIndex: index,
      status: anySuccess ? "SUCCESS" : "FAILED",
      postId: JSON.stringify(results),
    },
  });

  return results;
}
