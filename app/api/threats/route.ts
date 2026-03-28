import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ThreatIntelligence from '@/models/ThreatIntelligence';

export async function GET() {
    try {
        await dbConnect();
        const threats = await ThreatIntelligence.find({})
            .sort({ fetchedAt: -1 })
            .lean();
        return NextResponse.json({ success: true, threats });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
