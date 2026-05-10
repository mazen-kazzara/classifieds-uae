/**
 * Promotional content pool for daily company ads on social media.
 * Arabic only. 50-80 words. Website URL only. SEO-powered hashtags.
 */

export interface PromoContent {
  text: string;
}

const APP_URL = process.env.APP_URL || "https://classifiedsuae.ae";

export const PROMO_POOL: PromoContent[] = [
  { text: "📢 انشر إعلانك على 5 منصات بنقرة واحدة — الموقع، فيسبوك، انستقرام، تيليغرام، وX. سيارات، عقارات، وظائف، خدمات وأكثر من 17 فئة متاحة. ابدأ مجاناً بـ 150 حرف وصورة، أو اختر الخطة القياسية بـ 9 دراهم فقط لوصول أوسع. إعلانك يصل فوراً." },
  { text: "🚗 تبيع سيارتك؟ انشر إعلانك مع الصور والسعر والتفاصيل — يصل لمشترين حقيقيين على كل وسائل التواصل في الإمارات. تواصل مباشر عبر واتساب أو اتصال. جرّب الآن مجاناً — النشر يستغرق أقل من دقيقة." },
  { text: "🏠 عقارك للبيع أو الإيجار؟ انشر إعلانك مع الصور والموقع ووصّله لجمهور حقيقي في دبي، أبوظبي، الشارقة وكل الإمارات. خططنا تبدأ من مجاني وتصل لـ 30 يوم ظهور مع خطة بريميوم. ابدأ الآن." },
  { text: "💼 هل تبحث عن وظيفة في الإمارات؟ أو تريد توظيف كفاءات لشركتك؟ تصفّح إعلانات الوظائف المتاحة أو انشر إعلان توظيف بسهولة. إعلانك يصل لكل المنصات ويظهر في نتائج البحث. سهل، سريع، ومجاني." },
  { text: "📱 موبايلك القديم، لابتوبك، أو أي جهاز إلكتروني — بِعه بسرعة على Classifieds UAE. ارفع الصور، حدد السعر، واختر طريقة التواصل المفضلة. إعلانك يُنشر فوراً على الموقع وكل قنوات التواصل الاجتماعي." },
  { text: "💎 مجوهرات، ساعات، إكسسوارات — فئات مخصصة لكل ما يتعلق بالأناقة والفخامة. انشر إعلانك مع صور عالية الجودة ووصّله للمهتمين في الإمارات. خططنا المدفوعة تشمل حتى 6 صور و30 يوم ظهور." },
  { text: "🛋️ أثاث، معدات، أدوات — بِع أي شيء تملكه في الإمارات. 17 فئة تغطي كل ما تحتاجه. اختر الفئة المناسبة، ارفع الصور، وانشر إعلانك على 5 منصات بنقرة واحدة. ابدأ مجاناً." },
  { text: "💇 صالون تجميل؟ عيادة؟ خدمات تعليمية؟ وصّل عملك للعملاء الباحثين عنك في دبي، أبوظبي، الشارقة وكل الإمارات. إعلانك يظهر على الموقع وكل وسائل التواصل. تواصل مباشر بدون وسطاء." },
  { text: "⭐ الخطة القياسية — 9 دراهم فقط، 800 حرف، 4 صور، و14 يوم ظهور. الخيار الأكثر شعبية للإعلانات المميزة. إعلانك يظهر في أعلى نتائج البحث ويصل لجمهور أوسع على كل المنصات." },
  { text: "💎 خطة بريميوم — 15 درهم، 1200 حرف، 6 صور، 30 يوم ظهور، وتثبيت في أعلى نتائج البحث. الخيار الأمثل لمن يريد أقصى وصول وأعلى ظهور لإعلانه في الإمارات." },
  { text: "🔄 إعلانك انتهت صلاحيته؟ لا تنشئ إعلان جديد — أعد نشره بنصف السعر فقط! عدّل المحتوى إذا أردت وأعد الإطلاق بنقرة واحدة من صفحة إعلاناتي. سهل وسريع." },
  { text: "📸 الإعلانات بالصور تجذب انتباهاً أكبر. خططنا المدفوعة تبدأ من 5 دراهم وتشمل حتى 6 صور عالية الجودة. اعرض منتجك باحترافية — الصورة الجيدة تبيع أسرع." },
  { text: "🤝 تواصل مباشر بين البائع والمشتري — واتساب، اتصال، أو تيليغرام. بدون وسطاء، بدون نماذج، بدون انتظار. المشتري يضغط زر التواصل ويصلك فوراً. أنت تتحكم بكل محادثة." },
  { text: "🇦🇪 منصة مصممة خصيصاً لسوق الإمارات — عربي وإنجليزي، دفع آمن عبر Ziina، تكامل مع واتساب وتيليغرام، ونشر على 5 منصات بنقرة واحدة. نفهم احتياجاتك ونوصلك لجمهورك." },
  { text: "🆓 ابدأ مجاناً — خطتنا المجانية تمنحك 150 حرف وصورة واحدة. كافية لإعلان سريع وفعّال. وإذا أردت وصولاً أوسع، الخطط المدفوعة تبدأ من 5 دراهم فقط. لا التزام، لا رسوم خفية." },
  { text: "🐾 حيوانك الأليف يحتاج بيت جديد؟ أو تبحث عن رفيق؟ فئة الحيوانات الأليفة على Classifieds UAE مخصصة لك. انشر إعلانك مع الصور والتفاصيل ووصّله لمحبي الحيوانات في الإمارات." },
  { text: "🎮 كمبيوتر، ألعاب فيديو، لابتوبات، وكل ما يتعلق بالتكنولوجيا والترفيه — انشر إعلانك على Classifieds UAE ووصّله لعشاق التقنية في الإمارات. النشر سهل وسريع ومجاني." },
  { text: "👗 ملابس، أزياء، وإكسسوارات — فئة مخصصة لعشاق الموضة. انشر إعلانك مع الصور ووصّله للمهتمين. خططنا تبدأ من مجاني — اعرض ما لديك وابدأ البيع اليوم." },
  { text: "📲 ثلاث طرق سهلة لنشر إعلانك — من الموقع مباشرة، بوت واتساب، أو بوت تيليغرام. اختر الطريقة الأنسب لك، أكمل الخطوات في أقل من دقيقة، وإعلانك يصل لكل المنصات فوراً." },
  { text: "🏢 خدمات IT؟ تصميم مواقع؟ استشارات؟ تدريب؟ وصّل خدمتك للعملاء الباحثين عنك في الإمارات. إعلانك يظهر على الموقع، فيسبوك، انستقرام، تيليغرام، وX. ابدأ مجاناً." },
];

