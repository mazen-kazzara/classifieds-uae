import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { publishPromoNow, type PromoPlatform } from "@/lib/promo-publisher";
import { runScheduledPromos } from "@/lib/promo-publisher";

/**
 * Manual test endpoint — publishes to one platform (or all) immediately,
 * bypassing schedule and 20h cooldown. Admin only.
 *
 * POST body: { platform?: "facebook" | "instagram" | "x" | "telegram" | "all" }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, { minRole: "ADMIN" });
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const platform: string | undefined = body?.platform;

  if (!platform || platform === "all") {
    const results = await runScheduledPromos({ force: true });
    return NextResponse.json({ ok: true, mode: "all", results });
  }

  const validPlatforms: PromoPlatform[] = ["facebook", "instagram", "x", "telegram"];
  if (!validPlatforms.includes(platform as PromoPlatform)) {
    return NextResponse.json({ ok: false, error: "INVALID_PLATFORM", valid: validPlatforms }, { status: 400 });
  }

  const result = await publishPromoNow(platform as PromoPlatform);
  return NextResponse.json({ ok: true, platform, result });
}
