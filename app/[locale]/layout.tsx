import { notFound } from "next/navigation";
import "../globals.css";
import { routing } from "@/i18n/routing";
import Providers from "../providers";
import LazyFloatingButtons from "@/components/LazyFloatingButtons";
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
  title: { default: "Classifieds UAE", template: "%s | Classifieds UAE" },
  description: "UAE's fastest classified ads platform. Buy, sell & advertise — cars, real estate, electronics, jobs, services and more across Dubai, Abu Dhabi, Sharjah and all Emirates.",
  metadataBase: new URL("https://classifiedsuae.ae"),
  openGraph: {
    title: "Classifieds UAE",
    description: "UAE's fastest classified ads platform. Buy, sell & advertise — cars, real estate, electronics, jobs, services and more across Dubai, Abu Dhabi, Sharjah and all Emirates.",
    url: "https://classifiedsuae.ae",
    siteName: "Classifieds UAE",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Classifieds UAE — Buy, Sell & Advertise in the UAE" }],
    locale: "en_AE",
    type: "website",
    countryName: "United Arab Emirates",
  },
  twitter: {
    card: "summary_large_image",
    site: "@clasifiedsuae",
    creator: "@clasifiedsuae",
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
    languages: {
      "en": "https://classifiedsuae.ae/en",
      "ar": "https://classifiedsuae.ae/ar",
      "x-default": "https://classifiedsuae.ae/ar",
    },
  },
  other: {
    "geo.region": "AE",
    "geo.placename": "United Arab Emirates",
    "geo.position": "25.2048;55.2708",
    "ICBM": "25.2048, 55.2708",
    "content-language": "ar, en",
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
      </head>
      <body
        className="antialiased"
        suppressHydrationWarning
        style={{ fontFamily: isRTL ? "var(--font-cairo), sans-serif" : "var(--font-inter), sans-serif" }}
      >
        <Providers>
          {children}
          <LazyFloatingButtons />
        </Providers>
      </body>
    </html>
  );
}
