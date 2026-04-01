import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Message from "@/lib/models/Message";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";

  await dbConnect();

  const filter: any = {
    email: { $ne: session.user?.email }, // Don't show current user
  };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(filter)
    .select("email role name lastActive")
    .limit(20)
    .lean();

  // Enrich with message info
  const enrichedUsers = await Promise.all(users.map(async (u: any) => {
    // Find the latest message in the conversation
    const lastMsg: any = await Message.findOne({
      $or: [
        { senderId: userId, receiverId: String(u._id) },
        { senderId: String(u._id), receiverId: userId },
      ]
    }).sort({ createdAt: -1 }).lean();

    const unreadCount = await Message.countDocuments({
      senderId: String(u._id),
      receiverId: userId,
      status: { $ne: 'read' }
    });

    return {
      ...u,
      lastMessage: lastMsg ? {
        content: lastMsg.content,
        createdAt: lastMsg.createdAt
      } : null,
      unreadCount
    };
  }));

  return NextResponse.json(enrichedUsers);
}
