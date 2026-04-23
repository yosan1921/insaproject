import { NextRequest, NextResponse } from "next/server";
import Message from "@/lib/models/Message";
import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { partnerId } = await req.json();

  if (!partnerId) {
    return NextResponse.json({ error: "Partner ID is required" }, { status: 400 });
  }

  await dbConnect();
  
  const userId = (session.user as any).id;

  // Mark all messages from partner to me as read
  await Message.updateMany(
    { senderId: partnerId, receiverId: userId, status: { $ne: 'read' } },
    { $set: { status: 'read' } }
  );

  return NextResponse.json({ success: true });
}
