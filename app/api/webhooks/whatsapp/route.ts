import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "classifieds_verify_token_123";

// ── Meta webhook verification (GET) ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WHATSAPP WEBHOOK: verified");
    return new Response(challenge, { status: 200 });
  }

  console.error("WHATSAPP WEBHOOK: verification failed", { mode, token });
  return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
}

// ── Incoming WhatsApp events (POST) ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("WHATSAPP WEBHOOK EVENT:", JSON.stringify(body, null, 2));

    // Acknowledge immediately (Meta requires 200 within 20s)
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("WHATSAPP WEBHOOK ERROR:", err);
    return NextResponse.json({ ok: true });
  }
}
