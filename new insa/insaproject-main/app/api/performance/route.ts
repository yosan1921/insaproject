import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import RiskAnalysis from '@/models/RiskAnalysis';
import Questionnaire from '@/models/Questionnaire';
import Asset from '@/models/Asset';
import ThreatIntelligence from '@/models/ThreatIntelligence';
import User from '@/models/User';
import Notification from '@/models/Notification';
import Feedback from '@/models/Feedback';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();

        const [
            totalAssessments,
            totalQuestionnaires,
            totalAssets,
            totalThreats,
            totalUsers,
            totalNotifications,
            totalFeedback,
            recentAssessments,
        ] = await Promise.all([
            RiskAnalysis.countDocuments(),
            Questionnaire.countDocuments(),
            Asset.countDocuments(),
            ThreatIntelligence.countDocuments(),
            User.countDocuments(),
            Notification.countDocuments(),
            Feedback.countDocuments(),
            RiskAnalysis.find({}).sort({ createdAt: -1 }).limit(5).select('company category summary createdAt').lean(),
        ]);

        // Calculate average risk score and critical/high counts
        const allAnalyses = await RiskAnalysis.find({}).select('summary').lean();
        let totalScore = 0;
        let criticalCount = 0;
        let highCount = 0;
        let scoreCount = 0;

        for (const a of allAnalyses) {
            const overall = (a as any).summary?.overall;
            if (overall?.averageRiskScore) {
                totalScore += overall.averageRiskScore;
                scoreCount++;
            }
            criticalCount += overall?.riskDistribution?.CRITICAL || 0;
            highCount += overall?.riskDistribution?.HIGH || 0;
        }

        const avgRiskScore = scoreCount > 0 ? Math.round((totalScore / scoreCount) * 100) / 100 : 0;

        return NextResponse.json({
            success: true,
            metrics: {
                totalAssessments,
                totalQuestionnaires,
                totalAssets,
                totalThreats,
                totalUsers,
                totalNotifications,
                totalFeedback,
                avgRiskScore,
                criticalCount,
                highCount,
                recentAssessments,
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
