import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@classifiedsuae.ae" },
    update: { phone: "971000000000", password: hashedPassword, role: "ADMIN" },
    create: { phone: "971000000000", email: "admin@classifiedsuae.ae", password: hashedPassword, role: "ADMIN" },
  });
  console.log("Admin user:", admin);

  await prisma.pricingConfig.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", textPrice: 3, imagePrice: 2, adDurationDays: 30 },
  });

  const cats = [
    { name: "Cars", nameAr: "سيارات", slug: "cars", icon: "🚗", sortOrder: 1, imageUrl: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80" },
    { name: "Real Estate", nameAr: "عقارات", slug: "real-estate", icon: "🏠", sortOrder: 2, imageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80" },
    { name: "Jobs", nameAr: "وظائف", slug: "jobs", icon: "💼", sortOrder: 3, imageUrl: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80" },
    { name: "Services", nameAr: "خدمات", slug: "services", icon: "🔧", sortOrder: 4, imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80" },
    { name: "Mobiles", nameAr: "موبايلات", slug: "mobiles", icon: "📱", sortOrder: 5, imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80" },
    { name: "Electronics", nameAr: "إلكترونيات", slug: "electronics", icon: "💻", sortOrder: 6, imageUrl: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&q=80" },
    { name: "Computers & Games", nameAr: "كمبيوتر وألعاب", slug: "computers-games", icon: "🎮", sortOrder: 7, imageUrl: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=800&q=80" },
    { name: "Furniture", nameAr: "أثاث", slug: "furniture", icon: "🛋️", sortOrder: 8, imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80" },
    { name: "Fashion & Clothing", nameAr: "ملابس وأزياء", slug: "fashion-clothing", icon: "👗", sortOrder: 9, imageUrl: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80" },
    { name: "Education & Training", nameAr: "تعليم وتدريب", slug: "education-training", icon: "📚", sortOrder: 10, imageUrl: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80" },
    { name: "Salons & Beauty", nameAr: "صالونات وتجميل", slug: "salons-beauty", icon: "💈", sortOrder: 11, imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80" },
    { name: "Clinics", nameAr: "عيادات", slug: "clinics", icon: "🏥", sortOrder: 12, imageUrl: "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=800&q=80" },
    { name: "Pets", nameAr: "حيوانات أليفة", slug: "pets", icon: "🐾", sortOrder: 13, imageUrl: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80" },
    { name: "Equipment & Tools", nameAr: "معدات وأدوات", slug: "equipment-tools", icon: "🔨", sortOrder: 14, imageUrl: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=800&q=80" },
    { name: "Others", nameAr: "أخرى", slug: "others", icon: "📦", sortOrder: 15, imageUrl: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&q=80" },
  ];

  for (const cat of cats) {
    await prisma.category.upsert({ where: { slug: cat.slug }, update: { name: cat.name, nameAr: cat.nameAr, icon: cat.icon, sortOrder: cat.sortOrder, isActive: true }, create: { ...cat, isActive: true } });
    console.log("Category seeded:", cat.name);
  }

  // Deactivate old categories that are no longer needed
  const oldSlugs = ["vehicles", "other", "clothes-fashion", "education", "salons"];
  for (const slug of oldSlugs) {
    await prisma.category.updateMany({ where: { slug }, data: { isActive: false } });
  }

  const packages = [
    { name: "Free", nameAr: "مجاني", description: "Free listing", price: 0, durationDays: 14, maxChars: 150, maxImages: 1, sortOrder: 1 },
    { name: "Basic", nameAr: "أساسي", description: "5 AED", price: 5, durationDays: 7, maxChars: 400, maxImages: 2, sortOrder: 2 },
    { name: "UAE Flag", nameAr: "علم الإمارات", description: "Free for a limited time — Launch Offer", price: 0, durationDays: 14, maxChars: 800, maxImages: 4, isFeatured: true, sortOrder: 3, promoEndDate: new Date("2026-05-01T00:00:00Z") },
    { name: "Standard", nameAr: "قياسي", description: "9 AED - Best Value", price: 9, durationDays: 14, maxChars: 800, maxImages: 4, isFeatured: true, sortOrder: 4 },
    { name: "Premium", nameAr: "بريميوم", description: "15 AED - Maximum reach", price: 15, durationDays: 30, maxChars: 1200, maxImages: 6, isFeatured: true, isPinned: true, includesTelegram: true, sortOrder: 5 },
  ];

  // Deactivate old packages first
  await prisma.package.updateMany({ where: { name: { notIn: packages.map(p => p.name) } }, data: { isActive: false } });

  for (const pkg of packages) {
    await prisma.package.upsert({ where: { name: pkg.name }, update: { ...pkg, isActive: true }, create: { ...pkg, isActive: true } });
    console.log("Package seeded:", pkg.name);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
