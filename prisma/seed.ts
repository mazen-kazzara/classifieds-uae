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
    create: { id: "default", textPrice: 3, imagePrice: 2, adDurationDays: 7 },
  });

  const cats = [
    { name: "Vehicles", nameAr: "سيارات", slug: "vehicles", icon: "🚗", sortOrder: 1 },
    { name: "Real Estate", nameAr: "عقارات", slug: "real-estate", icon: "🏠", sortOrder: 2 },
    { name: "Electronics", nameAr: "إلكترونيات", slug: "electronics", icon: "💻", sortOrder: 3 },
    { name: "Jobs", nameAr: "وظائف", slug: "jobs", icon: "💼", sortOrder: 4 },
    { name: "Services", nameAr: "خدمات", slug: "services", icon: "🔧", sortOrder: 5 },
    { name: "Salons & Beauty", nameAr: "صالونات وتجميل", slug: "salons", icon: "💈", sortOrder: 6 },
    { name: "Clinics", nameAr: "عيادات", slug: "clinics", icon: "🏥", sortOrder: 7 },
    { name: "Furniture", nameAr: "أثاث", slug: "furniture", icon: "🛋️", sortOrder: 8 },
    { name: "Education", nameAr: "تعليم وتدريب", slug: "education", icon: "📚", sortOrder: 9 },
    { name: "Other", nameAr: "أخرى", slug: "other", icon: "📦", sortOrder: 10 },
  ];

  for (const cat of cats) {
    await prisma.category.upsert({ where: { slug: cat.slug }, update: {}, create: { ...cat, isActive: true } });
    console.log("Category seeded:", cat.name);
  }

  const packages = [
    { name: "Basic", nameAr: "أساسي", price: 0, durationDays: 7, maxImages: 2, sortOrder: 1 },
    { name: "Featured", nameAr: "مميز", description: "Appear at the top", price: 25, durationDays: 14, maxImages: 2, isFeatured: true, sortOrder: 2 },
    { name: "Premium", nameAr: "بريميوم", description: "Pinned + Featured + Telegram", price: 50, durationDays: 30, maxImages: 2, isFeatured: true, isPinned: true, includesTelegram: true, sortOrder: 3 },
  ];

  for (const pkg of packages) {
    await prisma.package.upsert({ where: { name: pkg.name }, update: {}, create: { ...pkg, isActive: true } });
    console.log("Package seeded:", pkg.name);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
