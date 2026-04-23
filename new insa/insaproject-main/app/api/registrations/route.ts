import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Registration from '@/models/Registration';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await dbConnect();
        const registrations = await Registration.find({}).sort({ registeredAt: -1 }).lean();
        return NextResponse.json({ success: true, registrations });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
