import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { deleteFromAllChannels } from "@/lib/delete-from-channels";

export async function GET() {
  const now = new Date();

  /* 1. Find ads that need to expire */
  const adsToExpire = await prisma.ad.findMany({
    where: {
      status: "PUBLISHED",
      expiresAt: { lte: now },
      deletedAt: null,
    },
    select: {
      id: true,
      telegramMessageId: true,
      facebookPostId: true,
      instagramPostId: true,
      twitterPostId: true,
    },
  });

  let channelDeletions = 0;
  for (const ad of adsToExpire) {
    const results = await deleteFromAllChannels(ad);
    channelDeletions += results.length;
  }

  // Mark as EXPIRED (not deleted — users can republish)
  const expired = await prisma.ad.updateMany({
    where: { status: "PUBLISHED", expiresAt: { lte: now }, deletedAt: null },
    data: { status: "EXPIRED" },
  });

  if (expired.count > 0) {
    const expiredAds = await prisma.ad.findMany({
      where: { status: "EXPIRED", expiresAt: { lte: now }, deletedAt: null },
      select: { submissionId: true },
    });
    const submissionIds = expiredAds.map(a => a.submissionId);
    if (submissionIds.length > 0) {
      await prisma.adSubmission.updateMany({
        where: { id: { in: submissionIds }, status: "PUBLISHED" },
        data: { status: "EXPIRED" },
      });
    }
  }

  /* 2. Hard-delete soft-deleted ads older than 7 days (recovery window expired) */
  const recoveryCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const toPurge = await prisma.ad.findMany({
    where: { deletedAt: { lt: recoveryCutoff } },
    select: { id: true, submissionId: true },
  });

  let purgedCount = 0;
  for (const ad of toPurge) {
    try {
      await prisma.$transaction([
        prisma.media.deleteMany({ where: { adId: ad.id } }),
        prisma.ad.delete({ where: { id: ad.id } }),
        prisma.submissionMedia.deleteMany({ where: { submissionId: ad.submissionId } }),
        prisma.payment.deleteMany({ where: { submissionId: ad.submissionId } }),
        prisma.adSubmission.delete({ where: { id: ad.submissionId } }),
      ]);
      purgedCount++;
    } catch (e) {
      console.error("Purge failed for ad", ad.id, e);
    }
  }

  return NextResponse.json({
    ok: true,
    expiredCount: expired.count,
    channelDeletions,
    purgedCount,
  });
}
