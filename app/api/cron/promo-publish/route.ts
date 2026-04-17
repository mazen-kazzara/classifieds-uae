import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runScheduledPromos } from "@/lib/promo-publisher";

/**
 * Called by the host crontab every 15 minutes.
 * Publishes to platforms whose target UAE hour matches current time (once per 20h).
 *
 * Protect via EXPIRE_SECRET header (reuses existing cron secret).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.EXPIRE_SECRET;
  if (secret) {
    const provided = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
  }
  const force = req.nextUrl.searchParams.get("force") === "true";
  const results = await runScheduledPromos({ force });
  return NextResponse.json({ ok: true, force, results });
}
