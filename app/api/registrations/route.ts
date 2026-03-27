import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Registration from '@/models/Registration';

export async function GET() {
    try {
        await dbConnect();
        const registrations = await Registration.find({}).sort({ registeredAt: -1 }).lean();
        return NextResponse.json({ success: true, registrations });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
