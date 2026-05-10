import { notFound } from "next/navigation";
import "../globals.css";
import { routing } from "@/i18n/routing";
import Providers from "../providers";
import LazyFloatingButtons from "@/components/LazyFloatingButtons";
import InstallApp from "@/components/InstallApp";
import CookieConsent from "@/components/CookieConsent";
import MetaPixel from "@/components/MetaPixel";
import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: { default: "Classifieds UAE — Buy, Sell & Post Free Ads in the Emirates", template: "%s | Classifieds UAE" },
  description: "Classifieds UAE is the #1 free classified ads platform in the United Arab Emirates. Post free ads for cars, real estate, jobs, electronics, services & more across Dubai, Abu Dhabi, Sharjah and all 7 Emirates. Publish instantly to Website, Facebook, Instagram, Telegram & X.",
  keywords: ["classifieds UAE", "classified ads UAE", "free classifieds UAE", "buy sell UAE", "Dubai classifieds", "Abu Dhabi classifieds", "Sharjah classifieds", "UAE marketplace", "إعلانات مبوبة الإمارات", "إعلانات مجانية الإمارات", "سيارات للبيع الإمارات", "عقارات الإمارات", "وظائف الإمارات"],
  metadataBase: new URL("https://classifiedsuae.ae"),
  openGraph: {
    title: "Classifieds UAE — Free Classified Ads in Dubai, Abu Dhabi & All Emirates",
    description: "Post free classified ads in the UAE. Buy & sell cars, real estate, jobs, electronics, services & more. Publish to Website, Facebook, Instagram, Telegram & X instantly.",
    url: "https://classifiedsuae.ae",
    siteName: "Classifieds UAE",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Classifieds UAE — Free Classified Ads in the United Arab Emirates" }],
    locale: "en_AE",
    type: "website",
    countryName: "United Arab Emirates",
  },
  twitter: {
    card: "summary_large_image",
    site: "@clasifiedsuae",
    creator: "@clasifiedsuae",
    title: "Classifieds UAE — Free Ads in the Emirates",
    description: "Post free classified ads in Dubai, Abu Dhabi, Sharjah & all UAE. Cars, real estate, jobs, electronics & more.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  alternates: {
    canonical: "https://classifiedsuae.ae",
    languages: {
      "en": "https://classifiedsuae.ae/en",
      "ar": "https://classifiedsuae.ae/ar",
      "x-default": "https://classifiedsuae.ae/en",
    },
  },
  other: {
    "geo.region": "AE",
    "geo.placename": "United Arab Emirates",
    "geo.position": "25.2048;55.2708",
    "ICBM": "25.2048, 55.2708",
    "distribution": "UAE",
    "target": "UAE",
    "rating": "general",
    "coverage": "United Arab Emirates",
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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#10B981",
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
    <html lang={locale} dir={isRTL ? "rtl" : "ltr"} suppressHydrationWarning className={`${inter.variable} ${cairo.variable}`}>
      <head>
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://flagcdn.com" />
      </head>
      <body
        className="antialiased"
        suppressHydrationWarning
        style={{ fontFamily: isRTL ? "var(--font-cairo), sans-serif" : "var(--font-inter), sans-serif" }}
      >
        <Providers>
          {children}
          <LazyFloatingButtons />
          <InstallApp locale={locale} />
          <CookieConsent locale={locale} />
          <MetaPixel />
        </Providers>
      </body>
    </html>
  );
}
