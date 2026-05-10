/**
 * SHAMRA Building Contracting — daily promotional posts.
 * Arabic only. Contact: 971529300660. Website: shamra.ae
 * Publishes daily at 9 AM UAE time (5 AM UTC).
 * Content from company profile + ad copy provided.
 */

import { prisma } from "@/lib/prisma";
import { publishToSocial } from "@/lib/social-publisher";

const APP_URL = process.env.APP_URL || "https://classifiedsuae.ae";

interface ShamraPost {
  text: string;
}

const POSTS: ShamraPost[] = [
  { text: "🏗️ SHAMRA للمقاولات — بناء فلل في دبي بتنفيذ دقيق وتسليم مضمون. إدارة كاملة للمشروع من التصميم حتى التسليم مع التزام بالمخططات والجودة. تواصل الآن." },
  { text: "🏊 مسبح فاخر في بيتك — تصميم وتنفيذ كامل مع عزل وفلترة وتشطيب عالي الجودة. حوّل مساحتك لمسبح احترافي مع SHAMRA للمقاولات في دبي." },
  { text: "🍽️ تنفيذ Out-Fit احترافي للمحلات والمطاعم — تسليم سريع. بدك تفتح مشروع بسرعة؟ تنفيذ كامل من التصميم إلى التسليم مع التزام بالوقت والجودة." },
  { text: "🏠 تجديد محلك أو فيلتك بالكامل — نحوّل القديم إلى جديد بشكل احترافي. ترميم وتجديد شامل مع SHAMRA للمقاولات في دبي. نتيجة واضحة خلال وقت قصير." },
  { text: "☕ تنفيذ مطاعم وكافيهات جاهزة للتشغيل — نحوّل فكرتك إلى مشروع يعمل فعلياً بسرعة. تصميم يخدم التشغيل ويزيد الأرباح مع SHAMRA." },
  { text: "📐 تصميم + عرض سعر مجاني خلال 48 ساعة — احصل على تصور كامل لمشروعك بدون التزام. استشارة مجانية من SHAMRA للمقاولات في دبي." },
  { text: "📈 تشطيب يرفع قيمة العقار فوراً — تنفيذ ذكي يزيد سعر البيع أو الإيجار. الخيار الأمثل للمستثمرين في دبي مع SHAMRA للمقاولات." },
  { text: "🏢 تنفيذ مشاريع تجارية جاهزة للافتتاح — محلات، مكاتب، ومجمعات تجارية بتصميم عصري وتنفيذ احترافي. ابدأ مشروعك فوراً مع SHAMRA." },
  { text: "🏡 بناء فلل G+1 بجودة عالية — خبرة في تنفيذ الفلل السكنية مع التزام كامل بالمواصفات والمواعيد. SHAMRA للمقاولات، دبي." },
  { text: "🎨 تصميم داخلي فاخر — ديكور حديث وتنفيذ احترافي للقصور، المنازل، المكاتب، والفنادق. تصاميم عصرية تجمع بين الجمال والوظيفة مع SHAMRA." },
  { text: "🏗️ SHAMRA للمقاولات — شركة رائدة في دبي تقدم خدمات بناء وتصميم شاملة منذ 2017. جودة عالية، ممارسات مستدامة، وتصاميم معمارية حديثة." },
  { text: "🔧 ترميم وتجديد المباني القائمة — تحديث شامل مع اهتمام بالتفاصيل والتسليم في الوقت المحدد. خدمات ترميم احترافية من SHAMRA في دبي." },
  { text: "🏠 أنظمة المنازل الذكية — تقنيات متقدمة لتحسين كفاءة الطاقة والأمان. تحكم كامل بالإضاءة والتكييف والأمن عبر الموبايل مع SHAMRA." },
  { text: "📋 إدارة مشاريع شاملة — تنسيق مع المهندسين والمعماريين والموردين لضمان تنفيذ سلس. التزام بالميزانية والوقت مع SHAMRA للمقاولات." },
  { text: "📜 استشارات وموافقات حكومية — مساعدة خبيرة في الحصول على التصاريح والموافقات. ضمان الامتثال لجميع القوانين في دبي والإمارات مع SHAMRA." },
  { text: "🏊 شركة متخصصة بتنفيذ المسابح في دبي — تصميم مخصص وتنفيذ كامل بدون مشاكل. أنظمة متطورة وتشطيب فاخر مع SHAMRA للمقاولات." },
  { text: "🍽️ تنفيذ كافيهات احترافية — تصميم يخدم التشغيل ويزيد الأرباح. جاهز للافتتاح بسرعة مع SHAMRA للمقاولات في دبي." },
  { text: "🏢 تنفيذ داخلي فاخر للمحلات — ديكور حديث وتنفيذ احترافي يجذب العملاء. تحويل المساحات التجارية لتجربة مميزة مع SHAMRA." },
  { text: "🏗️ من الفكرة حتى التسليم — SHAMRA للمقاولات تقدم حلول بناء متكاملة. فلل، قصور، مجمعات تجارية، ومسابح. تواصل معنا للاستشارة المجانية." },
  { text: "👷 فريق عمل متميز — مهندسون معماريون، مصممون داخليون، ومدراء مشاريع بخبرة عالية. SHAMRA للمقاولات، نبني للمستقبل في دبي." },
];

