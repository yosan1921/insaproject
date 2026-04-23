import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getRedisClient } from "@/lib/services/redis";
import { healthCheckQuerySchema } from "@/lib/validation/systemSchemas";

export async function GET(req: NextRequest) {
	const url = new URL(req.url);
	const query = Object.fromEntries(url.searchParams.entries());
	const parsed = healthCheckQuerySchema.safeParse(query);

	if (!parsed.success) {
		return NextResponse.json(
			{ status: "error", error: "Invalid query" },
			{ status: 400 },
		);
	}

	const checks: Record<string, unknown> = {};

	// MongoDB health
	try {
		const conn = await dbConnect();
		checks.mongodb = conn.readyState === 1 ? "ok" : "degraded";
	} catch (err) {
		checks.mongodb = "error";
	}

	// Redis health (optional)
	try {
		const client = await getRedisClient();
		if (client) {
			await client.ping();
			checks.redis = "ok";
		} else {
			checks.redis = "disabled";
		}
	} catch {
		checks.redis = "error";
	}

	const body: Record<string, unknown> = {
		status: "ok",
	};

	if (parsed.data.verbose) {
		body.checks = checks;
	}

	return NextResponse.json(body);
}

