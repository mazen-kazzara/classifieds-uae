import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { publishShifferaPromo } from "@/lib/shiffera-promo";

export async function GET(req: NextRequest) {
  const secret = process.env.EXPIRE_SECRET;
  if (secret) {
    const provided = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
  }
  const force = req.nextUrl.searchParams.get("force") === "true";
  const results = await publishShifferaPromo({ force });
  return NextResponse.json({ ok: true, results });
}
