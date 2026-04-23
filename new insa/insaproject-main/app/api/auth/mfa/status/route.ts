import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import MfaSettings from "@/models/MfaSettings";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const userId = (session.user as any).id;
  const settings = await MfaSettings.findOne({ userId }).lean();

  return NextResponse.json({ totpEnabled: !!settings });
}
