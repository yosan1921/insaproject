import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { userUpdateSchema } from "@/lib/validation/userSchemas";
import { sendMail } from "@/lib/mail/mailer";
import { accountUpdatedEmail } from "@/lib/mail/templates/accountNotification";
import { writeAuditLog } from "@/lib/logging/auditLogger";
import { requireAuth } from "@/lib/rbac/guard";

export async function POST(req: NextRequest) {
	const authResult = await requireAuth(req);
	if (authResult) return authResult;

	const session = await getServerSession(authOptions);
	if (!session || !session.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const json = await req.json().catch(() => null);
	const parsed = userUpdateSchema.safeParse(json);

	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid payload", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const updates: Record<string, unknown> = {};
	const changes: string[] = [];

	if (parsed.data.name) {
		updates.name = parsed.data.name;
		changes.push("Name updated");
	}

	if (parsed.data.password) {
		const hash = await bcrypt.hash(parsed.data.password, 10);
		updates.password = hash;
		changes.push("Password changed");
	}

	if (changes.length === 0) {
		return NextResponse.json({ error: "No changes provided" }, { status: 400 });
	}

	await dbConnect();

	const userId = (session.user as any).id;
	const user = await User.findByIdAndUpdate(
		userId,
		{ $set: updates },
		{ new: true },
	);

	if (!user) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	await writeAuditLog({
		action: "USER_UPDATE_PROFILE",
		userId: String(user._id),
		details: { changes },
	});

	if (user.email) {
		const html = accountUpdatedEmail({ name: user.name, changes });
		await sendMail({
			to: user.email,
			subject: "Your INSA account has been updated",
			html,
		});
	}

	return NextResponse.json({
		id: String(user._id),
		email: user.email,
		role: user.role,
		name: user.name,
	});
}

