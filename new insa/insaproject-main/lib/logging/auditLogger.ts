import dbConnect from "@/lib/mongodb";
import mongoose, { Document, Model, Schema } from "mongoose";
import { AuditAction, AuditEvent } from "./auditTypes";

interface IAuditLog extends Document, AuditEvent {}

const AuditLogSchema: Schema<IAuditLog> = new Schema<IAuditLog>(
	{
		action: { type: String, required: true },
		userId: { type: String },
		ip: { type: String },
		userAgent: { type: String },
		details: { type: Schema.Types.Mixed },
		createdAt: { type: Date, default: Date.now },
	},
	{
		timestamps: false,
	},
);

const AuditLog: Model<IAuditLog> =
	(mongoose.models.AuditLog as Model<IAuditLog>) ||
	mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export async function writeAuditLog(event: {
	action: AuditAction;
	userId?: string;
	ip?: string;
	userAgent?: string;
	details?: Record<string, unknown>;
}) {
	await dbConnect();
	await AuditLog.create({
		...event,
		createdAt: new Date(),
	});
}