const CONTACT = "\n\n📞 971529300660+\n🌐 www.shamra.ae\n📧 contact@shamra.ae\n📍 دبي، الإمارات";

const HASHTAGS = "#SHAMRA #مقاولات #بناء_فلل #دبي #تصميم_داخلي #مقاولات_دبي #ترميم #تجديد #مسابح #Dubai #Construction #BuildingContractor #InteriorDesign #UAE #Renovation #SmartHome #فلل_دبي #تشطيبات";

function pickPost(date: Date = new Date()): { index: number; post: ShamraPost } {
  const epoch = new Date(2026, 0, 1).getTime();
  const day = Math.floor((date.getTime() - epoch) / (24 * 60 * 60 * 1000));
  const index = ((day * 3) % POSTS.length + POSTS.length) % POSTS.length;
  return { index, post: POSTS[index] };
}

function buildPost(post: ShamraPost): string {
  return [post.text, CONTACT, "", HASHTAGS].join("\n");
}

function getImageUrl(): string {
  return `${APP_URL}/shamra-logo.png`;
}

export async function publishShamraPromo(opts: { force?: boolean } = {}): Promise<Record<string, any>> {
  if (!opts.force) {
    // Check if already published today (UAE calendar day, UTC+4)
    const nowUTC = new Date();
    const uaeNow = new Date(nowUTC.getTime() + 4 * 60 * 60 * 1000);
    const uaeTodayStart = new Date(Date.UTC(uaeNow.getUTCFullYear(), uaeNow.getUTCMonth(), uaeNow.getUTCDate()));
    const uaeTodayStartUTC = new Date(uaeTodayStart.getTime() - 4 * 60 * 60 * 1000); // convert back to UTC
    const recent = await prisma.promoLog.findFirst({
      where: { platform: "shamra-all", status: "SUCCESS", publishedAt: { gte: uaeTodayStartUTC } },
    });
    if (recent) return { skipped: "ALREADY_PUBLISHED_TODAY" };
  }

  const { index, post } = pickPost();
  const imageUrl = getImageUrl();
  const fullPost = buildPost(post);
  const results: Record<string, any> = {};

  // Facebook
  try {
    const fb = await publishToSocial({
      title: "", description: fullPost, category: "SHAMRA", adUrl: "https://shamra.ae",
      imageUrl, hideCategory: true, skipHashtags: true, publishFacebook: true,
    });
    results.facebook = { ok: !!fb.facebookPostId, postId: fb.facebookPostId, url: fb.facebookUrl };
  } catch (e: any) { results.facebook = { ok: false, error: e.message }; }

  // Instagram
  try {
    const ig = await publishToSocial({
      title: "", description: fullPost, category: "SHAMRA", adUrl: "https://shamra.ae",
      imageUrl, hideCategory: true, skipHashtags: true, publishInstagram: true,
    });
    results.instagram = { ok: !!ig.instagramPostId, postId: ig.instagramPostId, url: ig.instagramUrl };
  } catch (e: any) { results.instagram = { ok: false, error: e.message }; }

  // X publishing removed

  // Telegram
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    if (botToken && channelId) {
      const caption = (post.text + CONTACT + "\n\n" + HASHTAGS).slice(0, 1024);
      const replyMarkup = { inline_keyboard: [[
        { text: "🌐 shamra.ae", url: "https://shamra.ae" },
        { text: "📞 اتصل", url: "https://wa.me/971529300660" },
      ]] };
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: channelId, photo: imageUrl, caption, reply_markup: replyMarkup }),
      });
      const json = await res.json();
      results.telegram = { ok: !!json?.ok, messageId: json?.result?.message_id };
    }
  } catch (e: any) { results.telegram = { ok: false, error: e.message }; }

  const anySuccess = Object.values(results).some((r: any) => r.ok);
  await prisma.promoLog.create({
    data: { platform: "shamra-all", contentIndex: index, status: anySuccess ? "SUCCESS" : "FAILED", postId: JSON.stringify(results) },
  });

  return results;
}