// SEO-powered hashtags — EN broad reach + AR local reach
const HASHTAGS = "#classifiedsuae #إعلانات_الإمارات #بيع_وشراء #سوق_الإمارات #إعلانات_مبوبة #دبي #أبوظبي #الشارقة #UAE #Dubai #AbuDhabi #Sharjah #classified #ForSale #سيارات_للبيع #عقارات_الإمارات #وظائف_دبي";

export function pickPromoContent(platform: string, date: Date = new Date()): { index: number; content: PromoContent } {
  const platformOffsets: Record<string, number> = { facebook: 0, instagram: 1, telegram: 2 };
  const offset = platformOffsets[platform] ?? 0;
  const epoch = new Date(2026, 0, 1).getTime();
  const daysElapsed = Math.floor((date.getTime() - epoch) / (24 * 60 * 60 * 1000));
  const index = ((daysElapsed * 7 + offset) % PROMO_POOL.length + PROMO_POOL.length) % PROMO_POOL.length;
  return { index, content: PROMO_POOL[index] };
}

export function getPromoImageUrl(): string {
  return `${APP_URL}/Classifieds_uae_jpg.jpeg`;
}

export function buildPromoPost(content: PromoContent): string {
  return [
    content.text,
    "",
    `🌐 ${APP_URL}`,
    "",
    HASHTAGS,
  ].join("\n");
}

export function getHashtags(): string {
  return HASHTAGS;
}

export const SOCIAL_LINKS = {
  website:   "https://classifiedsuae.ae",
  facebook:  "https://facebook.com/classifiedsuaeofficial",
  instagram: "https://instagram.com/classifiedsuaeofficial",
  x:         "https://x.com/clasifiedsuae",
  telegram:  "https://t.me/classifiedsuaeofficial",
  whatsapp:  "https://classifiedsuae.ae/WhatsApp/channel/classifiedsuaeofficial",
  threads:   "https://www.threads.com/@classifiedsuaeofficial",
  bot:       "https://t.me/classifiedsuae_bot",
};

export function buildFooter(): string { return ""; }
export function buildFooterShort(): string { return ""; }
export function formatBilingualPost(content: any): { title: string; body: string } {
  return { title: content.text || content.title || "", body: "" };
}
