import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";
import mongoose from "mongoose";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ count: 0 });
        }

        await dbConnect();
        const userId = new mongoose.Types.ObjectId((session.user as any).id);
        const role = (session.user as any).role;

        // Apply same RBAC filter as notifications list
        let typeFilter: object = {};
        if (role === 'Staff' || role === 'Risk Analyst') {
            typeFilter = { type: { $in: ['questionnaire', 'analysis'] } };
        }

        const count = await Notification.countDocuments({
            ...typeFilter,
            readBy: { $ne: userId },
        });

        return NextResponse.json({ count });
    } catch (error) {
        return NextResponse.json({ count: 0 });
    }
}
