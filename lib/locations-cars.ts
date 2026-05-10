// UAE Emirates / Locations — exact order + spacing per product spec.
// "all-emirates" is virtual: the /new page (and bots) translate it to null
// before submission so the existing single-location filter and publishing
// pipeline treat the ad as emirate-agnostic (visible everywhere).
export const UAE_LOCATIONS = [
  { value: "abu-dhabi",        ar: "أبو ظبي",          en: "Abu Dhabi" },
  { value: "abu-dhabi-al-ain", ar: "أبو ظبي - العين",  en: "Abu Dhabi - Al Ain" },
  { value: "dubai",            ar: "دبي",               en: "Dubai" },
  { value: "sharjah",          ar: "الشارقة",           en: "Sharjah" },
  { value: "ajman",            ar: "عجمان",             en: "Ajman" },
  { value: "umm-al-quwain",    ar: "أم القيوين",        en: "Umm Al Quwain" },
  { value: "ras-al-khaimah",   ar: "رأس الخيمة",        en: "Ras Al Khaimah" },
  { value: "fujairah",         ar: "الفجيرة",           en: "Fujairah" },
  { value: "all-emirates",     ar: "كل الإمارات",       en: "All Emirates" },
];

type SubCatItem = { value: string; ar: string; en: string };

// ── Sub-categories per category slug ─────────────────────────────────────────
export const SUBCATEGORIES: Record<string, SubCatItem[]> = {
  // Brands sorted alphabetically by English name (case-insensitive).
  // "other-brand" intentionally pinned to the end as the catch-all option.
  cars: [
    { value: "audi",           ar: "أودي",            en: "Audi" },
    { value: "bentley",        ar: "بنتلي",            en: "Bentley" },
    { value: "bmw",            ar: "بي إم دبليو",     en: "BMW" },
    { value: "byd",            ar: "بي واي دي",        en: "BYD" },
    { value: "cadillac",       ar: "كاديلاك",          en: "Cadillac" },
    { value: "chery",          ar: "شيري",             en: "Chery" },
    { value: "chevrolet",      ar: "شيفروليه",         en: "Chevrolet" },
    { value: "dodge",          ar: "دودج",            en: "Dodge" },
    { value: "ferrari",        ar: "فيراري",           en: "Ferrari" },
    { value: "ford",           ar: "فورد",            en: "Ford" },
    { value: "genesis",        ar: "جينيسيس",          en: "Genesis" },
    { value: "gmc",            ar: "جي إم سي",        en: "GMC" },
    { value: "honda",          ar: "هوندا",           en: "Honda" },
    { value: "hyundai",        ar: "هيونداي",          en: "Hyundai" },
    { value: "infiniti",       ar: "إنفينيتي",        en: "Infiniti" },
    { value: "jaguar",         ar: "جاكوار",           en: "Jaguar" },
    { value: "jeep",           ar: "جيب",             en: "Jeep" },
    { value: "kia",            ar: "كيا",             en: "Kia" },
    { value: "lamborghini",    ar: "لامبورغيني",       en: "Lamborghini" },
    { value: "land-rover",     ar: "لاند روفر",        en: "Land Rover" },
    { value: "lexus",          ar: "لكزس",            en: "Lexus" },
    { value: "lincoln",        ar: "لينكولن",          en: "Lincoln" },
    { value: "maserati",       ar: "مازيراتي",         en: "Maserati" },
    { value: "mazda",          ar: "مازدا",            en: "Mazda" },
    { value: "mercedes",       ar: "مرسيدس بنز",      en: "Mercedes-Benz" },
    { value: "mg",             ar: "إم جي",            en: "MG" },
    { value: "mini",           ar: "ميني",             en: "Mini" },
    { value: "mitsubishi",     ar: "ميتسوبيشي",       en: "Mitsubishi" },
    { value: "nissan",         ar: "نيسان",           en: "Nissan" },
    { value: "porsche",        ar: "بورش",            en: "Porsche" },
    { value: "rolls-royce",    ar: "رولز رويس",        en: "Rolls-Royce" },
    { value: "suzuki",         ar: "سوزوكي",          en: "Suzuki" },
    { value: "toyota",         ar: "تويوتا",          en: "Toyota" },
    { value: "volkswagen",     ar: "فولكس فاجن",      en: "Volkswagen" },
    { value: "volvo",          ar: "فولفو",            en: "Volvo" },
    { value: "other-brand",    ar: "ماركة أخرى",       en: "Other Brand" },
  ],
  "real-estate": [
    { value: "rent",           ar: "إيجار",            en: "Rent" },
    { value: "sale",           ar: "بيع",              en: "Sale" },
    { value: "commercial-rent", ar: "إيجار تجاري",     en: "Commercial Rent" },
    { value: "commercial-sale", ar: "بيع تجاري",       en: "Commercial Sale" },
    { value: "roommate",       ar: "سكن مشترك",        en: "Roommate / Sharing" },
    { value: "short-term",     ar: "إيجار قصير المدة",  en: "Short-term Rental" },
  ],
  // Jobs branches by intent: job seeker vs employer hiring. Existing values
  // (full-time / part-time / freelance / remote / internship) are no longer
  // shown as choices but old ads using them keep working — `getSubCategoryLabel`
  // falls back to the raw value when not found in the active list.
  jobs: [
    { value: "job-seeker",     ar: "للبحث عن وظيفة",   en: "Search for a Job" },
    { value: "hiring",         ar: "للبحث عن موظف",    en: "Search for a Candidate" },
  ],
  services: [
    { value: "cleaning",       ar: "تنظيف",            en: "Cleaning" },
    { value: "maintenance",    ar: "صيانة",            en: "Maintenance" },
    { value: "moving",         ar: "نقل",              en: "Moving & Delivery" },
    { value: "legal",          ar: "قانوني",            en: "Legal" },
    { value: "consulting",     ar: "استشارات",          en: "Consulting" },
    { value: "design",         ar: "تصميم",            en: "Design" },
    { value: "it-tech",        ar: "تقنية معلومات",     en: "IT & Technology" },
    { value: "other-service",  ar: "خدمة أخرى",        en: "Other" },
  ],
  mobiles: [
    { value: "iphone",         ar: "آيفون",            en: "iPhone" },
    { value: "samsung",        ar: "سامسونج",          en: "Samsung" },
    { value: "huawei",         ar: "هواوي",            en: "Huawei" },
    { value: "xiaomi",         ar: "شاومي",            en: "Xiaomi" },
    { value: "oneplus",        ar: "ون بلس",           en: "OnePlus" },
    { value: "google-pixel",   ar: "جوجل بيكسل",       en: "Google Pixel" },
    { value: "oppo",           ar: "أوبو",             en: "OPPO" },
    { value: "vivo",           ar: "فيفو",             en: "Vivo" },
    { value: "other-mobile",   ar: "أخرى",             en: "Other" },
  ],
  electronics: [
    { value: "tv-audio",       ar: "تلفزيون وصوتيات",  en: "TV & Audio" },
    { value: "cameras",        ar: "كاميرات",          en: "Cameras" },
    { value: "gaming",         ar: "ألعاب",            en: "Gaming" },
    { value: "kitchen",        ar: "أجهزة مطبخ",       en: "Kitchen Appliances" },
    { value: "ac-cooling",     ar: "تكييف وتبريد",     en: "AC & Cooling" },
    { value: "other-elec",     ar: "أخرى",             en: "Other" },
  ],
  // Computers & Games — brand-keyed (matches Cars/Mobiles convention).
  // "other-comp" retained as the catch-all value for backward compatibility
  // with existing ads that already use it.
  "computers-games": [
    { value: "apple",             ar: "أبل",                  en: "Apple" },
    { value: "dell",              ar: "ديل",                  en: "Dell" },
    { value: "hp",                ar: "إتش بي",               en: "HP" },
    { value: "lenovo",            ar: "لينوفو",               en: "Lenovo" },
    { value: "asus",              ar: "أسوس",                 en: "Asus" },
    { value: "acer",              ar: "أيسر",                 en: "Acer" },
    { value: "msi",               ar: "إم إس آي",             en: "MSI" },
    { value: "samsung",           ar: "سامسونج",              en: "Samsung" },
    { value: "microsoft-surface", ar: "مايكروسوفت سيرفس",    en: "Microsoft Surface" },
    { value: "other-comp",        ar: "أخرى",                 en: "Other" },
  ],
  furniture: [
    { value: "living-room",    ar: "غرفة معيشة",       en: "Living Room" },
    { value: "bedroom",        ar: "غرفة نوم",         en: "Bedroom" },
    { value: "office",         ar: "مكتبي",            en: "Office" },
    { value: "kitchen-dining", ar: "مطبخ وطعام",       en: "Kitchen & Dining" },
    { value: "outdoor",        ar: "خارجي",            en: "Outdoor" },
    { value: "other-furn",     ar: "أخرى",             en: "Other" },
  ],
  "fashion-clothing": [
    { value: "men",            ar: "رجالي",            en: "Men" },
    { value: "women",          ar: "نسائي",            en: "Women" },
    { value: "kids",           ar: "أطفال",            en: "Kids" },
    { value: "shoes",          ar: "أحذية",            en: "Shoes" },
    { value: "bags",           ar: "حقائب",            en: "Bags" },
    { value: "other-fashion",  ar: "أخرى",             en: "Other" },
  ],
  "education-training": [
    { value: "tutoring",       ar: "دروس خصوصية",      en: "Tutoring" },
    { value: "courses",        ar: "دورات",            en: "Courses" },
    { value: "language",       ar: "لغات",             en: "Language" },
    { value: "professional",   ar: "تدريب مهني",       en: "Professional Training" },
    { value: "other-edu",      ar: "أخرى",             en: "Other" },
  ],
  "salons-beauty": [
    { value: "hair",           ar: "شعر",              en: "Hair" },
    { value: "skin",           ar: "بشرة",             en: "Skin Care" },
    { value: "nails",          ar: "أظافر",            en: "Nails" },
    { value: "spa",            ar: "سبا",              en: "Spa & Massage" },
    { value: "makeup",         ar: "مكياج",            en: "Makeup" },
    { value: "other-beauty",   ar: "أخرى",             en: "Other" },
  ],
  clinics: [
    { value: "dental",         ar: "أسنان",            en: "Dental" },
    { value: "dermatology",    ar: "جلدية",            en: "Dermatology" },
    { value: "general",        ar: "عام",              en: "General" },
    { value: "pediatrics",     ar: "أطفال",            en: "Pediatrics" },
    { value: "physiotherapy",  ar: "علاج طبيعي",       en: "Physiotherapy" },
    { value: "other-clinic",   ar: "أخرى",             en: "Other" },
  ],
  pets: [
    { value: "dogs",           ar: "كلاب",             en: "Dogs" },
    { value: "cats",           ar: "قطط",              en: "Cats" },
    { value: "birds",          ar: "طيور",             en: "Birds" },
    { value: "fish",           ar: "أسماك",            en: "Fish" },
    { value: "pet-accessories",ar: "مستلزمات",         en: "Accessories" },
    { value: "other-pet",      ar: "أخرى",             en: "Other" },
  ],
  "equipment-tools": [
    { value: "construction",   ar: "بناء",             en: "Construction" },
    { value: "industrial",     ar: "صناعي",            en: "Industrial" },
    { value: "garden",         ar: "حدائق",            en: "Garden" },
    { value: "workshop",       ar: "ورشة",             en: "Workshop" },
    { value: "other-equip",    ar: "أخرى",             en: "Other" },
  ],
  "jewelry-accessories": [
    { value: "gold",           ar: "ذهب",              en: "Gold" },
    { value: "silver",         ar: "فضة",              en: "Silver" },
    { value: "diamonds",       ar: "ألماس",            en: "Diamonds" },
    { value: "fashion-jewel",  ar: "مجوهرات أزياء",    en: "Fashion Jewelry" },
    { value: "other-jewel",    ar: "أخرى",             en: "Other" },
  ],
  watches: [
    { value: "luxury",         ar: "فاخرة",            en: "Luxury" },
    { value: "sport",          ar: "رياضية",           en: "Sport" },
    { value: "smart-watch",    ar: "ساعة ذكية",        en: "Smart Watch" },
    { value: "classic",        ar: "كلاسيكية",         en: "Classic" },
    { value: "other-watch",    ar: "أخرى",             en: "Other" },
  ],
};

// Legacy alias
export const CAR_BRANDS = SUBCATEGORIES.cars;

// Helper to find location label
export function getLocationLabel(value: string | null | undefined, locale: string): string {
  if (!value) return "";
  const loc = UAE_LOCATIONS.find(l => l.value === value);
  return loc ? (locale === "ar" ? loc.ar : loc.en) : value;
}

// Helper to find sub-category label (searches all category sub-lists)
export function getSubCategoryLabel(value: string | null | undefined, locale: string): string {
  if (!value) return "";
  for (const items of Object.values(SUBCATEGORIES)) {
    const found = items.find(i => i.value === value);
    if (found) return locale === "ar" ? found.ar : found.en;
  }
  return value;
}

// Get sub-categories for a category slug
export function getSubCategoriesFor(categorySlug: string): SubCatItem[] {
  return SUBCATEGORIES[categorySlug] || [];
}

// Legacy helper alias
export function getCarBrandLabel(value: string | null | undefined, locale: string): string {
  return getSubCategoryLabel(value, locale);
}
