import dbConnect from '@/lib/mongodb';
import Questionnaire from '@/models/Questionnaire';
import RiskAnalysis from '@/models/RiskAnalysis';

export interface SectorStats {
    sector: string;
    totalOrganizations: number;
    averageRiskScore: number;
    riskDistribution: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        veryLow: number;
    };
    topVulnerabilities: Array<{
        name: string;
        count: number;
        percentage: number;
    }>;
    complianceRate: number;
    trend?: {
        change: number;
        direction: 'up' | 'down' | 'stable';
    };
}

export interface OrganizationBenchmark {
    anonymousId: string;
    anonymousName: string;
    realName?: string;
    sector: string;
    riskScore: number;
    riskLevel: string;
    rank: number;
    assessmentDate: Date;
}

export interface NationalOverview {
    totalOrganizations: number;
    totalAssessments: number;
    nationalAverageScore: number;
    sectors: SectorStats[];
    lastUpdated: Date;
}

/**
 * Get national overview with all sectors
 */
export async function getNationalOverview(): Promise<NationalOverview> {
    await dbConnect();

    const questionnaires = await Questionnaire.find({}).lean();
    const analyses = await RiskAnalysis.find({}).lean();

    // Group by sector
    const sectorMap = new Map<string, any[]>();

    for (const q of questionnaires) {
        const sector = q.sector || 'Other';
        if (!sectorMap.has(sector)) {
            sectorMap.set(sector, []);
        }

        // Find corresponding analysis
        const analysis = analyses.find(a => String(a.questionnaireId) === String(q._id));
        if (analysis) {
            sectorMap.get(sector)!.push({ questionnaire: q, analysis });
        }
    }

    // Calculate stats for each sector
    const sectors: SectorStats[] = [];

    for (const [sector, data] of sectorMap.entries()) {
        if (data.length === 0) continue;

        const stats = calculateSectorStats(sector, data);
        sectors.push(stats);
    }

    // Sort sectors by average risk score (descending)
    sectors.sort((a, b) => b.averageRiskScore - a.averageRiskScore);

    // Calculate national average
    const totalScore = sectors.reduce((sum, s) => sum + (s.averageRiskScore * s.totalOrganizations), 0);
    const totalOrgs = sectors.reduce((sum, s) => sum + s.totalOrganizations, 0);
    const nationalAverage = totalOrgs > 0 ? totalScore / totalOrgs : 0;

    return {
        totalOrganizations: totalOrgs,
        totalAssessments: analyses.length,
        nationalAverageScore: Math.round(nationalAverage * 100) / 100,
        sectors,
        lastUpdated: new Date()
    };
}

/**
 * Get detailed stats for a specific sector
 */
export async function getSectorDetails(sectorName: string, showRealNames: boolean = false): Promise<SectorStats & { organizations: OrganizationBenchmark[] }> {
    await dbConnect();

    const questionnaires = await Questionnaire.find({ sector: sectorName }).lean();
    const analyses = await RiskAnalysis.find({
        questionnaireId: { $in: questionnaires.map(q => q._id) }
    }).lean();

    const data = questionnaires.map(q => {
        const analysis = analyses.find(a => String(a.questionnaireId) === String(q._id));
        return { questionnaire: q, analysis };
    }).filter(d => d.analysis);

    const stats = calculateSectorStats(sectorName, data);

    // Create organization list with optional real names
    const organizations: OrganizationBenchmark[] = data
        .map((d, index) => {
            const analysis = d.analysis!;
            const allAnalyses = [
                ...(analysis.operational || []),
                ...(analysis.tactical || []),
                ...(analysis.strategic || [])
            ];

            const totalScore = allAnalyses.reduce((sum, a) => sum + (a.analysis?.riskScore || 0), 0);
            const avgScore = allAnalyses.length > 0 ? totalScore / allAnalyses.length : 0;

            // Determine risk level
            let riskLevel = 'LOW';
            if (avgScore >= 20) riskLevel = 'CRITICAL';
            else if (avgScore >= 15) riskLevel = 'HIGH';
            else if (avgScore >= 10) riskLevel = 'MEDIUM';

            const org: OrganizationBenchmark = {
                anonymousId: `${sectorName.substring(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
                anonymousName: `${sectorName} Organization #${index + 1}`,
                sector: sectorName,
                riskScore: Math.round(avgScore * 100) / 100,
                riskLevel,
                rank: 0, // Will be set after sorting
                assessmentDate: d.questionnaire.filledDate || d.questionnaire.createdAt
            };

            // Add real name if authorized
            if (showRealNames && d.questionnaire.company) {
                org.realName = d.questionnaire.company;
            }

            return org;
        })
        .sort((a, b) => a.riskScore - b.riskScore); // Lower score is better

    // Assign ranks
    organizations.forEach((org, index) => {
        org.rank = index + 1;
    });

    return {
        ...stats,
        organizations
    };
}

/**
 * Compare multiple sectors
 */
