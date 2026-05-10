/**
 * Shared helper: look up an active Company by its phone number.
 * Returns null if no company exists, the subscription is not ACTIVE,
 * or the subscription has expired. The caller can treat null as "regular user".
 */
import { prisma } from "@/lib/prisma";

export interface ActiveCompanyContext {
  id: string;
  username: string;
  tradeLicenseName: string;
  authorizedSignatory: string;
  activity: string;
  plan: {
    id: string;
    slug: string;
    name: string;
    nameAr: string;
    price: number;
    currency: string;
    maxAdChars: number;
    maxAdImages: number;
    maxActivities: number;
    unlimitedAds: boolean;
  };
  subscriptionEndsAt: Date | null;
}

/**
 * Find an active company subscription tied to the given phone number.
 * @param phone Normalized UAE phone in 9715XXXXXXXX format.
 */
export async function findActiveCompanyByPhone(phone: string): Promise<ActiveCompanyContext | null> {
  if (!phone) return null;
  const company = await prisma.company.findFirst({
    where: {
      companyPhone: phone,
      subscriptionStatus: "ACTIVE",
    },
    include: { plan: true },
  });
  if (!company || !company.plan) {
    console.log(`[company] no active subscription for phone=${phone}`);
    return null;
  }
  if (company.subscriptionEndsAt && company.subscriptionEndsAt < new Date()) {
    console.log(`[company] subscription expired for phone=${phone} endedAt=${company.subscriptionEndsAt.toISOString()}`);
    return null;
  }
  console.log(`[company] match phone=${phone} id=${company.id} plan=${company.plan.slug}`);
  return {
    id: company.id,
    username: company.username,
    tradeLicenseName: company.tradeLicenseName,
    authorizedSignatory: company.authorizedSignatory,
    activity: company.activity,
    plan: {
      id: company.plan.id,
      slug: company.plan.slug,
      name: company.plan.name,
      nameAr: company.plan.nameAr,
      price: company.plan.price,
      currency: company.plan.currency,
      maxAdChars: company.plan.maxAdChars,
      maxAdImages: company.plan.maxAdImages,
      maxActivities: company.plan.maxActivities,
      unlimitedAds: company.plan.unlimitedAds,
    },
    subscriptionEndsAt: company.subscriptionEndsAt,
  };
}
