import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import RiskAnalysis from '@/models/RiskAnalysis';

// ALE = ARO × SLE
// SLE = Asset Value × Exposure Factor
// ARO = Annual Rate of Occurrence (derived from likelihood)
// Exposure Factor = percentage of asset value lost per incident

function likelihoodToARO(likelihood: number): number {
    // Convert 1-5 likelihood to Annual Rate of Occurrence
    const aroMap: Record<number, number> = {
        1: 0.1,  // Remote: once every 10 years
        2: 0.5,  // Low: once every 2 years
        3: 1.0,  // Moderate: once per year
        4: 2.0,  // High: twice per year
        5: 4.0,  // Almost Certain: 4 times per year
    };
    return aroMap[likelihood] || 1.0;
}

function impactToExposureFactor(impact: number): number {
    // Convert 1-5 impact to exposure factor (0-1)
    const efMap: Record<number, number> = {
        1: 0.1,  // Minimal: 10% loss
        2: 0.25, // Low: 25% loss
        3: 0.5,  // Moderate: 50% loss
        4: 0.75, // High: 75% loss
        5: 1.0,  // Critical: 100% loss
    };
    return efMap[impact] || 0.5;
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const analysisId = searchParams.get('analysisId');
        const assetValue = parseFloat(searchParams.get('assetValue') || '1000000'); // Default $1M

        if (!analysisId) return NextResponse.json({ error: 'Missing analysisId' }, { status: 400 });

        await dbConnect();
        const analysis = await RiskAnalysis.findById(analysisId).lean() as any;
        if (!analysis) return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });

        const allAnalyses = [
            ...(analysis.operational || []),
            ...(analysis.tactical || []),
            ...(analysis.strategic || []),
        ];

        let totalALE = 0;
        const calculations = allAnalyses.map((a: any) => {
            const likelihood = a.analysis?.likelihood || 3;
            const impact = a.analysis?.impact || 3;
            const aro = likelihoodToARO(likelihood);
            const ef = impactToExposureFactor(impact);
            const sle = assetValue * ef;
            const ale = aro * sle;
            totalALE += ale;

            return {
                question: a.question?.substring(0, 60) || '',
                riskLevel: a.analysis?.riskLevel || 'UNKNOWN',
                likelihood,
                impact,
                aro,
                exposureFactor: ef,
                sle: Math.round(sle),
                ale: Math.round(ale),
            };
        });

        // Sort by ALE descending
        calculations.sort((a, b) => b.ale - a.ale);

        return NextResponse.json({
            success: true,
            company: analysis.company,
            assetValue,
            totalALE: Math.round(totalALE),
            annualLossExpectancy: Math.round(totalALE),
            topRisks: calculations.slice(0, 10),
            allCalculations: calculations,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
