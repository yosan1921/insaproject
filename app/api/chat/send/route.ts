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

  const { content, receiverId, fileUrl } = await req.json();

  if (!receiverId || (!content && !fileUrl)) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  await dbConnect();
  
  const userId = (session.user as any).id;

  const newMessage = await Message.create({
    senderId: userId,
    receiverId,
    content,
    fileUrl,
    status: 'sent',
    createdAt: new Date(),
  });

  return NextResponse.json(newMessage);
}
