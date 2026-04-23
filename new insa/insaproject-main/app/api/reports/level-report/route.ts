import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import RiskAnalysis from '@/models/RiskAnalysis';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const analysisId = searchParams.get('analysisId');
        const level = searchParams.get('level'); // strategic | tactical | operational

        if (!analysisId) return NextResponse.json({ error: 'Missing analysisId' }, { status: 400 });

        await dbConnect();
        const analysis = await RiskAnalysis.findById(analysisId).lean() as any;
        if (!analysis) return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });

        const levelData = level
            ? (analysis[level] || [])
            : [...(analysis.operational || []), ...(analysis.tactical || []), ...(analysis.strategic || [])];

        const levelSummary = analysis.summary?.[level || 'overall'] || {};

        return NextResponse.json({
            success: true,
            company: analysis.company,
            category: analysis.category,
            level: level || 'all',
            date: analysis.createdAt,
            analyses: levelData.map((a: any) => ({
                questionId: a.questionId,
                section: a.section,
                level: a.level,
                question: a.question,
                answer: a.answer,
                likelihood: a.analysis?.likelihood || 0,
                impact: a.analysis?.impact || 0,
                riskScore: a.analysis?.riskScore || 0,
                riskLevel: a.analysis?.riskLevel || 'UNKNOWN',
                gap: a.analysis?.gap || '',
                threat: a.analysis?.threat || '',
                mitigation: a.analysis?.mitigation || '',
            })),
            summary: levelSummary,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
