import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { logAudit } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const ipStore = new Map<string, { count: number; windowStart: number }>();
function checkRL(ip: string) {
  const now = Date.now();
  if (!ipStore.has(ip)) { ipStore.set(ip, { count: 1, windowStart: now }); return true; }
  const r = ipStore.get(ip)!;
  if (now - r.windowStart > 60000) { ipStore.set(ip, { count: 1, windowStart: now }); return true; }
  if (r.count >= 10) return false;
  r.count++; return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = req.headers.get("user-agent") || null;
    if (!checkRL(ip)) return NextResponse.json({ ok: false, error: "RATE_LIMIT_EXCEEDED" }, { status: 429 });

    // ── Auth gate: must be signed in ──────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const body = await req.json();
    const phone = String(body?.phone ?? (session.user as any).phone ?? "").replace(/[^0-9]/g, "").trim();
    if (!phone) return NextResponse.json({ ok: false, error: "PHONE_REQUIRED" }, { status: 400 });
    if (!/^9715\d{8}$/.test(phone)) return NextResponse.json({ ok: false, error: "INVALID_PHONE_FORMAT" }, { status: 400 });
    const sessionUserId = (session.user as any).id ?? null;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count24h = await prisma.adSubmission.count({ where: { phone, createdAt: { gte: since } } });
    if (count24h >= 5) return NextResponse.json({ ok: false, error: "DAILY_LIMIT_REACHED" }, { status: 429 });

    const existing = await prisma.adSubmission.findFirst({ where: { phone, status: "DRAFT" }, orderBy: { createdAt: "desc" } });
    if (existing) {
      if (sessionUserId && !existing.userId) await prisma.adSubmission.update({ where: { id: existing.id }, data: { userId: sessionUserId } });
      await logAudit({ actorType: "USER", actorId: phone, ipAddress: ip, userAgent, action: "REUSE_DRAFT", entity: "AdSubmission", entityId: existing.id });
      return NextResponse.json({ ok: true, reused: true, submissionId: existing.id, status: existing.status });
    }

    const submission = await prisma.adSubmission.create({ data: { phone, status: "DRAFT", userId: sessionUserId } });
    await logAudit({ actorType: "USER", actorId: phone, ipAddress: ip, userAgent, action: "CREATE_SUBMISSION", entity: "AdSubmission", entityId: submission.id });
    return NextResponse.json({ ok: true, reused: false, submissionId: submission.id, status: submission.status });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: err instanceof Error ? err.message : "" }, { status: 500 });
  }
}
