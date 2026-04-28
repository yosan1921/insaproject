import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ThreatIntelligence from '@/models/ThreatIntelligence';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            console.warn('⚠️ [Threats API] Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        console.log('✅ [Threats API] Database connected');

        // Try to fetch threats with population
        let threats;
        try {
            threats = await ThreatIntelligence.find({})
                .populate('assetId', 'ip hostname os deviceType openPorts')
                .sort({ fetchedAt: -1 })
                .lean();
            console.log(`✅ [Threats API] Found ${threats.length} threats`);
        } catch (populateError: any) {
            console.warn('⚠️ [Threats API] Population failed, fetching without populate:', populateError.message);
            // Fallback: fetch without populate
            threats = await ThreatIntelligence.find({})
                .sort({ fetchedAt: -1 })
                .lean();
            console.log(`✅ [Threats API] Found ${threats.length} threats (without asset details)`);
        }

        return NextResponse.json({ success: true, threats });
    } catch (error: any) {
        console.error('❌ [Threats API] Error:', error.message);
        console.error('Stack:', error.stack);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
