import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import MfaSettings from "@/models/MfaSettings";
import { decrypt } from "@/lib/security/encryption";
import { verifyTotpCode } from "@/lib/security/totp";
import { getRedisClient } from "@/lib/services/redis";

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

  const json = await req.json().catch(() => null as any);
  const code = json?.code as string | undefined;
  if (!code || code.length < 4 || code.length > 10) {
    return NextResponse.json({ error: "Invalid MFA code" }, { status: 400 });
  }

  await dbConnect();

  const userId = (session.user as any).id;
  const settings = await MfaSettings.findOne({ userId });
  if (!settings) {
    return NextResponse.json({ error: "MFA not configured for this account" }, { status: 400 });
  }

  const secret = decrypt(settings.encryptedSecret);
  const ok = verifyTotpCode(secret, code);
  if (!ok) {
    return NextResponse.json({ error: "Invalid MFA code" }, { status: 400 });
  }

  const redis = await getRedisClient();
  if (!redis) {
    return NextResponse.json({ error: "MFA infrastructure is not available" }, { status: 503 });
  }

  await redis.set(`mfa:verified:${userId}`, "true", { EX: MFA_VERIFIED_TTL_SECONDS });

  return NextResponse.json({ success: true });
}
