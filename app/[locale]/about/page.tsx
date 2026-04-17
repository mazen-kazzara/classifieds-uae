export const dynamic = "force-dynamic";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "About Us | CLASSIFIEDS UAE", description: "Learn about CLASSIFIEDS UAE — UAE's fastest classified ads platform." };

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === "ar";

  const sectionTitle: React.CSSProperties = { color: "var(--text)", fontWeight: 800, fontSize: "1.25rem", marginBottom: "0.75rem", marginTop: "2rem" };
  const paragraph: React.CSSProperties = { color: "var(--text-muted)", fontSize: "0.9375rem", lineHeight: 1.8, marginBottom: "1rem" };
  const listStyle: React.CSSProperties = { color: "var(--text-muted)", fontSize: "0.9375rem", lineHeight: 2, paddingInlineStart: "1.25rem", marginBottom: "1rem" };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }} dir={isAr ? "rtl" : "ltr"}>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12" style={{ textAlign: isAr ? "right" : "left" }}>
        <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "2.5rem" }}>

          <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.75rem", marginBottom: "1.25rem" }}>
            {isAr ? "من نحن" : "About Us"}
          </h1>

          {isAr ? (
            <>
              <p style={paragraph}>
                CLASSIFIEDS UAE هي منصة إعلانات مبوبة رقمية مخصصة لدولة الإمارات العربية المتحدة، تتيح للأفراد والشركات نشر إعلاناتهم بسهولة وسرعة والوصول إلى جمهور واسع في جميع أنحاء الدولة.
              </p>
              <p style={paragraph}>
                تم تصميم المنصة لتكون بسيطة، سريعة، وفعالة، بحيث يمكن لأي مستخدم نشر إعلان خلال أقل من دقيقة، بدون تعقيد أو خطوات غير ضرورية.
              </p>

              <h2 style={sectionTitle}>رؤيتنا</h2>
              <p style={paragraph}>
                أن نصبح المنصة الأولى للإعلانات المبوبة في الإمارات، من خلال تقديم تجربة استخدام سهلة، سريعة، وآمنة، تعتمد على الأتمتة الكاملة وتقليل التدخل البشري.
              </p>

              <h2 style={sectionTitle}>رسالتنا</h2>
              <p style={paragraph}>
                تمكين المستخدمين من عرض وبيع منتجاتهم وخدماتهم بطريقة مباشرة وفعالة، مع تقليل التكاليف والوقت، وتوفير وصول حقيقي إلى المهتمين.
              </p>

              <h2 style={sectionTitle}>ماذا نقدم</h2>
              <ul style={listStyle}>
                <li>نشر إعلانات بسرعة فائقة</li>
                <li>وصول واسع داخل جميع إمارات الدولة</li>
                <li>نظام تسعير واضح وشفاف</li>
                <li>دعم النشر عبر منصات متعددة (الموقع + وسائل التواصل)</li>
                <li>تجربة استخدام مبسطة بدون تعقيد</li>
              </ul>

              <h2 style={sectionTitle}>الفئات المتاحة (15 فئة)</h2>
              <ul style={listStyle}>
                <li>سيارات</li>
                <li>عقارات</li>
                <li>وظائف</li>
                <li>خدمات</li>
                <li>موبايلات</li>
                <li>إلكترونيات</li>
                <li>كمبيوتر وألعاب</li>
                <li>أثاث</li>
                <li>ملابس وأزياء</li>
                <li>تعليم وتدريب</li>
                <li>صالونات وتجميل</li>
                <li>عيادات</li>
                <li>حيوانات أليفة</li>
                <li>معدات وأدوات</li>
                <li>أخرى</li>
              </ul>

              <h2 style={sectionTitle}>الخطط والأسعار</h2>
              <ul style={listStyle}>
                <li><strong>مجاني</strong> — 0 د.إ · 150 حرف · صورة واحدة · 3 أيام</li>
                <li><strong>أساسي</strong> — 5 د.إ · 400 حرف · صورتين · 7 أيام</li>
                <li><strong>🇦🇪 علم الإمارات</strong> — مجاني حتى 1 مايو (عرض الإطلاق) · 800 حرف · 4 صور · 14 يوماً</li>
                <li><strong>قياسي (الأفضل قيمة)</strong> — 9 د.إ · 800 حرف · 4 صور · 14 يوماً</li>
                <li><strong>بريميوم</strong> — 15 د.إ · 1200 حرف · 6 صور · 30 يوماً</li>
              </ul>

              <h2 style={sectionTitle}>قنوات النشر</h2>
              <p style={paragraph}>بنقرة واحدة يصل إعلانك إلى:</p>
              <ul style={listStyle}>
                <li>🌐 الموقع الرسمي</li>
                <li>📘 صفحة فيسبوك</li>
                <li>📷 انستقرام</li>
                <li>📱 قناة تيليغرام</li>
                <li>✖️ X (تويتر)</li>
                <li>🧵 Threads (متابعة فقط)</li>
              </ul>

              <h2 style={sectionTitle}>طريقتان للنشر</h2>
              <ul style={listStyle}>
                <li>🌐 عبر الموقع الإلكتروني</li>
                <li>🤖 عبر بوت تيليغرام <a href="https://t.me/classifiedsuae_bot" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontWeight: 600 }}>@classifiedsuae_bot</a></li>
              </ul>

              <h2 style={sectionTitle}>لماذا نحن مختلفون</h2>
              <ul style={listStyle}>
                <li>نظام نشر مؤتمت بالكامل</li>
                <li>إعلان واحد يُنشر على 5 منصات في نفس الوقت</li>
                <li>إمكانية النشر عبر تيليغرام أو الموقع</li>
                <li>إعادة نشر الإعلانات المنتهية بنصف السعر</li>
                <li>تواصل مباشر مع المشترين عبر واتساب، اتصال، أو تيليغرام</li>
                <li>دفع آمن عبر Ziina</li>
                <li>تركيز على السرعة والنتائج</li>
              </ul>

              <h2 style={sectionTitle}>التزامنا</h2>
              <p style={paragraph}>
                نحن في CLASSIFIEDS UAE نوفر منصة للنشر فقط، ولا نتحمل مسؤولية المحتوى الذي يتم نشره من قبل المستخدمين. تقع المسؤولية الكاملة على الناشر، مع التزامنا باتخاذ الإجراءات اللازمة في حال وجود مخالفات أو طلبات رسمية من الجهات المختصة.
              </p>

              <h2 style={sectionTitle}>تواصل معنا</h2>
              <div style={{ ...paragraph, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span>🌐 الموقع: <a href="https://classifiedsuae.ae" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>classifiedsuae.ae</a></span>
                <span>📧 البريد الإلكتروني: <a href="mailto:info@classifiedsuae.ae" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>info@classifiedsuae.ae</a></span>
                <span>🤖 بوت تيليغرام: <a href="https://t.me/classifiedsuae_bot" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>@classifiedsuae_bot</a></span>
                <span>📱 قناة تيليغرام: <a href="https://t.me/classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>@classifiedsuaeofficial</a></span>
                <span>📘 فيسبوك: <a href="https://facebook.com/classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>classifiedsuaeofficial</a></span>
                <span>📷 انستقرام: <a href="https://instagram.com/classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>@classifiedsuaeofficial</a></span>
                <span>✖️ X (تويتر): <a href="https://x.com/clasifiedsuae" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>@clasifiedsuae</a></span>
                <span>💬 واتساب: <a href="https://whatsapp.com/channel/0029Vb6jcHdDDmFX0Pp7ej34" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>القناة الرسمية</a></span>
                <span>🧵 Threads: <a href="https://www.threads.com/@classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>@classifiedsuaeofficial</a></span>
              </div>

              <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "var(--surface-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", lineHeight: 1.7 }}>
                  المنصة مدارة من قبل <a href="https://shiffera.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>Shiffera.com</a>، شركة متخصصة في تطوير الحلول التقنية المتقدمة، مع تركيز على الأتمتة، السرعة، وتجربة المستخدم عالية الجودة.
                </p>
              </div>
            </>
          ) : (
            <>
              <p style={paragraph}>
                CLASSIFIEDS UAE is a digital classified ads platform built for the United Arab Emirates, enabling individuals and businesses to post ads quickly and reach a wide audience across all emirates.
              </p>
              <p style={paragraph}>
                The platform is designed to be simple, fast, and effective — any user can post an ad in under a minute, without complexity or unnecessary steps.
              </p>

              <h2 style={sectionTitle}>Our Vision</h2>
              <p style={paragraph}>
                To become the leading classified ads platform in the UAE by delivering an easy, fast, and secure user experience powered by full automation and minimal human intervention.
              </p>

              <h2 style={sectionTitle}>Our Mission</h2>
              <p style={paragraph}>
                To empower users to showcase and sell their products and services directly and effectively, while reducing costs and time, and providing real reach to interested buyers.
              </p>

              <h2 style={sectionTitle}>What We Offer</h2>
              <ul style={listStyle}>
                <li>Ultra-fast ad posting</li>
                <li>Wide reach across all UAE emirates</li>
                <li>Clear and transparent pricing</li>
                <li>Multi-platform publishing (website + social media)</li>
                <li>Simple user experience without complexity</li>
              </ul>

              <h2 style={sectionTitle}>Available Categories (15 categories)</h2>
              <ul style={listStyle}>
                <li>Cars</li>
                <li>Real Estate</li>
                <li>Jobs</li>
                <li>Services</li>
                <li>Mobiles</li>
                <li>Electronics</li>
                <li>Computers &amp; Games</li>
                <li>Furniture</li>
                <li>Fashion &amp; Clothing</li>
                <li>Education &amp; Training</li>
                <li>Salons &amp; Beauty</li>
                <li>Clinics</li>
                <li>Pets</li>
                <li>Equipment &amp; Tools</li>
                <li>Others</li>
              </ul>

              <h2 style={sectionTitle}>Plans &amp; Pricing</h2>
              <ul style={listStyle}>
                <li><strong>Free</strong> — 0 AED · 150 chars · 1 image · 3 days</li>
                <li><strong>Basic</strong> — 5 AED · 400 chars · 2 images · 7 days</li>
                <li><strong>🇦🇪 UAE Flag</strong> — FREE until May 1st (Launch Offer) · 800 chars · 4 images · 14 days</li>
                <li><strong>Standard (Best Value)</strong> — 9 AED · 800 chars · 4 images · 14 days</li>
                <li><strong>Premium</strong> — 15 AED · 1200 chars · 6 images · 30 days</li>
              </ul>

              <h2 style={sectionTitle}>Publishing Channels</h2>
              <p style={paragraph}>One click — your ad reaches:</p>
              <ul style={listStyle}>
                <li>🌐 Official website</li>
                <li>📘 Facebook page</li>
                <li>📷 Instagram</li>
                <li>📱 Telegram channel</li>
                <li>✖️ X (Twitter)</li>
                <li>🧵 Threads (follow-only)</li>
              </ul>

              <h2 style={sectionTitle}>Two Ways to Post</h2>
              <ul style={listStyle}>
                <li>🌐 Via the website</li>
                <li>🤖 Via our Telegram bot <a href="https://t.me/classifiedsuae_bot" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontWeight: 600 }}>@classifiedsuae_bot</a></li>
              </ul>

              <h2 style={sectionTitle}>Why We Are Different</h2>
              <ul style={listStyle}>
                <li>Fully automated publishing system</li>
                <li>One ad published to 5 platforms at the same time</li>
                <li>Post via website or Telegram bot</li>
                <li>Republish expired ads at half price</li>
                <li>Direct buyer contact via WhatsApp, call, or Telegram</li>
                <li>Secure payments via Ziina</li>
                <li>Focus on speed and results</li>
              </ul>

              <h2 style={sectionTitle}>Our Commitment</h2>
              <p style={paragraph}>
                CLASSIFIEDS UAE provides a publishing platform only and does not bear responsibility for content posted by users. Full responsibility lies with the advertiser, while we commit to taking necessary action in case of violations or official requests from relevant authorities.
              </p>

              <h2 style={sectionTitle}>Contact Us</h2>
              <div style={{ ...paragraph, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span>🌐 Website: <a href="https://classifiedsuae.ae" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>classifiedsuae.ae</a></span>
                <span>📧 Email: <a href="mailto:info@classifiedsuae.ae" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>info@classifiedsuae.ae</a></span>
                <span>🤖 Telegram bot: <a href="https://t.me/classifiedsuae_bot" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>@classifiedsuae_bot</a></span>
                <span>📱 Telegram channel: <a href="https://t.me/classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>@classifiedsuaeofficial</a></span>
                <span>📘 Facebook: <a href="https://facebook.com/classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>classifiedsuaeofficial</a></span>
                <span>📷 Instagram: <a href="https://instagram.com/classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>@classifiedsuaeofficial</a></span>
                <span>✖️ X (Twitter): <a href="https://x.com/clasifiedsuae" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>@clasifiedsuae</a></span>
                <span>💬 WhatsApp: <a href="https://whatsapp.com/channel/0029Vb6jcHdDDmFX0Pp7ej34" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>Official Channel</a></span>
                <span>🧵 Threads: <a href="https://www.threads.com/@classifiedsuaeofficial" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>@classifiedsuaeofficial</a></span>
              </div>

              <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "var(--surface-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", lineHeight: 1.7 }}>
                  The platform is managed by <a href="https://shiffera.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>Shiffera.com</a>, a company specializing in advanced technology solutions with a focus on automation, speed, and high-quality user experience.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
