/**
 * Hashtag generation for social posts.
 * - Constant tags appear on every post for brand discoverability.
 * - Category tags are a mix of EN (broad reach) + AR (local reach).
 * - X gets a trimmed set due to the 280-char limit; FB/IG get the full set.
 */

const CONSTANT_HASHTAGS = ["#classifiedsuae", "#UAE_Ads", "#Classifieds_Ads", "#Classifieds", "#ForSale", "#UAESale"];

const CATEGORY_HASHTAGS: Record<string, string[]> = {
  cars:                 ["#Cars", "#Car", "#UAECars", "#CarsForSale", "#سيارات"],
  "real-estate":        ["#RealEstate", "#Property", "#UAEProperty", "#DubaiRealEstate", "#عقارات"],
  jobs:                 ["#Jobs", "#Careers", "#UAEJobs", "#Hiring", "#وظائف"],
  services:             ["#Services", "#UAEServices", "#ServiceProvider", "#خدمات"],
  mobiles:              ["#Mobile", "#Mobiles", "#Smartphones", "#iPhone", "#موبايلات"],
  electronics:          ["#Electronics", "#Tech", "#Gadgets", "#الكترونيات"],
  "computers-games":    ["#Computers", "#Gaming", "#PC", "#Laptop", "#كمبيوتر", "#العاب"],
  furniture:            ["#Furniture", "#HomeDecor", "#UAEFurniture", "#أثاث"],
  "fashion-clothing":   ["#Fashion", "#Clothing", "#Style", "#UAEFashion", "#أزياء"],
  "education-training": ["#Education", "#Training", "#Courses", "#Learning", "#تعليم"],
  "salons-beauty":      ["#Beauty", "#Salon", "#Spa", "#Makeup", "#تجميل", "#صالون"],
  clinics:              ["#Clinic", "#Health", "#Medical", "#Healthcare", "#عيادات"],
  pets:                 ["#Pets", "#PetsOfUAE", "#Animals", "#حيوانات_أليفة"],
  "equipment-tools":    ["#Tools", "#Equipment", "#معدات"],
  others:               ["#Classifieds", "#ForSale", "#UAESale"],
};

/** Normalise a free-form category string (English name, Arabic name, or slug) → slug key. */
function categoryToSlug(category: string): string {
  if (!category) return "others";
  const raw = category.trim().toLowerCase();

  // Direct slug match
  if (CATEGORY_HASHTAGS[raw]) return raw;

  // Convert English name → slug
  const slug = raw
    .replace(/&/g, "")
    .replace(/[^\w\u0600-\u06FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (CATEGORY_HASHTAGS[slug]) return slug;

  // Fuzzy match by keyword (handles old names like "Vehicles" → cars, "Clothes and Fashion" → fashion-clothing)
  if (/car|veh|auto/.test(raw))                      return "cars";
  if (/real|property|estate|apartment/.test(raw))    return "real-estate";
  if (/job|hiring|career|employ/.test(raw))          return "jobs";
  if (/mobile|phone|iphone|samsung/.test(raw))       return "mobiles";
  if (/comput|gaming|laptop|pc|console/.test(raw))   return "computers-games";
  if (/electronic|gadget/.test(raw))                 return "electronics";
  if (/furniture|decor/.test(raw))                   return "furniture";
  if (/fashion|cloth|dress|wear/.test(raw))          return "fashion-clothing";
  if (/educat|training|course|tutor/.test(raw))      return "education-training";
  if (/salon|beauty|spa|makeup|hair/.test(raw))      return "salons-beauty";
  if (/clinic|medical|health|doctor|dental/.test(raw)) return "clinics";
  if (/pet|animal|dog|cat/.test(raw))                return "pets";
  if (/tool|equipment/.test(raw))                    return "equipment-tools";
  if (/service/.test(raw))                           return "services";

  // Arabic keyword matching
  if (/سيارات|سيارة/.test(category))            return "cars";
  if (/عقار|عقارات|شقة|فيلا/.test(category))     return "real-estate";
  if (/وظيف|وظائف|عمل/.test(category))           return "jobs";
  if (/موبايل|هاتف|جوال/.test(category))         return "mobiles";
  if (/كمبيوتر|العاب|لابتوب/.test(category))      return "computers-games";
  if (/الكترون|إلكترون/.test(category))          return "electronics";
  if (/أثاث|اثاث/.test(category))                return "furniture";
  if (/ملابس|أزياء|ازياء/.test(category))         return "fashion-clothing";
  if (/تعليم|تدريب|كورس/.test(category))          return "education-training";
  if (/صالون|تجميل|جمال/.test(category))          return "salons-beauty";
  if (/عيادات|عيادة|طبيب|صحة/.test(category))     return "clinics";
  if (/حيوان|أليف/.test(category))               return "pets";
  if (/معدات|أدوات|ادوات/.test(category))         return "equipment-tools";
  if (/خدمات|خدمة/.test(category))               return "services";

  return "others";
}

export type SocialPlatform = "x" | "facebook" | "instagram";

/**
 * Builds a hashtag string for a given category + platform.
 * - X: constant tags + 2 top category tags (tight budget)
 * - FB/IG: full set
 *
 * Returns tags as a single space-separated string (no leading/trailing whitespace).
 */
export function buildHashtags(category: string, platform: SocialPlatform): string {
  const slug = categoryToSlug(category);
  const catTags = CATEGORY_HASHTAGS[slug] || CATEGORY_HASHTAGS.others;

  // Dedupe: constant tags take priority, category tags fill remaining.
  const dedupe = (list: string[]) => {
    const seen = new Set<string>();
    return list.filter(tag => {
      const k = tag.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  if (platform === "x") {
    // Keep X tight: 3 top constants + 2 category tags (after dedupe)
    return dedupe([...CONSTANT_HASHTAGS.slice(0, 3), ...catTags.slice(0, 3)]).slice(0, 5).join(" ");
  }
  // Facebook/Instagram: all constants + top 5 category tags (after dedupe)
  return dedupe([...CONSTANT_HASHTAGS, ...catTags.slice(0, 5)]).join(" ");
}
