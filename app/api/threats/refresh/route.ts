import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchAndSaveThreats } from '@/lib/services/threatIntelService';
import dbConnect from '@/lib/mongodb';
import Questionnaire from '@/models/Questionnaire';

/**
 * POST /api/threats/refresh
 * Refresh threat intelligence for a specific questionnaire
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { questionnaireId } = await request.json();

        if (!questionnaireId) {
            return NextResponse.json({ error: 'questionnaireId is required' }, { status: 400 });
        }

        await dbConnect();

        // Get questionnaire details
        const questionnaire = await Questionnaire.findById(questionnaireId).lean();
        if (!questionnaire) {
            return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 });
        }

        console.log(`🔄 [ThreatRefresh] Starting refresh for ${questionnaire.company}...`);

        // Get risk analysis to pass actual risk scores
        let overallRiskScore = 0;
        try {
            const RiskAnalysis = (await import('@/models/RiskAnalysis')).default;
            const analysis = await RiskAnalysis.findOne({ questionnaireId }).lean();
            if (analysis) {
                // Calculate average risk score from all questions
                const allQuestions = [
                    ...(analysis.operational || []),
                    ...(analysis.tactical || []),
                    ...(analysis.strategic || []),
                ];
                const scores = allQuestions.map((q: any) => q.analysis?.riskScore || 0);
                overallRiskScore = scores.length > 0
                    ? Math.round(scores.reduce((sum: number, s: number) => sum + s, 0) / scores.length)
                    : 0;
                console.log(`📊 [ThreatRefresh] Using average risk score: ${overallRiskScore}/25`);
            } else {
                console.warn('⚠️ [ThreatRefresh] No risk analysis found, using default score 0');
            }
        } catch (err) {
            console.warn('⚠️ [ThreatRefresh] Could not fetch risk analysis:', err);
        }

        // Fetch threats with force refresh
        const result = await fetchAndSaveThreats({
            questionnaireId,
            company: questionnaire.company,
            originalRiskScore: overallRiskScore,
            forceRefresh: true,
        });

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: 'Threat refresh failed',
                errors: result.errors,
            }, { status: 500 });
        }

        console.log(`✅ [ThreatRefresh] Completed for ${questionnaire.company}: ${result.threatsFound} threats`);

        return NextResponse.json({
            success: true,
            threatsFound: result.threatsFound,
            errors: result.errors,
            message: result.errors.length > 0
                ? `Refreshed ${result.threatsFound} threats with ${result.errors.length} errors`
                : `Successfully refreshed ${result.threatsFound} threats`,
        });
    } catch (error: any) {
        console.error('❌ [ThreatRefresh] Error:', error.message);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to refresh threats',
        }, { status: 500 });
    }
}
