import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const phone = String(data?.phone ?? "").trim();
    const text = String(data?.text ?? "").trim();
    const rawCategory = String(data?.category ?? "").trim().toLowerCase();
    const rawLanguage = String(data?.language ?? "").trim().toLowerCase();
    const price = Number(data?.price ?? 0);

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

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "INVALID_PRICE" }, { status: 400 });
    }

    const categoryMap: Record<string, string> = {
      vehicles: "Vehicles",
      vehicle: "Vehicles",
      electronics: "Electronics",
      electronic: "Electronics",
      realestate: "Real Estate",
      "real estate": "Real Estate",
      property: "Real Estate",
      properties: "Real Estate",
    };

    const normalizedCategory = categoryMap[rawCategory] ?? "Electronics";
    const normalizedLanguage = rawLanguage === "ar" ? "ar" : "en";

    console.log("IMAGES:", data.images);

    const submission = await prisma.adSubmission.create({
      data: {
        phone,
        contactPhone: phone,
        telegramChatId: chatId ? String(chatId) : null,
        category: normalizedCategory,
        text,
        language: normalizedLanguage,
        priceTotal: price,
        status: "WAITING_PAYMENT",
      },
    });

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
              tempKey: imgPath,
              position: index,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
          images: savedImagePaths,
          imagesCount: savedImagePaths.length,
        },
      });
    }

    const providerRef = "TG_" + submission.id;

    await prisma.payment.create({
      data: {
        submissionId: submission.id,
        provider: "telegram",
        providerRef,
        amount: price,
        currency: "AED",
        status: "PENDING",
      },
    });

    console.log("SUBMISSION CREATED:", submission.id);

    return NextResponse.json({
      success: true,
      id: submission.id,
      providerRef,
      telegramChatId: chatId ? String(chatId) : null,
    });
  } catch (error: any) {
    console.error("TELEGRAM ROUTE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: error?.message ?? "",
      },
      { status: 500 }
    );
  }
}