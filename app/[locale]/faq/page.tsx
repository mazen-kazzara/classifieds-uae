export const dynamic = "force-dynamic";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  return {
    title: isAr ? "الأسئلة الشائعة | CLASSIFIEDS UAE" : "FAQ | CLASSIFIEDS UAE",
    description: isAr ? "إجابات على الأسئلة الأكثر شيوعاً حول منصة CLASSIFIEDS UAE" : "Answers to frequently asked questions about CLASSIFIEDS UAE",
    alternates: {
      canonical: `https://classifiedsuae.ae/${locale}/faq`,
      languages: { en: "https://classifiedsuae.ae/en/faq", ar: "https://classifiedsuae.ae/ar/faq", "x-default": "https://classifiedsuae.ae/en/faq" },
    },
  };
}

interface FAQ { q: string; a: string; rich?: React.ReactNode; }

const faqsEn: FAQ[] = [
  { q: "What is CLASSIFIEDS UAE?", a: "CLASSIFIEDS UAE is a digital classified ads platform built for the United Arab Emirates. It allows individuals and businesses to post ads for products, services, and offers across multiple channels including the website, Facebook, Instagram, Telegram channel, and X (Twitter)." },
  { q: "Is it free to post an ad?", a: "Yes. We offer a free plan that lets you post an ad with up to 150 characters and 1 image for 3 days at no cost. We also have a special launch offer — the UAE Flag plan — which is FREE until May 1st with 800 characters and 4 images. For more reach, paid plans start from 5 AED." },
  { q: "What plans are available?", a: "We offer 5 plans: Free (0 AED, 150 chars, 1 image, 3 days); Basic (5 AED, 400 chars, 2 images, 7 days); 🇦🇪 UAE Flag — FREE until May 1st (Launch Offer, 800 chars, 4 images, 14 days); Standard (9 AED, 800 chars, 4 images, 14 days — Best Value); and Premium (15 AED, 1200 chars, 6 images, 30 days). Visit our Pricing page for full details." },
  { q: "How do I post an ad?", a: "Two ways: (1) through our website at classifiedsuae.ae, or (2) via our Telegram bot (@classifiedsuae_bot). Both take less than a minute." },
  { q: "What categories are available?", a: "We support 15 categories: Cars, Real Estate, Jobs, Services, Mobiles, Electronics, Computers & Games, Furniture, Fashion & Clothing, Education & Training, Salons & Beauty, Clinics, Pets, Equipment & Tools, and Others." },
  { q: "Where will my ad be published?", a: "When posting, you choose your platforms: Website, Facebook Page, Instagram, Telegram Channel, and/or X (Twitter). You can select one, all, or any combination — your ad goes exactly where you choose." },
  { q: "How do I pay for a paid ad?", a: "Payments are processed securely through Ziina, a licensed UAE payment gateway. You can pay using debit/credit cards. After successful payment, your ad is published instantly." },
  { q: "Can I add images to my ad?", a: "Yes, all plans support images. Free allows 1 image, Basic allows 2, Standard allows 4, and Premium allows up to 6 images." },
  { q: "How long will my ad stay live?", a: "It depends on your plan: Free ads last 3 days, Basic ads last 7 days, Standard ads last 14 days, and Premium ads last 30 days." },
  { q: "Can I edit or delete my ad after posting?", a: "You can manage your ads from your 'My Ads' dashboard after signing in. For content changes to a published ad, contact our support team and we'll help you." },
  { q: "Can I republish an expired ad?", a: "Yes. Expired ads stay in your 'My Ads' dashboard and can be republished at HALF the original plan price. If your original plan was Free, the republish price is 50% of the Basic plan (currently 2.5 AED). One click in My Ads — we'll handle the payment and relaunch instantly." },
  { q: "What is the UAE Flag plan?", a: "🇦🇪 UAE Flag is our special Launch Offer plan — FREE until May 1st. It gives you the same reach as our Standard plan: 800 characters, 4 images, and 14 days of visibility. Perfect way to try premium-level publishing at no cost." },
  { q: "How do buyers contact me?", a: "When posting, you choose your preferred contact methods: Call, WhatsApp, and/or Telegram. Buyers will see the contact options you selected on your ad page." },
  { q: "Do I need an account to post an ad?", a: "Yes, you need to register. You can sign up using your phone number, email, Google account, or Facebook account. Registration takes less than 30 seconds." },
  { q: "Is my personal information safe?", a: "Yes. We collect only the minimum data necessary to operate the platform. We never sell your personal information. Read our Privacy Policy for full details." },
  { q: "What content is prohibited?", a: "We strictly prohibit: illegal items, weapons, drugs, gambling, adult content, political content, counterfeit goods, and any content that violates UAE law. Violating ads are removed immediately." },
  { q: "What is the Standard plan?", a: "The Standard plan (9 AED) is our Best Value option — it gives you up to 800 characters, 4 images, and 14 days of visibility. It's the most popular choice for balanced reach and affordability." },
  { q: "Can I post from the Telegram bot?", a: "Yes. Our Telegram bot (@classifiedsuae_bot) offers the full ad creation experience — choose a plan, add details, upload images, select platforms, and publish. It even recognizes returning users by phone number." },
  { q: "What payment methods do you accept?", a: "We accept all major debit and credit cards through Ziina payment gateway. All transactions are secure and processed in AED." },
  { q: "Can I get a refund?", a: "Refunds are handled on a case-by-case basis. If your ad was not published due to a technical issue, contact us and we will resolve it. Ads removed for policy violations are not eligible for refunds." },
  { q: "How do I contact CLASSIFIEDS UAE?", a: "You can reach us through: our website (classifiedsuae.ae), email (info@classifiedsuae.ae), Telegram bot, Telegram channel, Facebook, Instagram, X, WhatsApp, or Threads. Visit our Contact page for all links.", rich: <>You can reach us through: our <a href="https://classifiedsuae.ae" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>website</a>, <a href="mailto:info@classifiedsuae.ae" style={{ color: "var(--primary)", textDecoration: "underline" }}>email</a>, <a href="https://t.me/classifiedsuae_bot" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>Telegram Bot</a>, <a href="https://t.me/classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>Telegram Channel</a>, <a href="https://facebook.com/classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>Facebook</a>, <a href="https://instagram.com/classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>Instagram</a>, <a href="https://x.com/clasifiedsuae" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>X</a>, <a href="https://whatsapp.com/channel/0029Vb6jcHdDDmFX0Pp7ej34" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>WhatsApp Channel</a>, or <a href="https://www.threads.com/@classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>Threads</a>. Visit our <a href="/en/go" style={{ color: "var(--primary)", textDecoration: "underline" }}>Contact page</a> for all links.</> },
  { q: "Who operates CLASSIFIEDS UAE?", a: "CLASSIFIEDS UAE is managed by Shiffera.com, a company specializing in advanced technology solutions with a focus on automation, speed, and high-quality user experience." },
];

const faqsAr: FAQ[] = [
  { q: "ما هو CLASSIFIEDS UAE؟", a: "CLASSIFIEDS UAE هي منصة إعلانات مبوبة رقمية مخصصة لدولة الإمارات العربية المتحدة. تتيح للأفراد والشركات نشر إعلاناتهم عبر عدة قنوات تشمل الموقع، فيسبوك، انستقرام، قناة تيليغرام، وX (تويتر)." },
  { q: "هل نشر الإعلان مجاني؟", a: "نعم. نوفر خطة مجانية تتيح لك نشر إعلان بحد أقصى 150 حرف وصورة واحدة لمدة 3 أيام بدون أي تكلفة. ولدينا أيضاً عرض خاص — خطة 🇦🇪 علم الإمارات — مجانية حتى 1 مايو مع 800 حرف و4 صور. للحصول على مزيد من الوصول، الخطط المدفوعة تبدأ من 5 درهم." },
  { q: "ما هي الخطط المتاحة؟", a: "نوفر 5 خطط: مجاني (0 د.إ، 150 حرف، صورة واحدة، 3 أيام)؛ أساسي (5 د.إ، 400 حرف، صورتين، 7 أيام)؛ 🇦🇪 علم الإمارات — مجاني حتى 1 مايو (عرض الإطلاق، 800 حرف، 4 صور، 14 يوماً)؛ قياسي (9 د.إ، 800 حرف، 4 صور، 14 يوماً — الأفضل قيمة)؛ وبريميوم (15 د.إ، 1200 حرف، 6 صور، 30 يوماً). زر صفحة الأسعار للتفاصيل الكاملة." },
  { q: "كيف أنشر إعلاناً؟", a: "بطريقتين: (1) عبر موقعنا classifiedsuae.ae، أو (2) عبر بوت تيليغرام (@classifiedsuae_bot). كلاهما يستغرق أقل من دقيقة." },
  { q: "ما هي الفئات المتاحة؟", a: "ندعم 15 فئة: سيارات، عقارات، وظائف، خدمات، موبايلات، إلكترونيات، كمبيوتر وألعاب، أثاث، ملابس وأزياء، تعليم وتدريب، صالونات وتجميل، عيادات، حيوانات أليفة، معدات وأدوات، وأخرى." },
  { q: "أين سيُنشر إعلاني؟", a: "عند النشر، تختار المنصات: الموقع، فيسبوك، انستقرام، قناة تيليغرام، و/أو X (تويتر). يمكنك اختيار واحدة أو كلها أو أي مجموعة — إعلانك يصل إلى ما تختاره بالضبط." },
  { q: "كيف أدفع للإعلان المدفوع؟", a: "تتم المدفوعات بشكل آمن عبر Ziina، بوابة دفع مرخصة في الإمارات. يمكنك الدفع باستخدام بطاقات الخصم/الائتمان. بعد الدفع الناجح، يُنشر إعلانك فوراً." },
  { q: "هل يمكنني إضافة صور لإعلاني؟", a: "نعم، جميع الخطط تدعم الصور. المجاني يسمح بصورة واحدة، الأساسي صورتين، القياسي 4 صور، والبريميوم حتى 6 صور." },
  { q: "كم مدة ظهور إعلاني؟", a: "يعتمد على خطتك: المجاني 3 أيام، الأساسي 7 أيام، القياسي 14 يوماً، والبريميوم 30 يوماً." },
  { q: "هل يمكنني تعديل أو حذف إعلاني بعد النشر؟", a: "يمكنك إدارة إعلاناتك من لوحة «إعلاناتي» بعد تسجيل الدخول. لتعديل محتوى إعلان منشور، تواصل مع فريق الدعم وسنساعدك." },
  { q: "هل يمكنني إعادة نشر إعلان منتهي؟", a: "نعم. الإعلانات المنتهية تبقى في لوحة «إعلاناتي» ويمكن إعادة نشرها بنصف سعر الخطة الأصلية. إذا كانت خطتك الأصلية مجانية، فسعر إعادة النشر هو 50% من خطة الأساسي (حالياً 2.5 د.إ). نقرة واحدة في إعلاناتي — نتولى الدفع وإعادة الإطلاق فوراً." },
  { q: "ما هي خطة علم الإمارات؟", a: "🇦🇪 علم الإمارات هي خطتنا الخاصة لعرض الإطلاق — مجانية حتى 1 مايو. تمنحك نفس وصول الخطة القياسية: 800 حرف، 4 صور، و14 يوماً من الظهور. طريقة مثالية لتجربة النشر بمستوى مميز بدون تكلفة." },
  { q: "كيف يتواصل المشترون معي؟", a: "عند النشر، تختار طرق التواصل المفضلة: اتصال، واتساب، و/أو تيليغرام. سيرى المشترون خيارات التواصل التي اخترتها في صفحة إعلانك." },
  { q: "هل أحتاج حساباً لنشر إعلان؟", a: "نعم، تحتاج للتسجيل. يمكنك إنشاء حساب برقم هاتفك، بريدك الإلكتروني، حساب Google، أو حساب Facebook. التسجيل يستغرق أقل من 30 ثانية." },
  { q: "هل معلوماتي الشخصية آمنة؟", a: "نعم. نجمع فقط الحد الأدنى من البيانات اللازمة لتشغيل المنصة. لا نبيع معلوماتك الشخصية أبداً. اقرأ سياسة الخصوصية للتفاصيل الكاملة." },
  { q: "ما المحتوى المحظور؟", a: "نحظر بشكل صارم: المواد غير القانونية، الأسلحة، المخدرات، القمار، المحتوى الإباحي، المحتوى السياسي، البضائع المقلدة، وأي محتوى يخالف قوانين الإمارات. تُزال الإعلانات المخالفة فوراً." },
  { q: "ما هي الخطة القياسية؟", a: "الخطة القياسية (9 درهم) هي خيار الأفضل قيمة — تمنحك حتى 800 حرف، 4 صور، و14 يوماً من الظهور. إنها الخيار الأكثر شعبية للتوازن بين الوصول والسعر المناسب." },
  { q: "هل يمكنني النشر من بوت تيليغرام؟", a: "نعم. بوت تيليغرام (@classifiedsuae_bot) يوفر تجربة إنشاء إعلانات كاملة — اختر خطة، أضف تفاصيل، ارفع صور، حدد المنصات، وانشر. البوت يتعرف أيضاً على المستخدمين العائدين برقم الهاتف." },
  { q: "ما طرق الدفع المقبولة؟", a: "نقبل جميع بطاقات الخصم والائتمان الرئيسية عبر بوابة دفع Ziina. جميع المعاملات آمنة وتتم بالدرهم الإماراتي." },
  { q: "هل يمكنني استرداد المبلغ؟", a: "يتم التعامل مع طلبات الاسترداد حسب كل حالة. إذا لم يُنشر إعلانك بسبب مشكلة تقنية، تواصل معنا وسنحل الأمر. الإعلانات المُزالة بسبب مخالفة السياسات غير مؤهلة للاسترداد." },
  { q: "كيف أتواصل مع CLASSIFIEDS UAE؟", a: "يمكنك التواصل معنا عبر: موقعنا (classifiedsuae.ae)، البريد الإلكتروني (info@classifiedsuae.ae)، بوت تيليغرام، قناة تيليغرام، فيسبوك، انستقرام، X، قناة واتساب، Threads، أو Threads. زر صفحة التواصل لجميع الروابط.", rich: <>يمكنك التواصل معنا عبر: <a href="https://classifiedsuae.ae" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>موقعنا</a>، <a href="mailto:info@classifiedsuae.ae" style={{ color: "var(--primary)", textDecoration: "underline" }}>البريد الإلكتروني</a>، <a href="https://t.me/classifiedsuae_bot" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>بوت تيليغرام</a>، <a href="https://t.me/classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>قناة تيليغرام</a>، <a href="https://facebook.com/classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>فيسبوك</a>، <a href="https://instagram.com/classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>انستقرام</a>، <a href="https://x.com/clasifiedsuae" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>X</a>، <a href="https://whatsapp.com/channel/0029Vb6jcHdDDmFX0Pp7ej34" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>قناة واتساب</a>، أو <a href="https://www.threads.com/@classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>Threads</a>. زر <a href="/ar/go" style={{ color: "var(--primary)", textDecoration: "underline" }}>صفحة التواصل</a> لجميع الروابط.</> },
  { q: "من يدير CLASSIFIEDS UAE؟", a: "CLASSIFIEDS UAE تُدار من قبل Shiffera.com، شركة متخصصة في تطوير الحلول التقنية المتقدمة مع تركيز على الأتمتة والسرعة وتجربة المستخدم عالية الجودة." },
];

export default async function FAQPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const faqs = isAr ? faqsAr : faqsEn;

  // JSON-LD FAQPage schema for Google rich results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }} dir={isAr ? "rtl" : "ltr"}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12" style={{ textAlign: isAr ? "right" : "left" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "2rem", marginBottom: "0.5rem" }}>
            {isAr ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
            {isAr ? "كل ما تحتاج معرفته عن CLASSIFIEDS UAE" : "Everything you need to know about CLASSIFIEDS UAE"}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {faqs.map((faq, i) => (
            <details key={i} style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
              <summary style={{ padding: "1rem 1.25rem", cursor: "pointer", fontWeight: 700, fontSize: "0.9375rem", color: "var(--text)", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                <span>{faq.q}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"/></svg>
              </summary>
              <div style={{ padding: "0 1.25rem 1.25rem", color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.8 }}>
                {faq.rich ?? faq.a}
              </div>
            </details>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
