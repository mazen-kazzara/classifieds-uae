import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAdId } from "@/lib/ad-id";
import { publishToSocial } from "@/lib/social-publisher";
import fs from "fs";
import path from "path";

async function downloadTelegramFile(fileId: string): Promise<string | null> {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN missing");
    }

    const fileRes = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
    );

    if (!fileRes.ok) {
      throw new Error(`Telegram getFile failed with status ${fileRes.status}`);
    }

    const fileData = await fileRes.json();
    const filePath = fileData?.result?.file_path;

    if (!filePath) {
      throw new Error("Invalid Telegram file response: file_path missing");
    }

    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;
    const res = await fetch(fileUrl);

    if (!res.ok) {
      throw new Error(`Telegram file download failed with status ${res.status}`);
    }

    const buffer = await res.arrayBuffer();
    const fileName = `${Date.now()}-${fileId}.jpg`;

    const uploadDir = path.join(process.cwd(), "public/uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uploadPath = path.join(uploadDir, fileName);
    fs.writeFileSync(uploadPath, Buffer.from(buffer));

    return `/uploads/${fileName}`;
  } catch (err) {
    console.error("downloadTelegramFile ERROR:", err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    console.log("TELEGRAM ROUTE HIT");

    const data: any = await req.json();

    console.log("TELEGRAM DATA:", data);

    const phone    = String(data?.phone    ?? "").trim();
    const text     = String(data?.text     ?? "").trim();
    const title    = String(data?.title    ?? "").trim();
    const name     = String(data?.name     ?? "").trim();
    const price    = Number(data?.price    ?? 0);
    const isFree   = price === 0;
    const rawCategory = String(data?.category ?? "").trim();
    const rawLanguage = String(data?.language ?? "").trim().toLowerCase();

    const chatId =
      data?.telegramChatId ??
      data?.chat_id ??
      data?.chatId ??
      data?.message?.chat?.id ??
      null;

    console.log("CHAT ID:", chatId);

    if (!phone) {
      return NextResponse.json({ error: "PHONE_REQUIRED" }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({ error: "TEXT_REQUIRED" }, { status: 400 });
    }
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "INVALID_PRICE" }, { status: 400 });
    }

    // ── Category normalisation ─────────────────────────────────────────────────
    const categoryMap: Record<string, string> = {
      // English keys
      "vehicles":           "Vehicles",
      "vehicle":            "Vehicles",
      "electronics":        "Electronics",
      "electronic":         "Electronics",
      "real estate":        "Real Estate",
      "realestate":         "Real Estate",
      "property":           "Real Estate",
      "properties":         "Real Estate",
      "jobs":               "Jobs",
      "job":                "Jobs",
      "services":           "Services",
      "service":            "Services",
      "salons & beauty":    "Salons & Beauty",
      "salons":             "Salons & Beauty",
      "beauty":             "Salons & Beauty",
      "clinics":            "Clinics",
      "clinic":             "Clinics",
      "furniture":          "Furniture",
      "education & training": "Education & Training",
      "education":          "Education & Training",
      "training":           "Education & Training",
      "other":              "Other",
      // Arabic keys
      "سيارات":             "Vehicles",
      "عقارات":             "Real Estate",
      "إلكترونيات":         "Electronics",
      "وظائف":              "Jobs",
      "خدمات":              "Services",
      "صالونات وتجميل":     "Salons & Beauty",
      "عيادات":             "Clinics",
      "أثاث":               "Furniture",
      "تعليم وتدريب":       "Education & Training",
      "أخرى":               "Other",
    };

    const normalizedCategory =
      (categoryMap[rawCategory] ??
      categoryMap[rawCategory.toLowerCase()] ??
      rawCategory) ||
      "Other";

    const normalizedLanguage = rawLanguage === "ar" ? "ar" : "en";

    console.log("IMAGES:", data.images);

    // ── Map publishPlatform → publishTarget ──────────────────────────────────
    // publishPlatform can be comma-separated: "telegram,website,facebook,instagram"
    const rawPlatform  = String(data?.publishPlatform ?? "website").trim();
    const platformList = rawPlatform.split(",").map((p: string) => p.trim()).filter(Boolean);
    // Legacy support: "both" → website+telegram
    const hasTelegram  = platformList.includes("telegram") || rawPlatform === "both";
    const hasWebsite   = platformList.includes("website")  || rawPlatform === "both";
    const hasFacebook  = platformList.includes("facebook");
    const hasInstagram = platformList.includes("instagram");
    const targetParts: string[] = [];
    if (hasWebsite)   targetParts.push("website");
    if (hasTelegram)  targetParts.push("telegram");
    if (hasFacebook)  targetParts.push("facebook");
    if (hasInstagram) targetParts.push("instagram");
    const publishTarget = targetParts.length > 0 ? targetParts.join("+") : "website";

    // ── Parse contact methods (comma-separated: "whatsapp,telegram,call") ──────
    const packageId = data?.packageId ? String(data.packageId).trim() : null;
    const telegramUsername = data?.telegramUsername ? String(data.telegramUsername).trim().replace(/^@/, "") : null;

    const rawContactMethod = String(data?.contactMethod ?? "").trim();
    const contactMethods   = rawContactMethod
      ? rawContactMethod.split(",").map((m: string) => m.trim()).filter(Boolean)
      : ["call"];
    const hasWhatsApp = contactMethods.includes("whatsapp");
    const hasCall     = contactMethods.includes("call");
    // Store the full comma-separated string for the website + channel to use
    const contactMethod  = contactMethods.join(",");
    // whatsappNumber must be set for the WhatsApp button to appear on the website
    const whatsappNumber = hasWhatsApp ? phone : null;

    const roundedPrice = price;

    // ── Upsert user record ────────────────────────────────────────────────────
    if (name && phone) {
      await prisma.user.upsert({
        where: { phone },
        update: {},
        create: { phone, name, email: null } as any,
      }).catch(() => {});
    }

    // ── Create submission ─────────────────────────────────────────────────────
    const submission = await prisma.adSubmission.create({
      data: {
        phone,
        contactPhone:  hasCall || hasWhatsApp ? phone : null,
        whatsappNumber,
        telegramChatId:  chatId ? String(chatId) : null,
        telegramUsername: telegramUsername || undefined,
        categoryName:   normalizedCategory,
        text,
        title:          title || null,
        language:       normalizedLanguage,
        priceTotal:     roundedPrice,
        adPrice:        data.adPrice  != null ? Number(data.adPrice) : null,
        isNegotiable:   data.isNegotiable === true,
        status:         isFree ? "PUBLISHED" : "WAITING_PAYMENT",
        publishTarget,
        contactMethod,
        packageId: packageId || undefined,
      } as any,
    });

    // ── Save images ───────────────────────────────────────────────────────────
    const savedImagePaths: string[] = [];

    if (Array.isArray(data.images) && data.images.length > 0) {
      console.log("PROCESSING IMAGES...");

      for (const [index, fileId] of data.images.entries()) {
        const imgPath = await downloadTelegramFile(String(fileId));
        if (!imgPath) continue;
        savedImagePaths.push(imgPath);

        try {
          await prisma.submissionMedia.create({
            data: {
              submissionId: submission.id,
              tempKey:      imgPath,
              position:     index,
              expiresAt:    new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          });
        } catch (err) {
          console.error("DB IMAGE ERROR:", err);
        }
      }
    }

    if (savedImagePaths.length > 0) {
      await prisma.adSubmission.update({
        where: { id: submission.id },
        data: {
          images:      savedImagePaths,
          imagesCount: savedImagePaths.length,
          // Each image costs 2.5 AED
          priceImages: savedImagePaths.length * 2.5,
        } as any,
      });
    }

    console.log("SUBMISSION CREATED:", submission.id);

    // ── Free plan: create Ad record and publish instantly ────────────────────
    if (isFree) {
      const PUBLIC_URL =
        process.env.APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://classifiedsuae.com";

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      const ad = await prisma.ad.create({
        data: {
          id:             generateAdId(),
          submissionId:   submission.id,
          title:          submission.title || submission.text?.split(" ").slice(0, 6).join(" ") || "Ad",
          description:    submission.text || "",
          category:       normalizedCategory,
          contactPhone:   hasCall || hasWhatsApp ? phone : null,
          whatsappNumber,
          contactMethod,
          telegramChatId:  chatId ? String(chatId) : null,
          telegramUsername: telegramUsername || undefined,
          status:         "PUBLISHED",
          publishedAt:    new Date(),
          expiresAt,
        } as any,
      });

      await prisma.adSubmission.update({
        where: { id: submission.id },
        data:  { status: "PUBLISHED" },
      });

      const adUrl = `${PUBLIC_URL}/ad/${ad.id}`;

      // Build contact lines and publish to social
      let facebookUrl: string | null = null;
      let instagramUrl: string | null = null;
      if (hasFacebook || hasInstagram) {
        const socialContactLines: string[] = [];
        if (hasCall)      socialContactLines.push(`📞 +${phone}`);
        if (hasWhatsApp)  socialContactLines.push(`💬 wa.me/${phone}`);
        if (contactMethods.includes("telegram")) socialContactLines.push(`✈️ Telegram`);

        try {
          const socialResult = await publishToSocial({
            title:        ad.title || "",
            description:  ad.description,
            category:     ad.category,
            adUrl,
            imageUrl:     savedImagePaths[0] ? `${PUBLIC_URL}${savedImagePaths[0]}` : null,
            adPrice:      data.adPrice ? Number(data.adPrice) : null,
            isNegotiable: data.isNegotiable === true,
            contactLines: socialContactLines,
            publishFacebook:  hasFacebook,
            publishInstagram: hasInstagram,
          });
          facebookUrl = socialResult.facebookUrl || null;
          instagramUrl = socialResult.instagramUrl || null;
        } catch (e) { console.error("SOCIAL PUBLISH ERROR:", e); }
      }

      return NextResponse.json({
        success: true,
        id:      submission.id,
        free:    true,
        adId:    ad.id,
        adUrl,
        facebookUrl,
        instagramUrl,
        telegramChatId: chatId ? String(chatId) : null,
      });
    }

    // ── Paid plan: create pending payment record ──────────────────────────────
    const providerRef = "TG_" + submission.id;

    await prisma.payment.create({
      data: {
        submissionId: submission.id,
        provider:     "telegram",
        providerRef,
        amount:       roundedPrice,
        currency:     "AED",
        status:       "PENDING",
      },
    });

    return NextResponse.json({
      success:        true,
      id:             submission.id,
      providerRef,
      telegramChatId: chatId ? String(chatId) : null,
    });

  } catch (error: any) {
    console.error("TELEGRAM ROUTE ERROR:", error);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: error?.message ?? "" },
      { status: 500 }
    );
  }
}
