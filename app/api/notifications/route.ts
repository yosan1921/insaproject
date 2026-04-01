import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const userId = (session.user as any).id;
        const role = (session.user as any).role;

        // All roles see all notifications (RBAC can be extended later)
        const notifications = await Notification.find({})
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        const formatted = notifications.map((n: any) => ({
            id: n._id.toString(),
            type: n.type,
            severity: n.severity,
            title: n.title,
            message: n.message,
            link: n.link || null,
            read: n.readBy?.some((id: any) => id.toString() === userId) || false,
            date: n.createdAt,
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
}
