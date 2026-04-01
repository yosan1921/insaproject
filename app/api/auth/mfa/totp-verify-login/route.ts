import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import MfaSettings from "@/models/MfaSettings";
import { decrypt } from "@/lib/security/encryption";
import { verifyTotpCode, generateTotpCode } from "@/lib/security/totp";

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
  const expected = generateTotpCode(secret);
  console.log('[MFA] Expected:', expected, 'Received:', code, 'Secret length:', secret.length);
  const ok = verifyTotpCode(secret, code);
  if (!ok) {
    return NextResponse.json({ error: "Invalid MFA code" }, { status: 400 });
  }

  // Store verified flag in Redis if available (optional, for distributed setups)
  try {
    const { getRedisClient } = await import('@/lib/services/redis');
    const redis = await getRedisClient();
    if (redis) {
      await redis.set(`mfa:verified:${userId}`, "true", { EX: 60 * 60 });
    }
  } catch {
    // Redis is optional - JWT will handle verification state
  }

  return NextResponse.json({ success: true, mfaVerified: true });
}
