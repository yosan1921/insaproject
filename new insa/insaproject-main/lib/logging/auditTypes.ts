export type AuditAction =
	| "USER_LOGIN"
	| "USER_UPDATE_PROFILE"
	| "USER_UPDATE_ROLE"
	| "MFA_CHALLENGE"
	| "MFA_VERIFIED"
	| "SYSTEM_BACKUP";

export interface AuditEventBase {
	userId?: string;
	ip?: string;
	userAgent?: string;
	createdAt: Date;
}

export interface AuditEvent extends AuditEventBase {
	action: AuditAction;
	details?: Record<string, unknown>;
}

