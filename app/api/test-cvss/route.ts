import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import RiskAnalysis from '@/models/RiskAnalysis';

/**
 * Test endpoint to check if CVSS and ALE data exists in database
 * GET /api/test-cvss
 */
export async function GET() {
    try {
        await dbConnect();

        // Get the most recent analysis
        const analysis = await RiskAnalysis.findOne().sort({ createdAt: -1 }).lean();

        if (!analysis) {
            return NextResponse.json({
                success: false,
                message: 'No analyses found in database'
            });
        }

        // Check operational questions for CVSS and ALE data
        const operational = analysis.operational || [];
        const sampleQuestion = operational[0];

        const cvssExists = sampleQuestion?.analysis?.cvssScore !== undefined;
        const aleExists = sampleQuestion?.analysis?.ale !== undefined;

        return NextResponse.json({
            success: true,
            company: analysis.company,
            totalQuestions: operational.length,
            sampleQuestion: {
                questionId: sampleQuestion?.questionId,
                question: sampleQuestion?.question?.substring(0, 50),

                // CVSS Data
                hasCVSS: cvssExists,
                cvssScore: sampleQuestion?.analysis?.cvssScore,
                cvssSeverity: sampleQuestion?.analysis?.cvssSeverity,
                cvssMetrics: sampleQuestion?.analysis?.cvssMetrics,

                // ALE/SLE Data
                hasALE: aleExists,
                assetValue: sampleQuestion?.analysis?.assetValue,
                exposureFactor: sampleQuestion?.analysis?.exposureFactor,
                sle: sampleQuestion?.analysis?.sle,
                aro: sampleQuestion?.analysis?.aro,
                ale: sampleQuestion?.analysis?.ale,
                currency: sampleQuestion?.analysis?.currency,

                threat: sampleQuestion?.analysis?.threat
            },
            allQuestions: operational.map((q: any) => ({
                questionId: q.questionId,
                hasCVSS: q.analysis?.cvssScore !== undefined,
                cvssScore: q.analysis?.cvssScore,
                hasALE: q.analysis?.ale !== undefined,
                ale: q.analysis?.ale
            }))
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
