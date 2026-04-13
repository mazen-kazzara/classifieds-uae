import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Classifieds UAE",
    short_name: "ClassifiedsUAE",
    description: "UAE's fastest classified ads platform. Buy, sell & advertise.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#10B981",
    icons: [
      { src: "/Classifieds_uae_jpg.jpeg", sizes: "2000x2000", type: "image/jpeg" },
    ],
  };
}
