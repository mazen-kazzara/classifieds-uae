import { prisma } from "@/lib/prisma";

export interface PriceBreakdown {
  textPrice: number;
  imagePrice: number;
  packagePrice: number;
  total: number;
  durationDays: number;
}

export async function calculatePrice(params: {
  text: string;
  imageCount: number;
  packageId?: string | null;
}): Promise<PriceBreakdown> {
  const config = await prisma.pricingConfig.findFirst({ orderBy: { createdAt: "desc" } });
  const textPricePerBlock = config?.textPrice ?? 3;
  const imagePriceEach = config?.imagePrice ?? 2;
  const defaultDuration = config?.adDurationDays ?? 7;

  const cleaned = (params.text ?? "").replace(/[^A-Za-z0-9\u0600-\u06FF]/g, "");
  const charBlocks = Math.ceil(cleaned.length / 70) || 0;
  const computedTextPrice = charBlocks * textPricePerBlock;
  const computedImagePrice = params.imageCount * imagePriceEach;

  let packagePrice = 0;
  let durationDays = defaultDuration;

  if (params.packageId) {
    const pkg = await prisma.package.findUnique({ where: { id: params.packageId } });
    if (pkg) { packagePrice = pkg.price; durationDays = pkg.durationDays; }
  }

  return {
    textPrice: computedTextPrice,
    imagePrice: computedImagePrice,
    packagePrice,
    total: computedTextPrice + computedImagePrice + packagePrice,
    durationDays,
  };
}