export async function compareSectors(sectorNames: string[]): Promise<{
    sectors: SectorStats[];
    comparison: {
        bestPerforming: string;
        needsImprovement: string;
        insights: string[];
    };
}> {
    await dbConnect();

    const sectors: SectorStats[] = [];

    for (const sectorName of sectorNames) {
        const questionnaires = await Questionnaire.find({ sector: sectorName }).lean();
        const analyses = await RiskAnalysis.find({
            questionnaireId: { $in: questionnaires.map(q => q._id) }
        }).lean();

        const data = questionnaires.map(q => {
            const analysis = analyses.find(a => String(a.questionnaireId) === String(q._id));
            return { questionnaire: q, analysis };
        }).filter(d => d.analysis);

        if (data.length > 0) {
            sectors.push(calculateSectorStats(sectorName, data));
        }
    }

    // Determine best and worst
    const sorted = [...sectors].sort((a, b) => a.averageRiskScore - b.averageRiskScore);
    const bestPerforming = sorted[0]?.sector || 'N/A';
    const needsImprovement = sorted[sorted.length - 1]?.sector || 'N/A';

    // Generate insights
    const insights: string[] = [];

    if (sectors.length >= 2) {
        const scoreDiff = sorted[sorted.length - 1].averageRiskScore - sorted[0].averageRiskScore;
        insights.push(`${scoreDiff.toFixed(1)} point gap between best and worst performing sectors`);

        const highRiskSectors = sectors.filter(s => s.averageRiskScore >= 15);
        if (highRiskSectors.length > 0) {
            insights.push(`${highRiskSectors.length} sector(s) in HIGH risk category`);
        }

        const criticalCount = sectors.reduce((sum, s) => sum + s.riskDistribution.critical, 0);
        if (criticalCount > 0) {
            insights.push(`${criticalCount} critical risks identified across all sectors`);
        }
    }

    return {
        sectors,
        comparison: {
            bestPerforming,
            needsImprovement,
            insights
        }
    };
}

/**
 * Helper: Calculate statistics for a sector
 */
function calculateSectorStats(sectorName: string, data: any[]): SectorStats {
    if (data.length === 0) {
        return {
            sector: sectorName,
            totalOrganizations: 0,
            averageRiskScore: 0,
            riskDistribution: { critical: 0, high: 0, medium: 0, low: 0, veryLow: 0 },
            topVulnerabilities: [],
            complianceRate: 0
        };
    }

    // Calculate average risk score
    let totalScore = 0;
    let totalQuestions = 0;
    const riskCounts = { critical: 0, high: 0, medium: 0, low: 0, veryLow: 0 };
    const vulnerabilityMap = new Map<string, number>();

    for (const { analysis } of data) {
        if (!analysis) continue;

        const allAnalyses = [
            ...(analysis.operational || []),
            ...(analysis.tactical || []),
            ...(analysis.strategic || [])
        ];

        for (const a of allAnalyses) {
            if (a.analysis) {
                totalScore += a.analysis.riskScore || 0;
                totalQuestions++;

                // Count risk levels
                const level = (a.analysis.riskLevel || '').toLowerCase();
                if (level === 'critical') riskCounts.critical++;
                else if (level === 'high') riskCounts.high++;
                else if (level === 'medium') riskCounts.medium++;
                else if (level === 'low') riskCounts.low++;
                else riskCounts.veryLow++;

                // Track vulnerabilities
                const gap = a.analysis.gap || '';
                if (gap && gap !== 'No potential gap') {
                    const count = vulnerabilityMap.get(gap) || 0;
                    vulnerabilityMap.set(gap, count + 1);
                }
            }
        }
    }

    const averageScore = totalQuestions > 0 ? totalScore / totalQuestions : 0;

    // Top vulnerabilities
    const topVulnerabilities = Array.from(vulnerabilityMap.entries())
        .map(([name, count]) => ({
            name,
            count,
            percentage: Math.round((count / totalQuestions) * 100)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Compliance rate (inverse of risk - lower risk = higher compliance)
    const complianceRate = Math.round((1 - (averageScore / 25)) * 100);

    return {
        sector: sectorName,
        totalOrganizations: data.length,
        averageRiskScore: Math.round(averageScore * 100) / 100,
        riskDistribution: riskCounts,
        topVulnerabilities,
        complianceRate: Math.max(0, Math.min(100, complianceRate))
    };
}

/**
 * Get trend data for a sector (comparing last 2 periods)
 */
export async function getSectorTrend(sectorName: string, months: number = 3): Promise<{
    current: number;
    previous: number;
    change: number;
    direction: 'up' | 'down' | 'stable';
}> {
    await dbConnect();

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (months * 30 * 24 * 60 * 60 * 1000));
    const previousCutoff = new Date(cutoffDate.getTime() - (months * 30 * 24 * 60 * 60 * 1000));

    // Current period
    const currentQuestionnaires = await Questionnaire.find({
        sector: sectorName,
        createdAt: { $gte: cutoffDate }
    }).lean();

    // Previous period
    const previousQuestionnaires = await Questionnaire.find({
        sector: sectorName,
        createdAt: { $gte: previousCutoff, $lt: cutoffDate }
    }).lean();

    const currentScore = await calculateAverageScore(currentQuestionnaires);
    const previousScore = await calculateAverageScore(previousQuestionnaires);

    const change = currentScore - previousScore;
    let direction: 'up' | 'down' | 'stable' = 'stable';

    if (Math.abs(change) > 0.5) {
        direction = change > 0 ? 'up' : 'down'; // Note: up means worse (higher risk)
    }

    return {
        current: currentScore,
        previous: previousScore,
        change: Math.round(change * 100) / 100,
        direction
    };
}

async function calculateAverageScore(questionnaires: any[]): Promise<number> {
    if (questionnaires.length === 0) return 0;

    const analyses = await RiskAnalysis.find({
        questionnaireId: { $in: questionnaires.map(q => q._id) }
    }).lean();

    let totalScore = 0;
    let count = 0;

    for (const analysis of analyses) {
        const allAnalyses = [
            ...(analysis.operational || []),
            ...(analysis.tactical || []),
            ...(analysis.strategic || [])
        ];

        for (const a of allAnalyses) {
            if (a.analysis?.riskScore) {
                totalScore += a.analysis.riskScore;
                count++;
            }
        }
    }

    return count > 0 ? totalScore / count : 0;
}
