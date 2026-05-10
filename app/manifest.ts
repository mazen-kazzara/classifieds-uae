import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Classifieds UAE — Buy, Sell & Advertise",
    short_name: "Classifieds UAE",
    description: "UAE's fastest classified ads platform. Post ads across Website, Facebook, Instagram, Telegram & X.",
    start_url: "/ar",
    id: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#10B981",
    categories: ["shopping", "business", "lifestyle"],
    lang: "ar",
    dir: "rtl",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/Classifieds_uae_jpg.jpeg", sizes: "256x256", type: "image/jpeg", purpose: "maskable" },
    ],
  };
}
