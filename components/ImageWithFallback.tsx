"use client";
import { useState } from "react";

const CATEGORY_IMAGES: Record<string, string> = {
  vehicles: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80",
  "real-estate": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80",
  electronics: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80",
  jobs: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80",
  services: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80",
  salons: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
  clinics: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80",
  furniture: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
  education: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
  "clothes-fashion": "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80",
  other: "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=800&q=80",
};

function getCategoryImage(category: string): string {
  const slug = category.toLowerCase().replace(/ /g, "-").replace(/&/g, "").replace(/--/g, "-");
  return CATEGORY_IMAGES[slug] || CATEGORY_IMAGES["other"];
}

export default function ImageWithFallback({
  src, alt, category, className,
}: {
  src: string; alt: string; category: string; className?: string;
}) {
  const [imgSrc, setImgSrc] = useState(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => setImgSrc(getCategoryImage(category))}
    />
  );
}
