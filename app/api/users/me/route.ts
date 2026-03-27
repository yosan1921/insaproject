import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAuth } from "@/lib/rbac/guard";

export async function GET(req: NextRequest) {
	const authResult = await requireAuth(req);
	if (authResult) return authResult;

	const session = await getServerSession(authOptions);
	if (!session || !session.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { user } = session;

	return NextResponse.json({
		id: (user as any).id,
		email: user.email,
		role: (user as any).role,
		name: user.name,
	});
}

