import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import RiskAnalysis from '@/models/RiskAnalysis';

// GET: fetch treatment options for an analysis
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const analysisId = searchParams.get('analysisId');
        if (!analysisId) return NextResponse.json({ error: 'Missing analysisId' }, { status: 400 });

        await dbConnect();
        const analysis = await RiskAnalysis.findById(analysisId).lean() as any;
        if (!analysis) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Combine all levels with level info preserved
        const allAnalyses: any[] = [
            ...(analysis.operational || []).map((a: any) => ({ ...a, _level: 'operational' })),
            ...(analysis.tactical || []).map((a: any) => ({ ...a, _level: 'tactical' })),
            ...(analysis.strategic || []).map((a: any) => ({ ...a, _level: 'strategic' })),
        ];

        const treatments = allAnalyses.map((a: any, idx: number) => ({
            idx,
            questionId: a.questionId,
            level: a._level,
            question: a.question,
            riskLevel: a.analysis?.riskLevel || 'UNKNOWN',
            riskScore: a.analysis?.riskScore || 0,
            inherentRisk: a.analysis?.riskScore || 0,
            residualRisk: a.analysis?.residualRisk ?? null,
            treatmentOption: a.analysis?.treatmentOption || null,
            treatmentNote: a.analysis?.treatmentNote || '',
        }));

        return NextResponse.json({ success: true, treatments, company: analysis.company });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: save treatment option using global idx
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { analysisId, questionIdx, treatmentOption, residualRisk, treatmentNote } = await request.json();

        if (!analysisId || questionIdx === undefined || !treatmentOption) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await dbConnect();
        const analysis = await RiskAnalysis.findById(analysisId);
        if (!analysis) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Build flat combined list same as GET
        const operational = (analysis as any).operational || [];
        const tactical = (analysis as any).tactical || [];
        const strategic = (analysis as any).strategic || [];

        const combined = [
            ...operational.map((a: any, i: number) => ({ level: 'operational', localIdx: i })),
            ...tactical.map((a: any, i: number) => ({ level: 'tactical', localIdx: i })),
            ...strategic.map((a: any, i: number) => ({ level: 'strategic', localIdx: i })),
        ];

        const target = combined[questionIdx];
        if (!target) {
            return NextResponse.json({ error: 'Question not found at index ' + questionIdx }, { status: 404 });
        }

        // Update the correct question in the correct level array
        const arr = (analysis as any)[target.level] as any[];
        arr[target.localIdx].analysis = {
            ...arr[target.localIdx].analysis,
            treatmentOption,
            residualRisk: residualRisk !== undefined && residualRisk !== null && residualRisk !== ''
                ? Number(residualRisk)
                : arr[target.localIdx].analysis?.riskScore,
            treatmentNote: treatmentNote || '',
        };

        analysis.markModified('operational');
        analysis.markModified('tactical');
        analysis.markModified('strategic');
        await analysis.save();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
