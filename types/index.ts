export type AdStatus = "DRAFT" | "PENDING" | "ACTIVE" | "EXPIRED" | "REJECTED";
export type AdType = "SALE" | "RENT" | "SERVICE" | "OFFER";
export type ContactMethod = "WHATSAPP" | "CALL" | "BOTH";
export type Language = "ar" | "en";
export type PackageTier = "FREE" | "BASIC" | "PREMIUM" | "FEATURED";

export interface Category {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  icon: string | null;
  parentId: string | null;
  order: number;
  isActive: boolean;
}

export interface Package {
  id: string;
  tier: PackageTier;
  nameAr: string;
  nameEn: string;
  price: number;
  durationDays: number;
  isFeatured: boolean;
  allowsImages: boolean;
  maxImages: number;
  descriptionAr: string | null;
  descriptionEn: string | null;
  isActive: boolean;
}

export interface AdMedia {
  id: string;
  url: string;
  order: number;
}

export interface Ad {
  id: string;
  status: AdStatus;
  type: AdType;
  language: Language;
  titleAr: string | null;
  titleEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  price: number | null;
  currency: string;
  emirate: string | null;
  city: string | null;
  contactMethod: ContactMethod;
  whatsapp: string | null;
  phone: string | null;
  categorySlug: string | null;
  category: Category | null;
  isFeatured: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
  views: number;
  whatsappClicks: number;
  callClicks: number;
  media: AdMedia[];
}

export interface PaginatedAds {
  ads: Ad[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SiteSettings {
  id: string;
  key: string;
  value: string;
}
