import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import RiskAnalysis from '@/models/RiskAnalysis';
import { validateCVSSAnalysis } from '@/lib/services/cvssValidationService';

/**
 * POST /api/analysis/cvss-validate
 * Validate CVSS analysis for a specific risk analysis or question
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const body = await req.json();
        const { analysisId, questionId, level } = body;

        if (!analysisId) {
            return NextResponse.json(
                { error: 'analysisId is required' },
                { status: 400 }
            );
        }

        // Fetch the risk analysis
        const riskAnalysis = await RiskAnalysis.findById(analysisId);
        if (!riskAnalysis) {
            return NextResponse.json(
                { error: 'Risk analysis not found' },
                { status: 404 }
            );
        }

        // If questionId and level are provided, validate specific question
        if (questionId !== undefined && level) {
            const questions = riskAnalysis[level as 'operational' | 'tactical' | 'strategic'];
            const question = questions?.find((q: any) => q.questionId === questionId);

            if (!question) {
                return NextResponse.json(
                    { error: 'Question not found in analysis' },
                    { status: 404 }
                );
            }

            // Validate the specific question's CVSS data
            const validationResult = validateCVSSAnalysis({
                cvssScore: question.analysis?.cvssScore,
                cvssSeverity: question.analysis?.cvssSeverity,
                cvssMetrics: question.analysis?.cvssMetrics,
                likelihood: question.analysis?.likelihood,
                impact: question.analysis?.impact,
                riskLevel: question.analysis?.riskLevel,
                stored: true, // It's stored if we found it
                previousCVSS: undefined // TODO: Implement history tracking
            });

            return NextResponse.json({
                success: true,
                questionId,
                level,
                validation: validationResult
            });
        }

        // Otherwise, validate all questions in the analysis
        const allQuestions = [
            ...(riskAnalysis.operational || []),
            ...(riskAnalysis.tactical || []),
            ...(riskAnalysis.strategic || [])
        ];

        const validations = allQuestions.map((question: any) => {
            const result = validateCVSSAnalysis({
                cvssScore: question.analysis?.cvssScore,
                cvssSeverity: question.analysis?.cvssSeverity,
                cvssMetrics: question.analysis?.cvssMetrics,
                likelihood: question.analysis?.likelihood,
                impact: question.analysis?.impact,
                riskLevel: question.analysis?.riskLevel,
                stored: true,
                previousCVSS: undefined
            });

            return {
                questionId: question.questionId,
                level: question.level,
                validation: result
            };
        });

        // Calculate overall statistics
        const totalQuestions = validations.length;
        const doneCount = validations.filter(v => v.validation.status === 'DONE').length;
        const partialCount = validations.filter(v => v.validation.status === 'PARTIALLY DONE').length;
        const notDoneCount = validations.filter(v => v.validation.status === 'NOT DONE').length;

        return NextResponse.json({
            success: true,
            analysisId,
            summary: {
                total: totalQuestions,
                done: doneCount,
                partiallyDone: partialCount,
                notDone: notDoneCount,
                overallStatus: notDoneCount > 0 ? 'NOT DONE' : partialCount > 0 ? 'PARTIALLY DONE' : 'DONE'
            },
            validations
        });

    } catch (error: any) {
        console.error('❌ CVSS validation error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
