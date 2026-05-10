import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { handleWhatsAppMessage } from "@/services/whatsapp/bot";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "classifieds_verify_token_123";

// ── Meta webhook verification (GET) ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WA Webhook] Verified");
    return new Response(challenge, { status: 200 });
  }

  console.error("[WA Webhook] Verification failed", { mode, token });
  return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
}

// ── Incoming WhatsApp events (POST) ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Extract message from Meta's nested structure
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages || value.messages.length === 0) {
      // Status update (sent, delivered, read) — acknowledge and ignore
      return NextResponse.json({ ok: true });
    }

    const waMessage = value.messages[0];
    const contact = value.contacts?.[0];
    const from = waMessage.from; // sender phone number (e.g. "971501234567")

    // Parse message based on type
    const parsed: {
      from: string;
      messageId: string;
      type: "text" | "interactive" | "image" | "button";
      text?: string;
      buttonId?: string;
      listId?: string;
      imageId?: string;
      senderName?: string;
    } = {
      from,
      messageId: waMessage.id,
      type: waMessage.type,
      senderName: contact?.profile?.name || undefined,
    };

    switch (waMessage.type) {
      case "text":
        parsed.type = "text";
        parsed.text = waMessage.text?.body || "";
        break;

      case "interactive":
        parsed.type = "interactive";
        if (waMessage.interactive?.type === "button_reply") {
          parsed.buttonId = waMessage.interactive.button_reply?.id || "";
        } else if (waMessage.interactive?.type === "list_reply") {
          parsed.buttonId = waMessage.interactive.list_reply?.id || "";
          parsed.listId = waMessage.interactive.list_reply?.id || "";
        }
        break;

      case "button":
        // Template button replies
        parsed.type = "button";
        parsed.buttonId = waMessage.button?.payload || waMessage.button?.text || "";
        break;

      case "image":
        parsed.type = "image";
        parsed.imageId = waMessage.image?.id || "";
        console.log(`[WA Webhook] image from=${from} id=${parsed.imageId} mime=${waMessage.image?.mime_type || "?"}`);
        break;

      default:
        // Unsupported message type — send help text
        const { sendText } = await import("@/services/whatsapp/index");
        await sendText(from, "Send 'start' to begin posting an ad.\nأرسل 'start' لبدء نشر إعلان.");
        return NextResponse.json({ ok: true });
    }

    // Handle asynchronously — respond to Meta immediately
    handleWhatsAppMessage(parsed).catch(err => {
      console.error("[WA Webhook] Bot error:", err);
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[WA Webhook] Error:", err);
    return NextResponse.json({ ok: true }); // Always 200 for Meta
  }
}
