import { prisma } from "@/lib/prisma";

type ActorType = "USER" | "ADMIN" | "SYSTEM" | "WEBHOOK" | "BOT";

interface AuditParams {
  actorType: ActorType;
  actorId?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actor: params.actorType,
        userId: params.userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        payload: {
          actorId: params.actorId || null,
          oldValue: params.oldValue ?? null,
          newValue: params.newValue ?? null,
        },
      },
    });
  } catch (err) {
    console.error("AUDIT_LOG_ERROR:", err);
  }
}
