import type { Prisma } from "@prisma/client";

export type AuditEntry = {
  schoolId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  reason?: string;
};

type AuditWriter = {
  auditLog: { create(args: { data: Prisma.AuditLogUncheckedCreateInput }): PromiseLike<unknown> };
};

/** Appends to the audit trail (BRD §20). Pass the transaction client so the entry commits with the change it records. */
export async function writeAudit(db: AuditWriter, entry: AuditEntry): Promise<void> {
  await db.auditLog.create({ data: entry });
}
