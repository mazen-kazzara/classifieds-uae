import { notFound } from "next/navigation";
import "../globals.css";
import { routing } from "@/i18n/routing";
import Providers from "../providers";
import FloatingButtons from "@/components/FloatingButtons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Classifieds UAE", template: "%s | Classifieds UAE" },
  description: "UAE's fastest classified ads platform. Buy, sell & advertise — vehicles, real estate, electronics, jobs, services and more.",
  metadataBase: new URL("https://classifiedsuae.ae"),
  openGraph: {
    title: "Classifieds UAE",
    description: "UAE's fastest classified ads platform. Buy, sell & advertise — vehicles, real estate, electronics, jobs, services and more.",
    url: "https://classifiedsuae.ae",
    siteName: "Classifieds UAE",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Classifieds UAE" }],
    locale: "en_AE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Classifieds UAE",
    description: "UAE's fastest classified ads platform. Buy, sell & advertise.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: "/Classifieds_uae_jpg.jpeg",
    apple: "/Classifieds_uae_jpg.jpeg",
  },
  alternates: {
    canonical: "https://classifiedsuae.ae",
    languages: { "en": "https://classifiedsuae.ae/en", "ar": "https://classifiedsuae.ae/ar" },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "en" | "ar")) {
    notFound();
  }

  const isRTL = locale === "ar";

  return (
    <html lang={locale} dir={isRTL ? "rtl" : "ltr"} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body
        className="antialiased"
        suppressHydrationWarning
        style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Inter', sans-serif" }}
      >
        <Providers>
          {children}
          <FloatingButtons />
        </Providers>
      </body>
    </html>
  );
}
