import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import RiskAnalysis from '@/models/RiskAnalysis';
import { calculateCVSSScore } from '@/lib/services/cvssService';

/**
 * PATCH /api/analysis/cvss-update
 * Update risk analysis with CVSS metrics and scores
 */
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const body = await req.json();
        const { analysisId, questionId, level, cvssMetrics } = body;

        if (!analysisId || questionId === undefined || !level || !cvssMetrics) {
            return NextResponse.json(
                { error: 'analysisId, questionId, level, and cvssMetrics are required' },
                { status: 400 }
            );
        }

        // Validate level
        if (!['operational', 'tactical', 'strategic'].includes(level)) {
            return NextResponse.json(
                { error: 'Invalid level. Must be operational, tactical, or strategic' },
                { status: 400 }
            );
        }

        // Calculate CVSS score from metrics
        const cvssResult = calculateCVSSScore(cvssMetrics);

        // Find the risk analysis
        const riskAnalysis = await RiskAnalysis.findById(analysisId);
        if (!riskAnalysis) {
            return NextResponse.json(
                { error: 'Risk analysis not found' },
                { status: 404 }
            );
        }

        // Find the specific question
        const questions = riskAnalysis[level as 'operational' | 'tactical' | 'strategic'];
        const questionIndex = questions?.findIndex((q: any) => q.questionId === questionId);

        if (questionIndex === -1 || questionIndex === undefined) {
            return NextResponse.json(
                { error: 'Question not found in analysis' },
                { status: 404 }
            );
        }

        // Update the question with CVSS data
        const updatePath = `${level}.${questionIndex}.analysis`;
        await RiskAnalysis.updateOne(
            { _id: analysisId },
            {
                $set: {
                    [`${updatePath}.cvssScore`]: cvssResult.baseScore,
                    [`${updatePath}.cvssSeverity`]: cvssResult.baseSeverity,
                    [`${updatePath}.cvssMetrics`]: cvssMetrics,
                    [`${updatePath}.cvssVectorString`]: cvssResult.vectorString
                }
            }
        );

        console.log(`✅ Updated CVSS for question ${questionId} in ${level} level: Score ${cvssResult.baseScore}`);

        return NextResponse.json({
            success: true,
            message: 'CVSS data updated successfully',
            cvss: {
                baseScore: cvssResult.baseScore,
                baseSeverity: cvssResult.baseSeverity,
                vectorString: cvssResult.vectorString,
                exploitabilityScore: cvssResult.exploitabilityScore,
                impactScore: cvssResult.impactScore
            }
        });

    } catch (error: any) {
        console.error('❌ CVSS update error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
