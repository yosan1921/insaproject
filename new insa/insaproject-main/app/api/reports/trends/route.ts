import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import RiskAnalysis from '@/models/RiskAnalysis';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const company = searchParams.get('company');

        await dbConnect();

        const filter = company ? { company } : {};
        const analyses = await RiskAnalysis.find(filter)
            .sort({ createdAt: 1 })
            .select('company category createdAt summary')
            .lean();

        const trends = analyses.map((a: any) => ({
            id: a._id.toString(),
            company: a.company,
            category: a.category,
            date: a.createdAt,
            averageRiskScore: a.summary?.overall?.averageRiskScore || 0,
            critical: a.summary?.overall?.riskDistribution?.CRITICAL || 0,
            high: a.summary?.overall?.riskDistribution?.HIGH || 0,
            medium: a.summary?.overall?.riskDistribution?.MEDIUM || 0,
            low: a.summary?.overall?.riskDistribution?.LOW || 0,
            total: a.summary?.overall?.totalQuestionsAnalyzed || 0,
        }));

        // Group by company for comparison
        const byCompany: Record<string, any[]> = {};
        for (const t of trends) {
            if (!byCompany[t.company]) byCompany[t.company] = [];
            byCompany[t.company].push(t);
        }

        return NextResponse.json({ success: true, trends, byCompany });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
