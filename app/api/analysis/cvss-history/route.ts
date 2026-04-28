import { NextRequest, NextResponse } from 'next/server';
import { getCVSSHistory } from '@/lib/services/cvssIntegrationService';

/**
 * GET /api/analysis/cvss-history
 * Get CVSS score history for a specific risk
 * 
 * Query params:
 * - questionnaireId: string (required)
 * - questionId: number (required)
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const questionnaireId = searchParams.get('questionnaireId');
        const questionIdStr = searchParams.get('questionId');

        if (!questionnaireId || !questionIdStr) {
            return NextResponse.json(
                { error: 'Missing required parameters: questionnaireId and questionId' },
                { status: 400 }
            );
        }

        const questionId = parseInt(questionIdStr, 10);
        if (isNaN(questionId)) {
            return NextResponse.json(
                { error: 'Invalid questionId: must be a number' },
                { status: 400 }
            );
        }

        const history = await getCVSSHistory({ questionnaireId, questionId });

        return NextResponse.json({
            success: true,
            questionnaireId,
            questionId,
            history,
            count: history.length
        });

    } catch (error: any) {
        console.error('❌ [API] CVSS history error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch CVSS history', details: error.message },
            { status: 500 }
        );
    }
}
