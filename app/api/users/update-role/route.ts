import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { userUpdateRoleSchema } from "@/lib/validation/userSchemas";
import { withRBAC } from "@/lib/rbac/guard";
import { writeAuditLog } from "@/lib/logging/auditLogger";
import { sendMail } from "@/lib/mail/mailer";
import { roleChangeNotificationEmail } from "@/lib/mail/templates/roleChangeNotification";

export async function POST(req: NextRequest) {
	return withRBAC(req, async () => {
		const json = await req.json().catch(() => null);
		const parsed = userUpdateRoleSchema.safeParse(json);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid payload", details: parsed.error.flatten() },
				{ status: 400 },
			);
		}

		await dbConnect();

		const userBefore = await User.findById(parsed.data.userId);

		const user = await User.findByIdAndUpdate(
			parsed.data.userId,
			{ $set: { role: parsed.data.role } },
			{ new: true },
		);

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		await writeAuditLog({
			action: "USER_UPDATE_ROLE",
			userId: String(user._id),
			details: { role: user.role },
		});

		if (user.email) {
			const html = roleChangeNotificationEmail({
				name: user.name,
				oldRole: userBefore?.role,
				newRole: user.role,
			});
			await sendMail({
				to: user.email,
				subject: "Your INSA role has been updated",
				html,
			});
		}

		return NextResponse.json({
			id: String(user._id),
			email: user.email,
			role: user.role,
			name: user.name,
		});
	}, ["Director"]);
}

