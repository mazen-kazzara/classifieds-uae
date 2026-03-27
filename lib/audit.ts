import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type AuditParams = {
  actorType: "USER" | "ADMIN" | "SYSTEM" | "WEBHOOK";
  actorId?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: any;
  newValue?: any;
};

export async function logAudit(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        actor: params.actorType, // maps to existing column
        userId: params.userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        payload: {
          actorId: params.actorId || null,
          oldValue: params.oldValue || null,
          newValue: params.newValue || null,
        },
      },
    });
  } catch (err) {
    console.error("AUDIT_LOG_ERROR", err);
  }
}
