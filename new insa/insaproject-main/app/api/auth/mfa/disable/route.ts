import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import MfaSettings from "@/models/MfaSettings";
import bcrypt from "bcryptjs";
import { getRedisClient } from "@/lib/services/redis";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null as any);
  const password = json?.password as string | undefined;

  if (!password || password.length < 4) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  await dbConnect();

  const userId = (session.user as any).id;
  const user = await User.findById(userId).select("password");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return NextResponse.json({ error: "Invalid password" }, { status: 400 });
  }

  await MfaSettings.deleteOne({ userId });

  const redis = await getRedisClient();
  if (redis) {
    try {
      await redis.del(`mfa:verified:${userId}`);
      await redis.del(`mfa:code:${userId}`);
    } catch {
      // ignore redis errors
    }
  }

  return NextResponse.json({ success: true });
}
