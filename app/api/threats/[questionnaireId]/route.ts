import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ThreatIntelligence from '@/models/ThreatIntelligence';

export async function GET(_req: Request, { params }: { params: { questionnaireId: string } }) {
    try {
        await dbConnect();
        const threats = await ThreatIntelligence.find({ questionnaireId: params.questionnaireId })
            .sort({ fetchedAt: -1 })
            .lean();

        // Group by severity for summary
        const summary = {
            critical: threats.filter(t => t.severity === 'critical').length,
            high: threats.filter(t => t.severity === 'high').length,
            medium: threats.filter(t => t.severity === 'medium').length,
            low: threats.filter(t => t.severity === 'low').length,
            total: threats.length,
            maxEnhancedScore: threats.length > 0 ? Math.max(...threats.map(t => t.enhancedScore)) : 0,
        };

        return NextResponse.json({ success: true, threats, summary });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
