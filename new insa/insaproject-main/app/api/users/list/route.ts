import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { userListQuerySchema } from "@/lib/validation/userSchemas";
import { withRBAC } from "@/lib/rbac/guard";

export async function GET(req: NextRequest) {
	return withRBAC(req, async () => {
		const url = new URL(req.url);
		const query = Object.fromEntries(url.searchParams.entries());

		const parsed = userListQuerySchema.safeParse(query);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid query", details: parsed.error.flatten() },
				{ status: 400 },
			);
		}

		await dbConnect();

		const filter: Record<string, unknown> = {};
		if (parsed.data.role) {
			filter.role = parsed.data.role;
		}

		const users = await User.find(filter)
			.select("email role name createdAt updatedAt")
			.lean();

		return NextResponse.json(users);
	}, ["Director", "Division Head"]);
}

