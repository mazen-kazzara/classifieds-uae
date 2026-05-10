import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { logAudit } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { findActiveCompanyByPhone } from "@/lib/company-lookup";

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
    let sessionUserId: string | null = (session.user as any).id ?? null;
    const sessionRole = (session.user as any).role ?? "USER";
    const isAdmin = sessionRole === "ADMIN" || sessionRole === "CONTENT_ADMIN";

    // Verify userId actually exists in DB — if not, upsert the user
    if (sessionUserId) {
      const userExists = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { id: true } });
      if (!userExists) {
        // User record doesn't exist (OAuth user without DB record) — create one
        try {
          const newUser = await prisma.user.create({
            data: { id: sessionUserId, phone, phoneVerified: true },
          });
          sessionUserId = newUser.id;
        } catch {
          // If creation fails (duplicate phone etc), find by phone instead
          const byPhone = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
          sessionUserId = byPhone?.id ?? null;
        }
      }
    }

    // Daily limit for free ads is enforced at plan selection, not here.
    // Users can always start a submission — they might choose a paid plan.

    // ── Company detection ───────────────────────────────────────────────────
    // If the logged-in phone is tied to an ACTIVE company subscription, tag
    // the draft with companyId so downstream endpoints (text/images/payments)
    // can apply company plan limits and bypass Ziina checkout.
    const company = await findActiveCompanyByPhone(phone).catch(() => null);
    const isCompany = !!company;

    const existing = await prisma.adSubmission.findFirst({ where: { phone, status: "DRAFT" }, orderBy: { createdAt: "desc" } });
    if (existing) {
      const updateData: Record<string, any> = {};
      if (sessionUserId && !existing.userId) updateData.userId = sessionUserId;
      if (isAdmin && !existing.packageId) updateData.packageId = "admin-unlimited";
      if (isCompany && !existing.companyId) updateData.companyId = company!.id;
      if (Object.keys(updateData).length > 0) {
        await prisma.adSubmission.update({ where: { id: existing.id }, data: updateData });
      }
      await logAudit({ actorType: "USER", actorId: phone, ipAddress: ip, userAgent, action: "REUSE_DRAFT", entity: "AdSubmission", entityId: existing.id });
      return NextResponse.json({
        ok: true, reused: true, submissionId: existing.id, status: existing.status,
        isAdmin, isCompany, company: isCompany ? { id: company!.id, name: company!.tradeLicenseName, plan: company!.plan } : null,
      });
    }

    const submission = await prisma.adSubmission.create({
      data: {
        phone, status: "DRAFT", userId: sessionUserId, source: "web",
        ...(isAdmin ? { packageId: "admin-unlimited" } : {}),
        ...(isCompany ? { companyId: company!.id } : {}),
      },
    });
    await logAudit({ actorType: "USER", actorId: phone, ipAddress: ip, userAgent, action: "CREATE_SUBMISSION", entity: "AdSubmission", entityId: submission.id });
    return NextResponse.json({
      ok: true, reused: false, submissionId: submission.id, status: submission.status,
      isAdmin, isCompany, company: isCompany ? { id: company!.id, name: company!.tradeLicenseName, plan: company!.plan } : null,
    });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: "An error occurred" }, { status: 500 });
  }
}
