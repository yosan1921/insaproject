import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import RiskAnalysis from '@/models/RiskAnalysis';
import {
    calculateFinancialRisk,
    estimateExposureFactorFromRiskScore,
    estimateAROFromSeverity,
    formatCurrency,
    categorizeALE,
} from '@/lib/services/financialRiskService';

/**
 * POST /api/analysis/financial-risk
 * Calculate and save financial risk (ALE/SLE) for a specific risk
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            questionnaireId,
            questionId,
            level,
            assetValue,
            exposureFactor,
            aro,
            currency = 'USD',
            autoCalculate = false, // If true, estimate EF and ARO from risk score
        } = body;

        if (!questionnaireId || questionId === undefined || !level) {
            return NextResponse.json(
                { error: 'questionnaireId, questionId, and level are required' },
                { status: 400 }
            );
        }

        if (!assetValue || assetValue <= 0) {
            return NextResponse.json(
                { error: 'assetValue must be greater than 0' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Find the risk analysis
        const analysis = await RiskAnalysis.findOne({ questionnaireId });
        if (!analysis) {
            return NextResponse.json({ error: 'Risk analysis not found' }, { status: 404 });
        }

        // Find the specific question
        const questions = analysis[level as keyof typeof analysis] as any[];
        const questionIndex = questions.findIndex((q: any) => q.questionId === questionId);

        if (questionIndex === -1) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        const question = questions[questionIndex];

        // Calculate or use provided values
        let finalExposureFactor = exposureFactor;
        let finalARO = aro;

        if (autoCalculate) {
            // Estimate from risk score and severity
            const riskScore = question.analysis?.riskScore || 0;
            const riskLevel = question.analysis?.riskLevel || 'MEDIUM';

            finalExposureFactor = estimateExposureFactorFromRiskScore(riskScore);
            finalARO = estimateAROFromSeverity(riskLevel);

            console.log(`📊 [FinancialRisk] Auto-calculated: EF=${finalExposureFactor.toFixed(2)}, ARO=${finalARO}`);
        } else {
            // Validate provided values
            if (finalExposureFactor === undefined || finalExposureFactor < 0 || finalExposureFactor > 1) {
                return NextResponse.json(
                    { error: 'exposureFactor must be between 0 and 1' },
                    { status: 400 }
                );
            }
            if (finalARO === undefined || finalARO < 0) {
                return NextResponse.json(
                    { error: 'aro must be greater than or equal to 0' },
                    { status: 400 }
                );
            }
        }

        // Calculate financial risk
        const financialRisk = calculateFinancialRisk(
            assetValue,
            finalExposureFactor,
            finalARO,
            currency
        );

        // Update the question with financial risk data
        questions[questionIndex].analysis = {
            ...question.analysis,
            assetValue: financialRisk.assetValue,
            exposureFactor: financialRisk.exposureFactor,
            sle: financialRisk.sle,
            aro: financialRisk.aro,
            ale: financialRisk.ale,
            currency: financialRisk.currency,
        };

        // Save the updated analysis
        await analysis.save();

        const aleCategory = categorizeALE(financialRisk.ale);

        console.log(`✅ [FinancialRisk] Calculated for ${analysis.company}: ALE=${formatCurrency(financialRisk.ale, currency)}`);

        return NextResponse.json({
            success: true,
            financialRisk: {
                ...financialRisk,
                sleFormatted: formatCurrency(financialRisk.sle, currency),
                aleFormatted: formatCurrency(financialRisk.ale, currency),
                aleCategory,
            },
        });
    } catch (error: any) {
        console.error('❌ [FinancialRisk] Error:', error.message);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * GET /api/analysis/financial-risk?questionnaireId=xxx
 * Get financial risk summary for a questionnaire
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const questionnaireId = searchParams.get('questionnaireId');

        if (!questionnaireId) {
            return NextResponse.json(
                { error: 'questionnaireId is required' },
                { status: 400 }
            );
        }

        await dbConnect();

        const analysis = await RiskAnalysis.findOne({ questionnaireId }).lean();
        if (!analysis) {
            return NextResponse.json({ error: 'Risk analysis not found' }, { status: 404 });
        }

        // Collect all financial risks
        const allQuestions = [
            ...(analysis.operational || []),
            ...(analysis.tactical || []),
            ...(analysis.strategic || []),
        ];

        const financialRisks = allQuestions
            .filter((q: any) => q.analysis?.ale !== undefined)
            .map((q: any) => ({
                questionId: q.questionId,
                section: q.section,
                question: q.question,
                riskScore: q.analysis.riskScore,
                riskLevel: q.analysis.riskLevel,
                assetValue: q.analysis.assetValue,
                exposureFactor: q.analysis.exposureFactor,
                sle: q.analysis.sle,
                aro: q.analysis.aro,
                ale: q.analysis.ale,
                currency: q.analysis.currency || 'USD',
            }));

        // Calculate totals
        const totalALE = financialRisks.reduce((sum: number, r: any) => sum + r.ale, 0);
        const totalSLE = financialRisks.reduce((sum: number, r: any) => sum + r.sle, 0);
        const currency = financialRisks[0]?.currency || 'USD';

        const aleCategory = categorizeALE(totalALE);

        return NextResponse.json({
            success: true,
            company: analysis.company,
            totalRisks: financialRisks.length,
            totalALE,
            totalSLE,
            totalALEFormatted: formatCurrency(totalALE, currency),
            totalSLEFormatted: formatCurrency(totalSLE, currency),
            aleCategory,
            currency,
            risks: financialRisks,
        });
    } catch (error: any) {
        console.error('❌ [FinancialRisk] Error:', error.message);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
