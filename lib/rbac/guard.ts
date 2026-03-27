import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/models/User";

export type RoleRequirement = UserRole | UserRole[];

function hasRequiredRole(userRole: UserRole | undefined, required?: RoleRequirement): boolean {
	if (!required) return true;
	if (!userRole) return false;
	if (Array.isArray(required)) {
		return required.includes(userRole);
	}
	return userRole === required;
}

export async function requireAuth(req: NextRequest): Promise<NextResponse | void> {
	return requireRole(req);
}

export async function requireRole(
	req: NextRequest,
	required?: RoleRequirement,
): Promise<NextResponse | void> {
	const session = await getServerSession(authOptions);

	if (!session || !session.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const userRole = (session.user as any).role as UserRole | undefined;
	const mfaRequired = (session.user as any).mfaRequired === true;
	const mfaVerified = (session.user as any).mfaVerified === true;
	if (process.env.MFA_ENABLED === "true" && mfaRequired && !mfaVerified) {
		return NextResponse.json({ error: "MFA verification required" }, { status: 401 });
	}
	if (!hasRequiredRole(userRole, required)) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
}

export async function withRBAC(
	req: NextRequest,
	handler: (req: NextRequest, session: Awaited<ReturnType<typeof getServerSession>>) => Promise<NextResponse>,
	required?: RoleRequirement,
): Promise<NextResponse> {
	const session = await getServerSession(authOptions);

	if (!session || !session.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const userRole = (session.user as any).role as UserRole | undefined;
	const mfaRequired = (session.user as any).mfaRequired === true;
	const mfaVerified = (session.user as any).mfaVerified === true;
	if (process.env.MFA_ENABLED === "true" && mfaRequired && !mfaVerified) {
		return NextResponse.json({ error: "MFA verification required" }, { status: 401 });
	}
	if (!hasRequiredRole(userRole, required)) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	return handler(req, session);
}

