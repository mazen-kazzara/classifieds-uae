import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy | CLASSIFIEDS UAE" };

const h2Style = { color: "var(--text)", fontWeight: 700 as const, fontSize: "1.0625rem", marginBottom: "0.625rem", marginTop: "2rem", paddingBottom: "0.375rem", borderBottom: "1px solid var(--border)" };
const h3Style = { color: "var(--text)", fontWeight: 600 as const, fontSize: "0.9375rem", marginBottom: "0.5rem", marginTop: "1rem" };
const pStyle = { marginBottom: "0.875rem" };
const ulStyle = { paddingLeft: "1.5rem", marginBottom: "0.875rem", lineHeight: 2 as const };
const boxStyle = { backgroundColor: "color-mix(in srgb, var(--primary) 8%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--primary) 25%, transparent)", borderRadius: "var(--radius-md)", padding: "1rem 1.25rem", marginBottom: "1rem", fontSize: "0.875rem", fontWeight: 600 as const, color: "var(--text)" };

interface Props { params: Promise<{ locale: string }> }

export default async function PrivacyPage({ params }: Props) {
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
              {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              {isAr ? "CLASSIFIEDS UAE | classifiedsuae.ae" : "CLASSIFIEDS UAE | classifiedsuae.ae"}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              {isAr ? "تاريخ السريان: أبريل 2026 | القانون الحاكم: الإمارات العربية المتحدة" : "Effective Date: April 2026 | Governing Law: United Arab Emirates"}
            </p>
          </div>

          <div style={{ color: "var(--text-muted)", lineHeight: 1.9, fontSize: "0.9375rem" }}>

            <div style={boxStyle}>{isAr
              ? "CLASSIFIEDS UAE ملتزمة بحماية خصوصيتك. نجمع فقط الحد الأدنى من البيانات اللازمة لتشغيل منصتنا ولا نبيع معلوماتك الشخصية لأي طرف ثالث."
              : "CLASSIFIEDS UAE is committed to protecting your privacy. We collect only the minimum data necessary to operate our platform and never sell your personal information to any third party."
            }</div>

            {/* 1 */}
            <h2 style={h2Style}>{isAr ? "1. من نحن" : "1. Who We Are"}</h2>
            <p style={pStyle}>{isAr
              ? 'CLASSIFIEDS UAE ("نحن"، "المنصة") هي منصة إعلانات مبوبة إلكترونية مرخصة وتعمل في الإمارات العربية المتحدة تحت الاسم التجاري CLASSIFIEDS UAE. موقعنا متاح على classifiedsuae.ae.'
              : 'CLASSIFIEDS UAE ("we", "us", "the Platform") is an online classified advertising platform licensed and operating in the United Arab Emirates under the trade name CLASSIFIEDS UAE. Our website is accessible at classifiedsuae.ae.'
            }</p>

            {/* 2 */}
            <h2 style={h2Style}>{isAr ? "2. المعلومات التي نجمعها" : "2. Information We Collect"}</h2>
            <p style={pStyle}>{isAr ? "نجمع فقط البيانات الضرورية لتقديم خدماتنا:" : "We collect only the data necessary to provide our services:"}</p>

            <h3 style={h3Style}>{isAr ? "2.1 البيانات التي تقدمها مباشرةً" : "2.1 Data You Provide Directly"}</h3>
            <ul style={ulStyle}>
              {isAr ? <>
                <li>رقم الهاتف الإماراتي أو البريد الإلكتروني — لتحديد حسابك وتمكين التواصل</li>
                <li>الاسم (اختياري) لعرضه إلى جانب إعلاناتك</li>
                <li>محتوى الإعلان — النص والصور (الحدود تعتمد على الخطة المختارة: من 150 حرفاً وصورة واحدة في الخطة المجانية إلى 1200 حرفاً و6 صور في خطة بريميوم)</li>
                <li>الفئة ومعلومات التسعير الخاصة بالإعلان</li>
                <li>رقم واتساب اختياري إذا كان مختلفاً عن رقم التواصل</li>
                <li>معرّف تيليغرام الاختياري إذا اخترت قناة تيليغرام كوسيلة تواصل</li>
              </> : <>
                <li>UAE phone number or email — used to identify your account and enable contact</li>
                <li>Optional name to display alongside your ads</li>
                <li>Ad content — text and images (limits depend on your selected plan: from 150 chars &amp; 1 image on Free up to 1200 chars &amp; 6 images on Premium)</li>
                <li>Ad category and pricing information</li>
                <li>Optional WhatsApp number if different from your contact number</li>
                <li>Optional Telegram username if you choose Telegram as a contact method</li>
              </>}
            </ul>

            <h3 style={h3Style}>{isAr ? "2.2 البيانات المجمّعة تلقائياً" : "2.2 Data Collected Automatically"}</h3>
            <ul style={ulStyle}>
              {isAr ? <>
                <li>بيانات الاستخدام الأساسية (زيارات الصفحات، مشاهدات الإعلانات) لتحسين المنصة</li>
                <li>نوع الجهاز ومعلومات المتصفح للتوافق التقني</li>
              </> : <>
                <li>Basic usage data (page visits, ad views) for platform improvement</li>
                <li>Device type and browser information for technical compatibility</li>
              </>}
            </ul>
            <p style={pStyle}>{isAr
              ? "لا نجمع: أرقام الهوية الوطنية، عناوين البريد الإلكتروني، العناوين المنزلية، تفاصيل البطاقات المالية، أو أي بيانات بيومترية."
              : "We do NOT collect: national ID numbers, email addresses, home addresses, financial card details, or any biometric data."
            }</p>

            {/* 3 */}
            <h2 style={h2Style}>{isAr ? "3. كيف نستخدم معلوماتك" : "3. How We Use Your Information"}</h2>
            <p style={pStyle}>{isAr ? "تُستخدم معلوماتك حصرياً للأغراض التالية:" : "Your information is used solely for the following purposes:"}</p>
            <ul style={ulStyle}>
              {isAr ? <>
                <li>نشر إعلانك على المنصة وقنوات التواصل الاجتماعي المرتبطة</li>
                <li>تمكين المشترين المحتملين من التواصل معك عبر رقم هاتفك</li>
                <li>معالجة مدفوعاتك عبر بوابة دفع زينة</li>
                <li>إرسال إشعارات متعلقة بالإعلان (النشر، انتهاء الصلاحية، تذكيرات التجديد)</li>
                <li>تحسين أداء المنصة وتجربة المستخدم</li>
                <li>الامتثال للالتزامات القانونية الإماراتية إذا طلبتها السلطات</li>
              </> : <>
                <li>Publishing your ad on the Platform and connected social channels</li>
                <li>Enabling potential buyers to contact you via your provided phone number</li>
                <li>Processing your payment through Ziina payment gateway</li>
                <li>Sending you ad-related notifications (publication, expiry, renewal reminders)</li>
                <li>Improving Platform performance and user experience</li>
                <li>Complying with UAE legal obligations if required by authorities</li>
              </>}
            </ul>

            {/* 4 */}
            <h2 style={h2Style}>{isAr ? "4. مشاركة البيانات مع أطراف ثالثة" : "4. Data Sharing & Third Parties"}</h2>
            <p style={pStyle}>{isAr
              ? "لا نبيع بياناتك الشخصية أو نؤجرها أو نتاجر بها. تُشارَك بياناتك فقط في الحالات المحدودة التالية:"
              : "We do not sell, rent, or trade your personal data. Your data is shared only in the following limited circumstances:"
            }</p>

            <h3 style={h3Style}>{isAr ? "4.1 معالجة المدفوعات" : "4.1 Payment Processing"}</h3>
            <p style={pStyle}>{isAr
              ? "تُشارَك بيانات معاملاتك مع زينة لمعالجة المدفوعات بأمان. تعمل زينة وفق سياسة الخصوصية الخاصة بها واللوائح المالية الإماراتية. لا نخزّن تفاصيل بطاقتك المالية."
              : "Your transaction data is shared with Ziina to process payments securely. Ziina operates under their own Privacy Policy and UAE financial regulations. We do not store your payment card details."
            }</p>

            <h3 style={h3Style}>{isAr ? "4.2 النشر على وسائل التواصل الاجتماعي" : "4.2 Social Media Publishing"}</h3>
            <p style={pStyle}>{isAr
              ? "عند اختيارك نشر إعلانك على قنوات إضافية، يُشارَك محتوى إعلانك (النص والصور) مع المنصات التالية عبر واجهات برمجة التطبيقات الرسمية:"
              : "When you choose to publish your ad beyond the website, your ad content (text and images) is shared with the following platforms via their official APIs:"
            }</p>
            <ul style={ulStyle}>
              {isAr ? <>
                <li>ميتا (فيسبوك وإنستغرام) — للنشر على صفحاتنا الرسمية</li>
                <li>تيليغرام — للنشر على قناتنا الرسمية</li>
                <li>واتساب — للنشر على قناة البث الرسمية</li>
              </> : <>
                <li>Meta Platforms (Facebook & Instagram) — for publication on our official pages</li>
                <li>Telegram — for publication on our official channel</li>
                <li>WhatsApp — for publication on our official broadcast channel</li>
              </>}
            </ul>

            <h3 style={h3Style}>{isAr ? "4.3 الامتثال القانوني" : "4.3 Legal Compliance"}</h3>
            <p style={pStyle}>{isAr
              ? "قد نكشف عن معلوماتك لسلطات الحكومة الإماراتية أو المحاكم أو جهات إنفاذ القانون إذا استلزمه القانون أو أمر المحكمة أو حماية حقوق وسلامة الآخرين."
              : "We may disclose your information to UAE government authorities, courts, or law enforcement agencies if required by law, court order, or to protect the rights and safety of others."
            }</p>

            {/* 5 */}
            <h2 style={h2Style}>{isAr ? "5. الاحتفاظ بالبيانات" : "5. Data Retention"}</h2>
            <ul style={ulStyle}>
              {isAr ? <>
                <li>بيانات الإعلان النشط: تُحتفظ بها طوال مدة الإعلان وحتى 90 يوماً بعد انتهاء صلاحيته</li>
                <li>سجلات المدفوعات: تُحتفظ بها لمدة 5 سنوات وفق اللوائح المالية الإماراتية</li>
                <li>رقم الهاتف: يُحتفظ به طالما لديك حساب نشط أو سجل إعلانات حديث</li>
              </> : <>
                <li>Active ad data: retained for the duration of your ad plus 90 days after expiry</li>
                <li>Payment records: retained for 5 years as required by UAE financial regulations</li>
                <li>Phone number: retained while you have an active account or recent ad history</li>
              </>}
            </ul>

            {/* 6 */}
            <h2 style={h2Style}>{isAr ? "6. أمان البيانات" : "6. Data Security"}</h2>
            <p style={pStyle}>{isAr
              ? "نطبّق تدابير تقنية وتنظيمية مناسبة لحماية بياناتك الشخصية من الوصول غير المصرح به أو التغيير أو الإفصاح أو الإتلاف. ومع ذلك، لا يمكن ضمان الأمان المطلق عبر الإنترنت."
              : "We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. However, no internet transmission is 100% secure, and we cannot guarantee absolute security."
            }</p>

            {/* 7 */}
            <h2 style={h2Style}>{isAr ? "7. حقوقك" : "7. Your Rights"}</h2>
            <p style={pStyle}>{isAr ? "بموجب القانون الإماراتي المعمول به، يحق لك:" : "Under applicable UAE law, you have the right to:"}</p>
            <ul style={ulStyle}>
              {isAr ? <>
                <li>الاطلاع على البيانات الشخصية التي نحتفظ بها عنك</li>
                <li>طلب تصحيح البيانات غير الدقيقة</li>
                <li>طلب حذف بياناتك (مع مراعاة متطلبات الاحتفاظ القانونية)</li>
                <li>سحب موافقتك على معالجة البيانات الاختيارية في أي وقت</li>
              </> : <>
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data (subject to legal retention requirements)</li>
                <li>Withdraw consent for optional data processing at any time</li>
              </>}
            </ul>

            {/* 8 */}
            <h2 style={h2Style}>{isAr ? "8. ملفات تعريف الارتباط والتتبع" : "8. Cookies & Tracking"}</h2>
            <p style={pStyle}>{isAr
              ? "قد يستخدم موقعنا ملفات تعريف ارتباط أساسية للحفاظ على وظائف الجلسة وقياس أداء المنصة. لا نستخدم ملفات تعريف ارتباط إعلانية ولا نبيع بيانات التصفح. يمكنك تعطيل ملفات تعريف الارتباط في إعدادات متصفحك، وإن كان ذلك قد يؤثر على بعض وظائف المنصة."
              : "Our website may use basic cookies to maintain session functionality and measure platform performance. We do not use advertising tracking cookies or sell browsing data. You can disable cookies in your browser settings, though this may affect Platform functionality."
            }</p>

            {/* 9 */}
            <h2 style={h2Style}>{isAr ? "9. التواصل وشكاوى الخصوصية" : "9. Contact & Privacy Concerns"}</h2>
            <p style={pStyle}>{isAr
              ? "لأي استفسارات تتعلق بالخصوصية أو طلبات الوصول إلى البيانات أو الشكاوى، تواصل معنا عبر:"
              : "For any privacy-related questions, data access requests, or complaints, contact us via:"
            }</p>
            <ul style={ulStyle}>
              {isAr ? <>
                <li>الموقع: <a href="https://classifiedsuae.ae" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>classifiedsuae.ae</a></li>
                <li>البريد الإلكتروني: <a href="mailto:info@classifiedsuae.ae" style={{ color: "var(--primary)", textDecoration: "none" }}>info@classifiedsuae.ae</a></li>
                <li>فيسبوك: <a href="https://facebook.com/classifiedsuaeofficial" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>classifiedsuaeofficial</a></li>
                <li>إنستغرام: <a href="https://instagram.com/classifiedsuaeofficial" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>classifiedsuaeofficial</a></li>
                <li>تيليغرام: <a href="https://t.me/classifiedsuaeofficial" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>القناة الرسمية</a></li>
                <li>واتساب: <a href="https://whatsapp.com/channel/0029Vb6jcHdDDmFX0Pp7ej34" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>القناة الرسمية</a></li>
              </> : <>
                <li>Website: <a href="https://classifiedsuae.ae" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>classifiedsuae.ae</a></li>
                <li>Email: <a href="mailto:info@classifiedsuae.ae" style={{ color: "var(--primary)", textDecoration: "none" }}>info@classifiedsuae.ae</a></li>
                <li>Facebook: <a href="https://facebook.com/classifiedsuaeofficial" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>classifiedsuaeofficial</a></li>
                <li>Instagram: <a href="https://instagram.com/classifiedsuaeofficial" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>classifiedsuaeofficial</a></li>
                <li>Telegram: <a href="https://t.me/classifiedsuaeofficial" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>Official Channel</a></li>
                <li>WhatsApp: <a href="https://whatsapp.com/channel/0029Vb6jcHdDDmFX0Pp7ej34" target="_blank" style={{ color: "var(--primary)", textDecoration: "none" }}>Official Channel</a></li>
              </>}
            </ul>
            <p style={pStyle}>{isAr
              ? "نهدف إلى الرد على جميع استفسارات الخصوصية خلال 5 أيام عمل."
              : "We aim to respond to all privacy inquiries within 5 business days."
            }</p>

            {/* 10 */}
            <h2 style={h2Style}>{isAr ? "10. تحديثات هذه السياسة" : "10. Updates to This Policy"}</h2>
            <p style={pStyle}>{isAr
              ? "قد نحدّث سياسة الخصوصية هذه من وقت لآخر لتعكس التغييرات في ممارساتنا أو في القانون الإماراتي. ستُنشر السياسة المحدّثة على موقعنا بتاريخ سريان مراجَع. يعني الاستمرار في استخدام المنصة بعد التحديثات قبولك للسياسة المراجَعة."
              : "We may update this Privacy Policy from time to time to reflect changes in our practices or UAE law. The updated policy will be posted on our website with a revised effective date. Continued use of the Platform after updates constitutes your acceptance of the revised policy."
            }</p>

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
