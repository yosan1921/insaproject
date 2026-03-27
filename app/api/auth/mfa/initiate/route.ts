import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mfaInitiateSchema } from "@/lib/validation/authSchemas";
import { getRedisClient } from "@/lib/services/redis";
import bcrypt from "bcryptjs";
import { writeAuditLog } from "@/lib/logging/auditLogger";
import { mailEnabled, sendMail } from "@/lib/mail/mailer";
import { baseTemplate } from "@/lib/mail/templates/baseTemplate";

const MFA_CODE_TTL_SECONDS = 5 * 60; // 5 minutes

function isMfaEnabled() {
  return process.env.MFA_ENABLED === "true";
}

function mfaDependenciesAvailable() {
  return !!process.env.REDIS_URL && mailEnabled;
}

export async function POST(req: NextRequest) {
  if (!isMfaEnabled()) {
    return NextResponse.json({ error: "MFA is not enabled" }, { status: 400 });
  }

  if (!mfaDependenciesAvailable()) {
    // Do not break login behavior if infra is missing
    return NextResponse.json({ error: "MFA infrastructure is not configured" }, { status: 503 });
  }

  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = mfaInitiateSchema.safeParse(json);

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

  // Check that MFA is actually required for this user
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

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await bcrypt.hash(code, 10);

  await redis.set(`mfa:code:${userId}`, codeHash, { EX: MFA_CODE_TTL_SECONDS });

  await writeAuditLog({
    action: "MFA_CHALLENGE",
    userId,
    details: { email: sessionEmail },
  });

  const emailHtml = baseTemplate(`
    <p>Dear ${session.user.name || "user"},</p>
    <p>Your one-time security code for the INSA Risk Management System is:</p>
    <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
    <p>This code will expire in 5 minutes. If you did not attempt to sign in, please contact your administrator immediately.</p>
  `);

  await sendMail({
    to: sessionEmail,
    subject: "Your INSA MFA security code",
    html: emailHtml,
  });

  return NextResponse.json({ message: "MFA code sent" });
}
