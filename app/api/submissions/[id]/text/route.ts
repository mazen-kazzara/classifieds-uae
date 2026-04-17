import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { forbiddenWords } from "@/lib/forbidden-words";
import { logAudit } from "@/lib/audit";

function containsEmoji(text: string) { return /[\u{1F300}-\u{1FAFF}]/u.test(text); }
function containsForbidden(text: string) { const l = text.toLowerCase(); return forbiddenWords.some(w => l.includes(w)); }

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const text = String(body?.text ?? "").trim();
    const title = String(body?.title ?? "").trim();
    const adPrice = body?.adPrice !== undefined ? parseInt(body.adPrice) : null;
    const isNegotiable = Boolean(body?.isNegotiable);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = req.headers.get("user-agent") || null;

    if (!text || text.length < 5) return NextResponse.json({ ok: false, error: "TEXT_TOO_SHORT", field: "description" }, { status: 400 });
    if (containsEmoji(text)) return NextResponse.json({ ok: false, error: "EMOJI_NOT_ALLOWED", field: "description" }, { status: 400 });
    if (containsForbidden(text)) return NextResponse.json({ ok: false, error: "FORBIDDEN_CONTENT", field: "description" }, { status: 400 });

    const s = await prisma.adSubmission.findUnique({ where: { id }, include: { package: true } });
    if (!s) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    if (s.status !== "DRAFT") return NextResponse.json({ ok: false, error: "CANNOT_EDIT" }, { status: 400 });

    // Enforce character limit based on selected package (fallback to 1200 max)
    const maxChars = s.package?.maxChars ?? 1200;
    if (text.length > maxChars) return NextResponse.json({ ok: false, error: "TEXT_TOO_LONG", message: `Description cannot exceed ${maxChars} characters for your plan.`, maxChars, field: "description" }, { status: 400 });

    const priceText = 0; // Text cost is included in package price
    const updated = await prisma.adSubmission.update({
      where: { id },
      data: { text, title: title || null, priceText, priceTotal: priceText, adPrice: adPrice ?? null, isNegotiable },
    });
    await logAudit({ actorType: "USER", actorId: s.phone, ipAddress: ip, userAgent, action: "TEXT_UPDATED", entity: "AdSubmission", entityId: id });
    return NextResponse.json({ ok: true, priceText: updated.priceText, priceTotal: updated.priceTotal });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: err instanceof Error ? err.message : "" }, { status: 500 });
  }
}
