import { NextRequest, NextResponse } from "next/server";
import Message from "@/lib/models/Message";
import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const partnerId = url.searchParams.get("partner");

  if (!partnerId) {
    return NextResponse.json({ error: "Partner ID is required" }, { status: 400 });
  }

  await dbConnect();
  
  const userId = (session.user as any).id;

  const messages = await Message.find({
    $or: [
      { senderId: userId, receiverId: partnerId },
      { senderId: partnerId, receiverId: userId },
    ],
  })
    .sort({ createdAt: 1 }) // Chronological order
    .limit(50)
    .lean();

  return NextResponse.json(messages);
}
