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
    // ── Category normalisation (dynamic from DB) ─────────────────────────────
    const dbCategories = await prisma.category.findMany({
      where: { isActive: true },
      select: { name: true, nameAr: true, slug: true },
    });
    const categoryMap: Record<string, string> = {};
    for (const cat of dbCategories) {
      categoryMap[cat.slug] = cat.name;
      categoryMap[cat.name.toLowerCase()] = cat.name;
      categoryMap[cat.nameAr] = cat.name;
      // Add individual words as shortcuts
      for (const word of cat.name.toLowerCase().split(/[\s&]+/).filter(w => w.length > 3)) {
        if (!categoryMap[word]) categoryMap[word] = cat.name;
      }
      for (const word of cat.nameAr.split(/\s+/).filter(w => w.length > 2)) {
        if (!categoryMap[word]) categoryMap[word] = cat.name;
      }
    }

    const normalizedCategory =
      (categoryMap[rawCategory] ??
      categoryMap[rawCategory.toLowerCase()] ??
      rawCategory) ||
      "Other";

    const normalizedLanguage = rawLanguage === "ar" ? "ar" : "en";

    // ── Resolve package and enforce limits ───────────────────────────────────
    const packageId = data?.packageId ? String(data.packageId).trim() : null;
    let pkg: { id: string; price: number; maxChars: number; maxImages: number; durationDays: number; isFeatured: boolean; isPinned: boolean } | null = null;
    if (packageId) {
      pkg = await prisma.package.findUnique({ where: { id: packageId }, select: { id: true, price: true, maxChars: true, maxImages: true, durationDays: true, isFeatured: true, isPinned: true } });
    }
    const maxChars = pkg?.maxChars ?? 150;
    const maxImages = pkg?.maxImages ?? 1;
    if (text.length > maxChars) {
      return NextResponse.json({ error: "TEXT_TOO_LONG", message: `Max ${maxChars} chars for this plan.`, maxChars }, { status: 400 });
    }
    if (Array.isArray(data.images) && data.images.length > maxImages) {
      return NextResponse.json({ error: "TOO_MANY_IMAGES", message: `Max ${maxImages} images for this plan.`, maxImages }, { status: 400 });
    }

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
    const hasX         = platformList.includes("x");
    const targetParts: string[] = [];
    if (hasWebsite)   targetParts.push("website");
    if (hasTelegram)  targetParts.push("telegram");
    if (hasFacebook)  targetParts.push("facebook");
    if (hasInstagram) targetParts.push("instagram");
    if (hasX)         targetParts.push("x");
    const publishTarget = targetParts.length > 0 ? targetParts.join("+") : "website";

    // ── Parse contact methods (comma-separated: "whatsapp,telegram,call") ──────
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

    // Use flat package price instead of dynamic bot-calculated price
    const packagePrice = pkg?.price ?? 0;
    const isFreePackage = packagePrice === 0;

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
        priceTotal:     packagePrice,
        adPrice:        data.adPrice  != null ? Number(data.adPrice) : null,
        isNegotiable:   data.isNegotiable === true,
        status:         isFreePackage ? "PUBLISHED" : "WAITING_PAYMENT",
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
        } as any,
      });
    }

    console.log("SUBMISSION CREATED:", submission.id);

    // ── Free plan: create Ad record and publish instantly ────────────────────
    if (isFreePackage) {
      const PUBLIC_URL =
        process.env.APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://classifiedsuae.com";

      const durationDays = pkg?.durationDays ?? 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

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
      console.log("SOCIAL TARGETS:", { hasFacebook, hasInstagram, hasX, publishTarget, rawPlatform });
      if (hasFacebook || hasInstagram || hasX) {
        const socialContactLines: string[] = [];
        if (hasCall)      socialContactLines.push(`📞 +${phone}`);
        if (hasWhatsApp)  socialContactLines.push(`💬 wa.me/${phone}`);
        if (contactMethods.includes("telegram")) socialContactLines.push(`✈️ Telegram`);

        const allSocialImageUrls = savedImagePaths.map(p => `${PUBLIC_URL}/uploads/${p.replace(/^\/?(uploads\/)?/, "")}`);
        // Fire-and-forget: IG carousel can take 30-120 seconds. Don't make the bot wait.
        // We respond immediately; social IDs are saved to the ad record when the publish finishes.
        const adIdForUpdate = ad.id;
        publishToSocial({
          title:        ad.title || "",
          description:  ad.description,
          category:     ad.category,
          adUrl,
          imageUrl:     allSocialImageUrls[0] ?? null,
          allImageUrls: allSocialImageUrls,
          adPrice:      data.adPrice ? Number(data.adPrice) : null,
          isNegotiable: data.isNegotiable === true,
          contactLines: socialContactLines,
          publishFacebook:  hasFacebook,
          publishInstagram: hasInstagram,
          publishX: hasX,
        }).then(async (socialResult) => {
          const socialIds: Record<string, string> = {};
          if (socialResult.facebookPostId) socialIds.facebookPostId = socialResult.facebookPostId;
          if (socialResult.instagramPostId) socialIds.instagramPostId = socialResult.instagramPostId;
          if (socialResult.xPostId) socialIds.twitterPostId = socialResult.xPostId;
          if (Object.keys(socialIds).length > 0) {
            await prisma.ad.update({ where: { id: adIdForUpdate }, data: socialIds });
            console.log("TELEGRAM ROUTE: social IDs saved for ad=", adIdForUpdate, socialIds);
          }
        }).catch(e => console.error("TELEGRAM ROUTE SOCIAL PUBLISH ERROR:", e));
      }

      // Telegram channel URL (if published there)
      const telegramChannelUrl = hasTelegram && process.env.TELEGRAM_CHANNEL_ID
        ? `https://t.me/classifiedsuaeofficial`
        : null;

      return NextResponse.json({
        success: true,
        id:      submission.id,
        free:    true,
        adId:    ad.id,
        adUrl:           hasWebsite ? adUrl : null,
        // Note: social URLs are resolved asynchronously — the bot shows generic
        // platform links because carousels/posts may still be publishing.
        // Social posts publish asynchronously — return the ad page URL as the canonical link
        // for all platforms. The actual social post URLs are saved in the DB when they complete.
        facebookUrl:  hasFacebook  ? adUrl : null,
        instagramUrl: hasInstagram ? adUrl : null,
        xUrl:         hasX         ? adUrl : null,
        telegramChannelUrl,
        telegramChatId: chatId ? String(chatId) : null,
        publishTarget,
      });
    }

    // ── Paid plan: create pending payment record ──────────────────────────────
    const providerRef = "TG_" + submission.id;

    await prisma.payment.create({
      data: {
        submissionId: submission.id,
        provider:     "telegram",
        providerRef,
        amount:       packagePrice,
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
