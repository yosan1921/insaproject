import { writeAuditLog } from "./auditLogger";
import { AuditAction } from "./auditTypes";

export async function logAuditEvent(params: {
  action: AuditAction;
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}) {
  return writeAuditLog(params);
}
