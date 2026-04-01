import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import MfaSettings from "@/models/MfaSettings";
import { encrypt } from "@/lib/security/encryption";
import { generateTotpSecret, getOtpauthUrl } from "@/lib/security/totp";

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

  await dbConnect();

  const userId = (session.user as any).id;

  // Always generate fresh secret so Authy stays in sync
  const finalSecret = generateTotpSecret();
  const encryptedSecret = encrypt(finalSecret);
  await MfaSettings.findOneAndUpdate(
    { userId },
    { $set: { encryptedSecret } },
    { upsert: true, new: true }
  );

  const email = session.user.email || "";
  const otpauthUrl = getOtpauthUrl({
    secret: finalSecret,
    accountName: email,
    issuer: "INSA Risk Management",
  });

  return NextResponse.json({
    secret: finalSecret,
    otpauthUrl,
  });
}
