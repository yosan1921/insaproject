import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mfaVerifySchema } from "@/lib/validation/authSchemas";
import { getRedisClient } from "@/lib/services/redis";
import bcrypt from "bcryptjs";
import { writeAuditLog } from "@/lib/logging/auditLogger";

const MFA_VERIFIED_TTL_SECONDS = 60 * 60; // 1 hour

function isMfaEnabled() {
  return process.env.MFA_ENABLED === "true";
}

export async function POST(req: NextRequest) {
  if (!isMfaEnabled()) {
    return NextResponse.json({ error: "MFA is not enabled" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = mfaVerifySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const sessionEmail = session.user.email;
  if (!sessionEmail || sessionEmail.toLowerCase() !== parsed.data.email.toLowerCase()) {
    return NextResponse.json({ error: "Email does not match current user" }, { status: 400 });
  }

  const mfaRequired = (session.user as any).mfaRequired === true;
  if (!mfaRequired) {
    return NextResponse.json({ error: "MFA is not required for this account" }, { status: 400 });
  }

  const redis = await getRedisClient();
  if (!redis) {
    return NextResponse.json({ error: "MFA infrastructure is not available" }, { status: 503 });
  }

  const userId = (session.user as any).id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "User identifier missing from session" }, { status: 500 });
  }

  const key = `mfa:code:${userId}`;
  const storedHash = await redis.get(key);

  if (!storedHash) {
    return NextResponse.json({ error: "MFA code expired or not found" }, { status: 400 });
  }

  const isMatch = await bcrypt.compare(parsed.data.code, storedHash);
  if (!isMatch) {
    return NextResponse.json({ error: "Invalid MFA code" }, { status: 400 });
  }

  // Code is valid; mark this user as MFA-verified for a limited time
  await redis.del(key);
  await redis.set(`mfa:verified:${userId}`, "true", { EX: MFA_VERIFIED_TTL_SECONDS });

  await writeAuditLog({
    action: "MFA_VERIFIED",
    userId,
    details: { email: sessionEmail },
  });

  return NextResponse.json({ success: true });
}
