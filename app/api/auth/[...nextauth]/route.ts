import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { writeAuditLog } from "@/lib/logging/auditLogger";
import { getRedisClient } from "@/lib/services/redis";
import { mailEnabled } from "@/lib/mail/mailer";

// --- Extend providers with SSO options (additive, env-gated) ---
const providers = authOptions.providers as any[];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
	providers.push(
		GoogleProvider({
			clientId: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		}) as any,
	);
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
	providers.push(
		GitHubProvider({
			clientId: process.env.GITHUB_CLIENT_ID,
			clientSecret: process.env.GITHUB_CLIENT_SECRET,
		}) as any,
	);
}

// --- Extend callbacks to add MFA flags and audit logging ---
const originalCallbacks = authOptions.callbacks || {};
const originalJwt = originalCallbacks.jwt;
const originalSession = originalCallbacks.session;
const originalSignIn = (originalCallbacks as any).signIn as
	| ((...args: any[]) => any)
	| undefined;

const mfaRequiredRoles: string[] = (process.env.MFA_REQUIRED_ROLES || "Director,Division Head")
	.split(",")
	.map((r) => r.trim())
	.filter(Boolean);

function isMfaEnabled() {
	return process.env.MFA_ENABLED === "true";
}

function mfaDependenciesAvailable() {
	return !!process.env.REDIS_URL && mailEnabled;
}

authOptions.callbacks = {
	...originalCallbacks,
	async signIn(params) {
		if (originalSignIn) {
			const result = await originalSignIn(params as any);
			if (result === false) return false;
		}

		try {
			const userId = (params.user as any)?.id as string | undefined;
			await writeAuditLog({
				action: "USER_LOGIN",
				userId,
				details: {
					provider: params.account?.provider,
					type: params.account?.type,
				},
			});
		} catch {
			// Audit failures should never block sign-in
		}

		return true;
	},
	async jwt(params) {
		const token: any = originalJwt ? await originalJwt(params as any) : params.token;

		if (isMfaEnabled()) {
			// On initial sign-in, decide whether MFA is required based on role
			if (params.user) {
				const role = (params.user as any).role as string | undefined;
				token.mfaRequired = role ? mfaRequiredRoles.includes(role) : false;
				// Always reset mfaVerified on fresh login - user must verify again
				token.mfaVerified = false;
				return token;
			}

			// Handle session update from MFA verification page
			if ((params as any).trigger === "update" && (params as any).session?.mfaVerified === true) {
				token.mfaVerified = true;
			}
		}

		return token;
	},
	async session(params) {
		const session: any = originalSession ? await originalSession(params as any) : params.session;

		if (params.token && session.user) {
			const token: any = params.token;
			if (typeof token.mfaRequired !== "undefined") {
				(session.user as any).mfaRequired = token.mfaRequired;
			}
			if (typeof token.mfaVerified !== "undefined") {
				(session.user as any).mfaVerified = token.mfaVerified;
			}
		}

		return session;
	},
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

