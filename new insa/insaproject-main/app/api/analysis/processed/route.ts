// eslint-disable-line @typescript-eslint/no-explicit-any
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import RiskAnalysis from "@/models/RiskAnalysis";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const role = (session.user as any).role;
        const userId = (session.user as any).id;

        let filter: any = {};

        // Staff and Risk Analyst: only see assigned analyses
        if (role === 'Staff' || role === 'Risk Analyst') {
            const { default: Assignment } = await import('@/models/Assignment');
            const mongoose = await import('mongoose');
            const userObjectId = new mongoose.Types.ObjectId(userId);
            const assignments = await Assignment.find({ assignedTo: userObjectId }).select('analysisId').lean();
            const assignedIds = assignments.map((a: any) => a.analysisId);
            if (assignedIds.length === 0) {
                return NextResponse.json({ success: true, assessments: [] });
            }
            filter = { _id: { $in: assignedIds } };
        }
        // Director and Division Head see all analyses

        const analyses = await RiskAnalysis.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        const formattedAnalyses = analyses.map(analysis => {
            // Combine all analyses from all levels
            const allAnalyses = [
                ...(analysis.operational || []),
                ...(analysis.tactical || []),
                ...(analysis.strategic || [])
            ];

            // Create risk matrix data for visualization
            const riskMatrix: { [key: string]: number } = {};
            allAnalyses.forEach((item: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                const key = `${item.analysis.likelihood}-${item.analysis.impact}`;
                riskMatrix[key] = (riskMatrix[key] || 0) + 1;
            });

            const riskMatrixArray = Object.entries(riskMatrix).map(([key, count]) => {
                const [likelihood, impact] = key.split('-').map(Number);
                return { likelihood, impact, count };
            });

            return {
                _id: analysis._id.toString(),
                riskRegisterId: analysis.riskRegisterId || 'N/A',
                company: analysis.company,
                category: analysis.category,
                date: analysis.createdAt,
                analyses: allAnalyses.map((a: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
                    questionId: a.questionId,
                    level: a.level,
                    question: a.question,
                    answer: a.answer,

                    // New fields
                    riskName: a.analysis?.riskName || '',
                    description: a.analysis?.description || '',
                    status: a.analysis?.status || 'Open',
                    riskType: a.analysis?.riskType || 'Risk',
                    threatOpportunity: a.analysis?.threatOpportunity || 'Threat',
                    assignedTo: a.analysis?.assignedTo || '',

                    // Pre-Mitigation
                    preMitigationProbability: a.analysis?.preMitigation?.probability || 0,
                    preMitigationImpact: a.analysis?.preMitigation?.impact || 0,
                    preMitigationScore: a.analysis?.preMitigation?.score || 0,
                    preMitigationCost: a.analysis?.preMitigation?.cost || 0,

                    // Current values
                    likelihood: a.analysis?.likelihood || 0,
                    impact: a.analysis?.impact || 0,
                    riskScore: a.analysis?.riskScore || 0,
                    riskLevel: a.analysis?.riskLevel || 'UNKNOWN',

                    // Post-Mitigation
                    postMitigationProbability: a.analysis?.postMitigation?.probability || 0,
                    postMitigationImpact: a.analysis?.postMitigation?.impact || 0,
                    postMitigationScore: a.analysis?.postMitigation?.score || 0,
                    postMitigationCost: a.analysis?.postMitigation?.cost || 0,

                    // Mitigation details
                    mitigationCost: a.analysis?.mitigationCost || 0,
                    gap: a.analysis?.gap || '',
                    threat: a.analysis?.threat || '',
                    mitigation: a.analysis?.mitigation || '',
                    impactLabel: a.analysis?.impactLabel || '',
                    impactDescription: a.analysis?.impactDescription || ''
                })),
                riskMatrix: riskMatrixArray,
                summary: analysis.summary
            };
        });

        return NextResponse.json({
            success: true,
            assessments: formattedAnalyses
        });
    } catch (error) {
        console.error("Error fetching processed analyses:", error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({
            error: message || "Failed to fetch analyses"
        }, { status: 500 });
    }
}
