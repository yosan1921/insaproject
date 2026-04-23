import { NextRequest, NextResponse } from "next/server";

// Enforce HTTPS in production and add a few basic security headers.
// This is additive only and should not interfere with existing routing.
export function middleware(req: NextRequest) {
	const url = req.nextUrl.clone();

	// Redirect HTTP to HTTPS in production behind typical proxies.
	const isSecure =
		req.headers.get("x-forwarded-proto") === "https" || url.protocol === "https:";

	if (process.env.NODE_ENV === "production" && !isSecure) {
		url.protocol = "https:";
		return NextResponse.redirect(url, 301);
	}

	const res = NextResponse.next();

	// Add basic security-related headers (kept conservative to avoid breakage).
	res.headers.set("X-Content-Type-Options", "nosniff");
	res.headers.set("X-Frame-Options", "SAMEORIGIN");
	res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

	return res;
}

export const config = {
	// Run on all routes by default; can be narrowed later if needed.
	matcher: "/:path*",
};

