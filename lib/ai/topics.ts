/**
 * Curated topic pool for daily blog generation.
 * Each topic carries its own slug seed so AR + EN pairs can share a topicSlug.
 * The cron picks the highest-priority topic that hasn't been used in the
 * last EXCLUSION_DAYS days; if all are recent, it falls back to the oldest.
 */

export interface BlogTopic {
  slug: string;
  /** Short prompt anchor — Arabic and English, fed to the model. */
  ar: string;
  en: string;
  /** Optional category taxonomy for analytics. */
  category: "classifieds" | "business" | "marketing" | "uae-market" | "tips";
}

export const EXCLUSION_DAYS = 30;

export const TOPICS: BlogTopic[] = [
  // ── Classifieds & ad performance ───────────────────────────────────────
  { slug: "how-to-write-effective-classified-ad", ar: "كيف تكتب إعلاناً مبوّباً فعّالاً يبيع بسرعة في الإمارات", en: "How to write a high-converting classified ad that sells quickly in the UAE", category: "classifieds" },
  { slug: "best-photos-for-classified-ads", ar: "أفضل تقنيات تصوير المنتجات لإعلانات أكثر جاذبية ومبيعات", en: "Photo techniques that double the response rate on UAE classifieds", category: "classifieds" },
  { slug: "pricing-strategy-classifieds-uae", ar: "استراتيجية تسعير المنتجات في إعلانات الإمارات: الفرق بين السعر النهائي والقابل للتفاوض", en: "Classifieds pricing strategy: when to set a fixed price vs. negotiable", category: "classifieds" },
  { slug: "ad-mistakes-to-avoid", ar: "أكثر 10 أخطاء تُقلّل من ظهور إعلانك المبوّب وكيف تتفاداها", en: "Ten ad mistakes that hurt visibility — and how to avoid them", category: "classifieds" },
  { slug: "best-time-to-post-uae", ar: "ما هو أفضل وقت لنشر إعلانك في الإمارات للحصول على أكبر مشاهدات", en: "When to post: the highest-engagement hours for UAE classifieds", category: "classifieds" },

  // ── Business growth on the platform ─────────────────────────────────────
  { slug: "business-account-vs-personal", ar: "متى تحتاج إلى حساب شركة بدلاً من حساب فردي على Classifieds UAE", en: "Business account vs. personal account: which one is right for you?", category: "business" },
  { slug: "scaling-small-business-uae", ar: "كيف تنمّي عملك الصغير في الإمارات باستخدام الإعلانات المبوّبة", en: "Scaling a small UAE business with classifieds: a practical playbook", category: "business" },
  { slug: "trade-license-and-online-presence", ar: "من الرخصة التجارية إلى الحضور الرقمي: خطوات أساسية لكل صاحب نشاط", en: "From trade license to digital presence: a checklist for UAE business owners", category: "business" },
  { slug: "managing-leads-from-classifieds", ar: "إدارة العملاء المحتملين القادمين من الإعلانات المبوّبة بطريقة احترافية", en: "Managing classifieds leads professionally — without losing sales", category: "business" },

  // ── Multi-platform publishing & marketing ───────────────────────────────
  { slug: "multi-platform-publishing-explained", ar: "النشر متعدد المنصات: لماذا يصل إعلانك إلى المزيد من المشترين عبر تيليغرام وفيسبوك وانستقرام", en: "Why multi-platform publishing wins: Telegram, Facebook, Instagram explained", category: "marketing" },
  { slug: "telegram-channels-for-sellers", ar: "كيف تستفيد من قنوات تيليغرام لزيادة مبيعات إعلاناتك في الإمارات", en: "Using Telegram channels to amplify classified ad sales in the UAE", category: "marketing" },
  { slug: "instagram-vs-facebook-for-classifieds", ar: "انستقرام أم فيسبوك: أيّهما أفضل للترويج لإعلانات البيع في الإمارات؟", en: "Instagram or Facebook: which one drives more classified sales in the UAE?", category: "marketing" },
  { slug: "automated-social-publishing-benefits", ar: "كيف تختصر النشر التسويقي بالأتمتة وتركز على البيع الفعلي", en: "Automating social publishing: free up hours and focus on real sales", category: "marketing" },

  // ── UAE market trends ───────────────────────────────────────────────────
  { slug: "used-cars-uae-market-guide", ar: "دليل سوق السيارات المستعملة في الإمارات: كيف تبيع بسعر عادل وسرعة", en: "The UAE used-car market: pricing fairly and selling fast", category: "uae-market" },
  { slug: "real-estate-classifieds-trends", ar: "اتجاهات إعلانات العقارات في الإمارات وما يبحث عنه المستأجرون اليوم", en: "UAE real-estate classifieds: what tenants and buyers are looking for", category: "uae-market" },
  { slug: "ramadan-eid-classifieds-strategy", ar: "تسويق إعلاناتك خلال رمضان والعيد: نصائح عملية للسوق الإماراتي", en: "Marketing your classifieds during Ramadan and Eid in the UAE", category: "uae-market" },
  { slug: "dubai-vs-abu-dhabi-buyer-behaviour", ar: "اختلاف سلوك المشترين بين دبي وأبوظبي وتأثيره على إعلاناتك", en: "Dubai vs. Abu Dhabi: how buyer behaviour shapes your ad strategy", category: "uae-market" },

  // ── Practical tips ──────────────────────────────────────────────────────
  { slug: "negotiating-with-uae-buyers", ar: "فن التفاوض مع المشترين في الإمارات: كيف تغلق الصفقة دون خسارة الربح", en: "The art of negotiating with UAE buyers: close deals without losing margin", category: "tips" },
  { slug: "secure-classified-transactions", ar: "نصائح أمان أساسية لإتمام صفقات الإعلانات المبوّبة بأمان في الإمارات", en: "Safety tips for completing classified deals securely in the UAE", category: "tips" },
  { slug: "scams-to-avoid-on-classifieds", ar: "كيف تتعرّف على عمليات الاحتيال في الإعلانات المبوّبة وتحمي نفسك", en: "How to spot — and avoid — scams on classified platforms", category: "tips" },
  { slug: "writing-compelling-titles", ar: "كيف تكتب عنواناً مبوّباً يجذب الانتباه ويرفع نسبة الضغط على إعلانك", en: "Writing compelling classified titles that increase click-through rates", category: "tips" },
  { slug: "renewing-and-republishing-ads", ar: "متى يجب تجديد إعلانك أو إعادة نشره؟ دليل عملي للحصول على نتائج أفضل", en: "When to renew or republish your classified ad for better results", category: "tips" },
];
