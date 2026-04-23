import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";
import mongoose from "mongoose";

// Mark single or all notifications as read
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const userId = new mongoose.Types.ObjectId((session.user as any).id);
        const body = await req.json().catch(() => ({}));
        const { notificationId, markAll } = body;

        if (markAll) {
            // Mark all as read for this user
            await Notification.updateMany(
                { readBy: { $ne: userId } },
                { $addToSet: { readBy: userId } }
            );
        } else if (notificationId) {
            // Mark single notification as read
            await Notification.findByIdAndUpdate(notificationId, {
                $addToSet: { readBy: userId },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}
