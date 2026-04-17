import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getTranslations } from "@/lib/getTranslations";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service | CLASSIFIEDS UAE" };

const h2Style = { color: "var(--text)", fontWeight: 700 as const, fontSize: "1.0625rem", marginBottom: "0.625rem", marginTop: "2rem", paddingBottom: "0.375rem", borderBottom: "1px solid var(--border)" };
const pStyle = { marginBottom: "0.875rem" };
const ulStyle = { paddingLeft: "1.5rem", marginBottom: "0.875rem", lineHeight: 2 as const };
const boxStyle = { backgroundColor: "color-mix(in srgb, var(--primary) 8%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--primary) 25%, transparent)", borderRadius: "var(--radius-md)", padding: "1rem 1.25rem", marginBottom: "1rem", fontSize: "0.875rem", fontWeight: 600 as const, color: "var(--text)" };
const warningStyle = { backgroundColor: "color-mix(in srgb, var(--danger) 8%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--danger) 25%, transparent)", borderRadius: "var(--radius-md)", padding: "1rem 1.25rem", marginBottom: "1rem", fontSize: "0.875rem", fontWeight: 600 as const, color: "var(--danger)" };

interface Props { params: Promise<{ locale: string }> }

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === "ar";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }} dir={isAr ? "rtl" : "ltr"}>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "2.5rem" }} className="shadow-card">

          {/* Header */}
          <div style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "2px solid var(--border)" }}>
            <h1 style={{ color: "var(--text)", fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>
              {isAr ? "شروط الخدمة" : "Terms of Service"}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              {isAr ? "CLASSIFIEDS UAE | classifiedsuae.ae" : "CLASSIFIEDS UAE | classifiedsuae.ae"}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              {isAr ? "تاريخ السريان: أبريل 2026 | القانون الحاكم: الإمارات العربية المتحدة" : "Effective Date: April 2026 | Governing Law: United Arab Emirates"}
            </p>
          </div>

          <div style={{ color: "var(--text-muted)", lineHeight: 1.9, fontSize: "0.9375rem" }}>

            {/* 1 */}
            <h2 style={h2Style}>{isAr ? "1. قبول الشروط" : "1. Acceptance of Terms"}</h2>
            <p style={pStyle}>{isAr
              ? 'بالوصول إلى منصة "CLASSIFIEDS UAE" أو استخدامها، بما في ذلك موقع classifiedsuae.ae وقنوات الواتساب والتيليغرام، فإنك تؤكد أنك قرأت هذه الشروط وفهمتها وتوافق على الالتزام بها قانونياً. إذا كنت لا توافق على أي جزء من هذه الشروط، يجب عليك التوقف فوراً عن استخدام المنصة.'
              : 'By accessing or using CLASSIFIEDS UAE (the "Platform"), including through our website at classifiedsuae.ae, WhatsApp, or Telegram channels, you confirm that you have read, understood, and agree to be legally bound by these Terms of Service. If you do not agree to any part of these Terms, you must immediately stop using the Platform.'
            }</p>
            <p style={pStyle}>{isAr
              ? "تسري هذه الشروط على جميع المستخدمين والمعلنين والزوار للمنصة بغض النظر عن طريقة الوصول."
              : "These Terms apply to all users, advertisers, and visitors of the Platform regardless of the method of access."
            }</p>

            {/* 2 */}
            <h2 style={h2Style}>{isAr ? "2. وصف المنصة" : "2. Platform Description"}</h2>
            <p style={pStyle}>{isAr
              ? "CLASSIFIEDS UAE هي منصة إعلانات مبوبة إلكترونية تخدم الإمارات العربية المتحدة، تتيح للمستخدمين نشر إعلانات للمنتجات والخدمات والعروض. قد تُنشر الإعلانات عبر القنوات التالية:"
              : "CLASSIFIEDS UAE is an online classified advertising platform serving the United Arab Emirates. It allows users to post ads for products, services, and offers. Ads may be published across the following channels:"
            }</p>
            <ul style={ulStyle}>
              {isAr ? <>
                <li><a href="https://classifiedsuae.ae" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>موقع CLASSIFIEDS UAE (classifiedsuae.ae)</a></li>
                <li><a href="https://facebook.com/classifiedsuaeofficial" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>صفحة فيسبوك الرسمية لCLASSIFIEDS UAE</a></li>
                <li><a href="https://instagram.com/classifiedsuaeofficial" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>حساب إنستغرام الرسمي لCLASSIFIEDS UAE</a></li>
                <li><a href="https://whatsapp.com/channel/0029Vb6jcHdDDmFX0Pp7ej34" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>قناة واتساب الرسمية لCLASSIFIEDS UAE</a></li>
                <li><a href="https://t.me/classifiedsuaeofficial" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>قناة تيليغرام الرسمية لCLASSIFIEDS UAE</a></li>
              </> : <>
                <li><a href="https://classifiedsuae.ae" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>CLASSIFIEDS UAE website (classifiedsuae.ae)</a></li>
                <li><a href="https://facebook.com/classifiedsuaeofficial" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>Official CLASSIFIEDS UAE Facebook Page</a></li>
                <li><a href="https://instagram.com/classifiedsuaeofficial" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>Official CLASSIFIEDS UAE Instagram Account</a></li>
                <li><a href="https://whatsapp.com/channel/0029Vb6jcHdDDmFX0Pp7ej34" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>Official CLASSIFIEDS UAE WhatsApp Channel</a></li>
                <li><a href="https://t.me/classifiedsuaeofficial" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>Official CLASSIFIEDS UAE Telegram Channel</a></li>
              </>}
            </ul>

            {/* 3 */}
            <h2 style={h2Style}>{isAr ? "3. إخلاء المسؤولية — دور المنصة" : "3. Disclaimer of Liability — Platform Role"}</h2>
            <div style={boxStyle}>{isAr
              ? "هام: CLASSIFIEDS UAE هي منصة إعلانية محايدة فقط. لا نقوم بإنشاء أو التحقق أو تأييد أو تحمّل أي مسؤولية عن أي محتوى ينشئه المستخدمون. يتحمل المعلن وحده المسؤولية القانونية الكاملة عن محتوى إعلانه ودقته وقانونيته."
              : "IMPORTANT: CLASSIFIEDS UAE is a neutral advertising platform only. We do not create, verify, endorse, or take responsibility for any user-generated content. The advertiser bears sole and full legal responsibility for the content, accuracy, and legality of their ad."
            }</div>
            <p style={pStyle}>{isAr ? "تخلي CLASSIFIEDS UAE صراحةً مسؤوليتها عن:" : "CLASSIFIEDS UAE expressly disclaims all liability for:"}</p>
            <ul style={ulStyle}>
              {isAr ? <>
                <li>أي محتوى إعلاني يخالف قوانين الإمارات الاتحادية أو المحلية</li>
                <li>الإعلانات الكاذبة أو المضللة أو الاحتيالية</li>
                <li>المعاملات أو النزاعات أو الاتفاقيات بين المشترين والبائعين</li>
                <li>أي خسارة أو ضرر ناجم عن الاعتماد على محتوى الإعلان</li>
                <li>جودة أو سلامة أو قانونية أي منتج أو خدمة معلنة</li>
              </> : <>
                <li>Any ad content that violates UAE federal or local laws, regulations, or decrees</li>
                <li>False, misleading, or fraudulent advertisements</li>
                <li>Transactions, disputes, or agreements between buyers and sellers</li>
                <li>Any loss, damage, or harm arising from reliance on ad content</li>
                <li>The quality, safety, or legality of any product or service advertised</li>
              </>}
            </ul>

            {/* 4 */}
            <h2 style={h2Style}>{isAr ? "4. المحتوى المحظور" : "4. Prohibited Content"}</h2>
            <p style={pStyle}>{isAr
              ? "امتثالاً لقوانين الإمارات العربية المتحدة، يُحظر تماماً نشر المحتوى التالي على المنصة:"
              : "In compliance with the laws of the United Arab Emirates, the following content is strictly prohibited on the Platform:"
            }</p>
            <h3 style={{ color: "var(--text)", fontWeight: 600, marginBottom: "0.5rem", marginTop: "1rem", fontSize: "0.9375rem" }}>
              {isAr ? "4.1 انتهاكات القانون الإماراتي" : "4.1 UAE Law Violations"}
            </h3>
            <ul style={ulStyle}>
              {isAr ? <>
                <li>أي محتوى يسيء أو يسخر أو يحتقر الإسلام أو أي دين آخر</li>
                <li>أي محتوى يسيء إلى الأسر الحاكمة أو الحكومة أو الرموز الوطنية الإماراتية</li>
                <li>المحتوى الذي يهدد الوحدة الوطنية أو النظام العام أو السلم الاجتماعي</li>
                <li>المحتوى الذي ينتهك قانون مكافحة الجرائم المعلوماتية الإماراتي رقم 34 لعام 2021</li>
              </> : <>
                <li>Any content that insults, mocks, or disrespects Islam or any other religion</li>
                <li>Any content that disrespects the UAE&apos;s ruling families, government, or national symbols</li>
                <li>Content that threatens national unity, public order, or social peace</li>
                <li>Content that violates UAE Cybercrime Law No. 34 of 2021</li>
              </>}
            </ul>
            <h3 style={{ color: "var(--text)", fontWeight: 600, marginBottom: "0.5rem", marginTop: "1rem", fontSize: "0.9375rem" }}>
              {isAr ? "4.2 المحتوى المحظور العام" : "4.2 General Prohibited Content"}
            </h3>
            <ul style={ulStyle}>
              {isAr ? <>
                <li>المحتوى الجنسي أو الإباحي أو المحتوى للبالغين بأي شكل</li>
                <li>القمار أو الرهانات أو خدمات اليانصيب</li>
                <li>بيع الكحول أو التبغ أو المواد الخاضعة للرقابة</li>
                <li>الأسلحة أو الذخائر أو المتفجرات</li>
                <li>البضائع المقلدة أو المقرصنة أو المسروقة</li>
                <li>الحملات السياسية أو الدعاية</li>
                <li>مخططات التحريم أو الاستثمارات الاحتيالية أو عمليات النصب</li>
                <li>الخدمات المقدمة دون ترخيص إماراتي ساري المفعول حيث يُشترط ذلك</li>
                <li>أي محتوى يستهدف القاصرين بطريقة غير لائقة</li>
              </> : <>
                <li>Sexual, pornographic, or adult content of any kind</li>
                <li>Gambling, betting, or lottery services</li>
                <li>Alcohol, tobacco, or controlled substance sales</li>
                <li>Weapons, ammunition, or explosives</li>
                <li>Counterfeit, pirated, or stolen goods</li>
                <li>Political campaigns or propaganda</li>
                <li>Pyramid schemes, fraudulent investments, or scams</li>
                <li>Services offered without a valid UAE license where required</li>
                <li>Any content targeting minors inappropriately</li>
              </>}
            </ul>
            <div style={warningStyle}>{isAr
              ? "تتحمل CLASSIFIEDS UAE صفر مسؤولية قانونية عن أي محتوى محظور ينشره المستخدمون. المعلن وحده يخضع للتبعات القانونية الإماراتية عن المخالفات."
              : "CLASSIFIEDS UAE bears zero legal responsibility for any prohibited content posted by users. The advertiser alone is subject to UAE legal consequences for violations."
            }</div>

            {/* 5 */}
            <h2 style={h2Style}>{isAr ? "5. مسؤوليات المعلن" : "5. Advertiser Responsibilities"}</h2>
            <p style={pStyle}>{isAr ? "بنشر إعلان، فإنك تؤكد وتضمن قانونياً أنك:" : "By posting an ad, you confirm and legally warrant that:"}</p>
            <ul style={ulStyle}>
              {isAr ? <>
                <li>لا يقل عمرك عن 18 عاماً</li>
                <li>مخوّل قانونياً ببيع أو تقديم المنتج أو الخدمة المعلن عنها في الإمارات</li>
                <li>جميع المعلومات في إعلانك دقيقة وصادقة وغير مضللة</li>
                <li>إعلانك لا ينتهك حقوق الملكية الفكرية لأي طرف ثالث</li>
                <li>حصلت على جميع التراخيص أو التصاريح اللازمة حيث يتطلبها القانون الإماراتي</li>
                <li>تقبل المسؤولية القانونية الكاملة عن أي تبعات ناجمة عن إعلانك</li>
              </> : <>
                <li>You are at least 18 years of age</li>
                <li>You are legally authorized to sell or offer the advertised product or service in the UAE</li>
                <li>All information in your ad is accurate, truthful, and not misleading</li>
                <li>Your ad does not infringe any third-party intellectual property rights</li>
                <li>You have obtained all necessary licenses or permits where required by UAE law</li>
                <li>You accept full legal liability for any consequences arising from your ad</li>
              </>}
            </ul>

            {/* 6 */}
            <h2 style={h2Style}>{isAr ? "6. خطط الإعلان والمدة" : "6. Advertising Plans & Duration"}</h2>
            <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--surface-2)", color: "var(--text)", fontWeight: 700 }}>
                    {isAr
                      ? <><th style={{ padding: "0.75rem", border: "1px solid var(--border)", textAlign: "right" }}>الخطة</th><th style={{ padding: "0.75rem", border: "1px solid var(--border)", textAlign: "right" }}>السعر</th><th style={{ padding: "0.75rem", border: "1px solid var(--border)", textAlign: "right" }}>المدة</th><th style={{ padding: "0.75rem", border: "1px solid var(--border)", textAlign: "right" }}>يشمل</th></>
                      : <><th style={{ padding: "0.75rem", border: "1px solid var(--border)", textAlign: "left" }}>Plan</th><th style={{ padding: "0.75rem", border: "1px solid var(--border)", textAlign: "left" }}>Price</th><th style={{ padding: "0.75rem", border: "1px solid var(--border)", textAlign: "left" }}>Duration</th><th style={{ padding: "0.75rem", border: "1px solid var(--border)", textAlign: "left" }}>Includes</th></>
                    }
                  </tr>
                </thead>
                <tbody>
                  {isAr ? <>
                    <tr><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>مجاني</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>0 د.إ</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>3 أيام</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>150 حرف، صورة واحدة</td></tr>
                    <tr style={{ backgroundColor: "var(--surface-2)" }}><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>أساسي</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>5 د.إ</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>7 أيام</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>400 حرف، صورتين</td></tr>
                    <tr><td style={{ padding: "0.75rem", border: "1px solid var(--border)", fontWeight: 700 }}>🇦🇪 علم الإمارات</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)", fontWeight: 700, color: "#D4AF37" }}>مجاني حتى 1 مايو</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>14 يوماً</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>800 حرف، 4 صور (عرض الإطلاق)</td></tr>
                    <tr style={{ backgroundColor: "var(--surface-2)" }}><td style={{ padding: "0.75rem", border: "1px solid var(--border)", fontWeight: 700, color: "var(--text)" }}>قياسي</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)", fontWeight: 700, color: "var(--primary)" }}>9 د.إ</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>14 يوماً</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>800 حرف، 4 صور (الأفضل قيمة)</td></tr>
                    <tr><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>بريميوم</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>15 د.إ</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>30 يوماً</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>1200 حرف، 6 صور</td></tr>
                  </> : <>
                    <tr><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>Free</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>0 AED</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>3 days</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>150 chars, 1 image</td></tr>
                    <tr style={{ backgroundColor: "var(--surface-2)" }}><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>Basic</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>5 AED</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>7 days</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>400 chars, 2 images</td></tr>
                    <tr><td style={{ padding: "0.75rem", border: "1px solid var(--border)", fontWeight: 700 }}>🇦🇪 UAE Flag</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)", fontWeight: 700, color: "#D4AF37" }}>FREE until May 1st</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>14 days</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>800 chars, 4 images (Launch Offer)</td></tr>
                    <tr style={{ backgroundColor: "var(--surface-2)" }}><td style={{ padding: "0.75rem", border: "1px solid var(--border)", fontWeight: 700, color: "var(--text)" }}>Standard</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)", fontWeight: 700, color: "var(--primary)" }}>9 AED</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>14 days</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>800 chars, 4 images (Best Value)</td></tr>
                    <tr><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>Premium</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>15 AED</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>30 days</td><td style={{ padding: "0.75rem", border: "1px solid var(--border)" }}>1200 chars, 6 images</td></tr>
                  </>}
                </tbody>
              </table>
            </div>
            <p style={pStyle}>{isAr
              ? "عند انتهاء صلاحية الإعلان، يُخفى تلقائياً من نتائج البحث العامة وصفحات الفئات، ويُحذف من القنوات الاجتماعية. ومع ذلك، يبقى الإعلان محفوظاً في حسابك ضمن صفحة «إعلاناتي»، ويمكنك إعادة نشره في أي وقت."
              : "When an ad expires, it is automatically hidden from public search results and category pages, and deleted from our social channels. However, the ad remains saved in your 'My Ads' dashboard, and you can republish it at any time."
            }</p>
            <p style={pStyle}>{isAr
              ? "إعادة النشر: يمكن إعادة نشر الإعلانات المنتهية بنصف سعر الخطة الأصلية. إذا كانت الخطة الأصلية مجانية، فسعر إعادة النشر هو 50% من أرخص خطة مدفوعة (أساسي). يتم حساب السعر بواسطة الخادم وعرضه عليك قبل التأكيد."
              : "Republish: expired ads can be republished at HALF the original plan price. If the original plan was Free, the republish price is 50% of the cheapest paid plan (Basic). The price is calculated server-side and shown to you before confirmation."
            }</p>

            {/* 7 */}
            <h2 style={h2Style}>{isAr ? "7. المدفوعات وسياسة الاسترداد" : "7. Payments & Refund Policy"}</h2>
            <ul style={ulStyle}>
              {isAr ? <>
                <li>تُعالج جميع المدفوعات بأمان عبر بوابة دفع زينة.</li>
                <li>تُحصّل جميع الرسوم بالدرهم الإماراتي.</li>
                <li>رسوم الخطط المدفوعة غير قابلة للاسترداد بعد نشر الإعلان على المنصة.</li>
                <li>في حالة حدوث خطأ تقني يمنع النشر، سيُقدَّم استرداد كامل أو إعادة نشر وفق تفضيل المعلن.</li>
                <li>تحتفظ CLASSIFIEDS UAE بالحق في إزالة إعلان مدفوع دون استرداد إذا انتهك هذه الشروط.</li>
              </> : <>
                <li>All payments are processed securely through Ziina payment gateway.</li>
                <li>All fees are charged in UAE Dirhams (AED).</li>
                <li>All paid plan fees are non-refundable once the ad has been published on the Platform.</li>
                <li>If a technical error prevents publication, a full refund or re-publication will be offered at the advertiser&apos;s discretion.</li>
                <li>CLASSIFIEDS UAE reserves the right to remove a paid ad without refund if it violates these Terms.</li>
              </>}
            </ul>

            {/* 8 */}
            <h2 style={h2Style}>{isAr ? "8. حقوق المنصة وإزالة المحتوى" : "8. Platform Rights & Content Removal"}</h2>
            <p style={pStyle}>{isAr
              ? "تحتفظ CLASSIFIEDS UAE بالحق، وفق تقديرها المطلق ودون إشعار مسبق، في:"
              : "CLASSIFIEDS UAE reserves the right, at its sole discretion and without prior notice, to:"
            }</p>
            <ul style={ulStyle}>
              {isAr ? <>
                <li>إزالة أي إعلان ينتهك هذه الشروط أو القانون الإماراتي</li>
                <li>تعليق أو حظر أي مستخدم يخالف هذه الشروط بشكل متكرر بشكل دائم</li>
                <li>تعديل تنسيق الإعلان لأغراض العرض دون تغيير المحتوى الجوهري</li>
                <li>تعديل أو تحديث هذه الشروط في أي وقت — يعني الاستمرار في الاستخدام القبول بها</li>
              </> : <>
                <li>Remove any ad that violates these Terms or UAE law</li>
                <li>Suspend or permanently ban any user who repeatedly violates these Terms</li>
                <li>Edit ad formatting for display purposes without altering the core content</li>
                <li>Modify or update these Terms at any time — continued use constitutes acceptance</li>
              </>}
            </ul>

            {/* 9 */}
            <h2 style={h2Style}>{isAr ? "9. تحديد المسؤولية" : "9. Limitation of Liability"}</h2>
            <div style={warningStyle}>{isAr
              ? "الحد الأقصى للمسؤولية: لن تتجاوز المسؤولية الإجمالية لCLASSIFIEDS UAE تجاه أي مستخدم، بصرف النظر عن سبب الدعوى، 500 درهم إماراتي (خمسمائة درهم). باستخدام هذه المنصة، فإنك تتنازل صراحةً وبشكل لا رجعة فيه عن أي حق في المطالبة بتعويضات تتجاوز هذا المبلغ من CLASSIFIEDS UAE أو مالكيها أو موظفيها أو وكلائها."
              : "MAXIMUM LIABILITY CAP: In no event shall CLASSIFIEDS UAE's total liability to any user exceed AED 500 (Five Hundred UAE Dirhams). By using this Platform, you expressly and irrevocably waive any right to claim damages beyond this amount from CLASSIFIEDS UAE, its owners, employees, or agents."
            }</div>

            {/* 10 */}
            <h2 style={h2Style}>{isAr ? "10. القانون الحاكم والاختصاص القضائي" : "10. Governing Law & Jurisdiction"}</h2>
            <p style={pStyle}>{isAr
              ? "تخضع شروط الخدمة هذه حصرياً لقوانين الإمارات العربية المتحدة. يخضع أي نزاع ناشئ عن استخدام هذه المنصة للاختصاص القضائي الحصري لمحاكم إمارة دبي، الإمارات العربية المتحدة."
              : "These Terms of Service are governed exclusively by the laws of the United Arab Emirates. Any dispute arising from the use of this Platform shall be subject to the exclusive jurisdiction of the courts of the Emirate of Dubai, UAE."
            }</p>

            {/* 11 */}
            <h2 style={h2Style}>{isAr ? "11. التواصل معنا" : "11. Contact"}</h2>
            <ul style={ulStyle}>
              {isAr ? <>
                <li>{isAr ? "الموقع" : "Website"}: <a href="https://classifiedsuae.ae" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>classifiedsuae.ae</a></li>
                <li>{isAr ? "البريد الإلكتروني" : "Email"}: <a href="mailto:info@classifiedsuae.ae" style={{ color: "var(--primary)", textDecoration: "none" }}>info@classifiedsuae.ae</a></li>
                <li>{isAr ? "فيسبوك" : "Facebook"}: <a href="https://facebook.com/classifiedsuaeofficial" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>classifiedsuaeofficial</a></li>
                <li>{isAr ? "إنستغرام" : "Instagram"}: <a href="https://instagram.com/classifiedsuaeofficial" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>classifiedsuaeofficial</a></li>
                <li>{isAr ? "تيليغرام" : "Telegram"}: <a href="https://t.me/classifiedsuaeofficial" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>{isAr ? "القناة الرسمية" : "Official Channel"}</a></li>
                <li>{isAr ? "واتساب" : "WhatsApp"}: <a href="https://whatsapp.com/channel/0029Vb6jcHdDDmFX0Pp7ej34" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>{isAr ? "القناة الرسمية" : "Official Channel"}</a></li>
              </> : <>
                <li>Website: <a href="https://classifiedsuae.ae" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>classifiedsuae.ae</a></li>
                <li>Email: <a href="mailto:info@classifiedsuae.ae" style={{ color: "var(--primary)", textDecoration: "none" }}>info@classifiedsuae.ae</a></li>
                <li>Facebook: <a href="https://facebook.com/classifiedsuaeofficial" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>classifiedsuaeofficial</a></li>
                <li>Instagram: <a href="https://instagram.com/classifiedsuaeofficial" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>classifiedsuaeofficial</a></li>
                <li>Telegram: <a href="https://t.me/classifiedsuaeofficial" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>Official Channel</a></li>
                <li>WhatsApp: <a href="https://whatsapp.com/channel/0029Vb6jcHdDDmFX0Pp7ej34" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>Official Channel</a></li>
              </>}
            </ul>

          </div>

          <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
            <Link href="/" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}>
              {isAr ? "→ العودة إلى الرئيسية" : "← Back to Home"}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
