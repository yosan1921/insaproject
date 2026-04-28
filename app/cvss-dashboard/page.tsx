'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Layout from '../components/Layout';

interface CVSSRisk {
    questionId: number;
    question: string;
    section: string;
    level: string;
    cvssScore: number;
    cvssSeverity: string;
    cvssVectorString: string;
    cvssMetrics: {
        attackVector?: string;
        attackComplexity?: string;
        privilegesRequired?: string;
        userInteraction?: string;
        scope?: string;
        confidentiality?: string;
        integrity?: string;
        availability?: string;
    };
    riskLevel: string;
    threat: string;
    mitigation: string;
}

interface CVSSSummary {
    totalRisks: number;
    averageCVSS: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    noneCount: number;
    topRisks: CVSSRisk[];
    metricDistribution: {
        attackVector: Record<string, number>;
        attackComplexity: Record<string, number>;
        privilegesRequired: Record<string, number>;
        userInteraction: Record<string, number>;
    };
}

export default function CVSSDashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [analyses, setAnalyses] = useState<any[]>([]);
    const [selectedAnalysis, setSelectedAnalysis] = useState<string>('');
    const [cvssSummary, setCVSSSummary] = useState<CVSSSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (status === 'authenticated') {
            fetchAnalyses();
        }
    }, [status]);

    if (status === 'loading') {
        return (
            <Layout>
                <div className="flex justify-center items-center min-h-screen">
                    <div className="text-slate-400">Loading...</div>
                </div>
            </Layout>
        );
    }

    if (!session) {
        router.push('/login');
        return null;
    }

    const fetchAnalyses = async () => {
        try {
            const response = await fetch('/api/analysis/processed');
            const data = await response.json();

            if (data.success) {
                console.log('📊 [CVSS Dashboard] Fetched analyses:', data.assessments.length);
                setAnalyses(data.assessments || []);
            } else {
                console.error('❌ [CVSS Dashboard] Failed to fetch:', data.error);
            }
        } catch (err: any) {
            console.error('❌ [CVSS Dashboard] Error fetching analyses:', err);
        }
    };

    const calculateCVSSSummary = (analysis: any): CVSSSummary => {
        // The API returns analyses as a flat array, not separated by level
        const allQuestions = analysis.analyses || [];

        console.log(`📊 [CVSS Dashboard] Total questions: ${allQuestions.length}`);

        // CVSS fields are at top level in analyses array, not nested under analysis
        const risksWithCVSS = allQuestions.filter((q: any) =>
            q.cvssScore !== undefined && q.cvssScore > 0
        );

        console.log(`📊 [CVSS Dashboard] Risks with CVSS: ${risksWithCVSS.length}`);
        if (risksWithCVSS.length > 0) {
            console.log('📊 [CVSS Dashboard] Sample CVSS data:', {
                cvssScore: risksWithCVSS[0].cvssScore,
                cvssSeverity: risksWithCVSS[0].cvssSeverity,
                hasMetrics: !!risksWithCVSS[0].cvssMetrics
            });
        }

        const totalRisks = risksWithCVSS.length;
        const averageCVSS = totalRisks > 0
            ? risksWithCVSS.reduce((sum: number, q: any) => sum + (q.cvssScore || 0), 0) / totalRisks
            : 0;

        const criticalCount = risksWithCVSS.filter((q: any) =>
            (q.cvssSeverity || '').toUpperCase() === 'CRITICAL'
        ).length;

        const highCount = risksWithCVSS.filter((q: any) =>
            (q.cvssSeverity || '').toUpperCase() === 'HIGH'
        ).length;

        const mediumCount = risksWithCVSS.filter((q: any) =>
            (q.cvssSeverity || '').toUpperCase() === 'MEDIUM'
        ).length;

        const lowCount = risksWithCVSS.filter((q: any) =>
            (q.cvssSeverity || '').toUpperCase() === 'LOW'
        ).length;

        const noneCount = risksWithCVSS.filter((q: any) =>
            (q.cvssSeverity || '').toUpperCase() === 'NONE'
        ).length;

        const topRisks = risksWithCVSS
            .sort((a: any, b: any) => (b.cvssScore || 0) - (a.cvssScore || 0))
            .slice(0, 10)
            .map((q: any) => ({
                questionId: q.questionId,
                question: q.question,
                section: q.section,
                level: q.level,
                cvssScore: q.cvssScore || 0,
                cvssSeverity: q.cvssSeverity || 'NONE',
                cvssVectorString: q.cvssVectorString || '',
                cvssMetrics: q.cvssMetrics || {},
                riskLevel: q.riskLevel || 'UNKNOWN',
                threat: q.threat || '',
                mitigation: q.mitigation || ''
            }));

        // Calculate metric distributions
        const metricDistribution = {
            attackVector: { N: 0, A: 0, L: 0, P: 0 },
            attackComplexity: { L: 0, H: 0 },
            privilegesRequired: { N: 0, L: 0, H: 0 },
            userInteraction: { N: 0, R: 0 }
        };

        risksWithCVSS.forEach((q: any) => {
            const metrics = q.cvssMetrics || {};
            if (metrics.attackVector) metricDistribution.attackVector[metrics.attackVector as keyof typeof metricDistribution.attackVector]++;
            if (metrics.attackComplexity) metricDistribution.attackComplexity[metrics.attackComplexity as keyof typeof metricDistribution.attackComplexity]++;
            if (metrics.privilegesRequired) metricDistribution.privilegesRequired[metrics.privilegesRequired as keyof typeof metricDistribution.privilegesRequired]++;
            if (metrics.userInteraction) metricDistribution.userInteraction[metrics.userInteraction as keyof typeof metricDistribution.userInteraction]++;
        });

        return {
            totalRisks,
            averageCVSS,
            criticalCount,
            highCount,
            mediumCount,
            lowCount,
            noneCount,
            topRisks,
            metricDistribution
        };
    };

    const handleAnalysisSelect = async (analysisId: string) => {
        setSelectedAnalysis(analysisId);
        setLoading(true);
        setError('');

        try {
            const analysis = analyses.find(a => a._id === analysisId);
            if (analysis) {
                const summary = calculateCVSSSummary(analysis);
                setCVSSSummary(summary);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to calculate CVSS summary');
        } finally {
            setLoading(false);
        }
    };

    const getCVSSColor = (severity: string) => {
        switch (severity.toUpperCase()) {
            case 'CRITICAL': return 'bg-red-600';
            case 'HIGH': return 'bg-orange-600';
            case 'MEDIUM': return 'bg-yellow-600';
            case 'LOW': return 'bg-green-600';
            case 'NONE': return 'bg-gray-600';
            default: return 'bg-gray-600';
        }
    };

    const getCVSSBorderColor = (severity: string) => {
        switch (severity.toUpperCase()) {
            case 'CRITICAL': return 'border-red-600';
            case 'HIGH': return 'border-orange-600';
            case 'MEDIUM': return 'border-yellow-600';
            case 'LOW': return 'border-green-600';
            case 'NONE': return 'border-gray-600';
            default: return 'border-gray-600';
        }
    };

    const getMetricLabel = (metric: string, value: string) => {
        const labels: Record<string, Record<string, string>> = {
            attackVector: { N: 'Network', A: 'Adjacent', L: 'Local', P: 'Physical' },
            attackComplexity: { L: 'Low', H: 'High' },
            privilegesRequired: { N: 'None', L: 'Low', H: 'High' },
            userInteraction: { N: 'None', R: 'Required' }
        };
        return labels[metric]?.[value] || value;
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-lg p-6">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        CVSS (Common Vulnerability Scoring System) Dashboard
                    </h1>
                    <p className="text-blue-100">
                        Quantitative vulnerability assessment based on CVSS v3.1 standard
                    </p>
                </div>

                {/* Analysis Selector */}
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Select Risk Analysis
                    </label>
                    <select
                        value={selectedAnalysis}
                        onChange={(e) => handleAnalysisSelect(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">-- Select an analysis --</option>
                        {analyses.map((analysis) => (
                            <option key={analysis._id} value={analysis._id}>
                                {analysis.company} - {analysis.riskRegisterId} ({new Date(analysis.date).toLocaleDateString()})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4">
                        <p className="text-red-300">{error}</p>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-4 text-slate-400">Calculating CVSS summary...</p>
                    </div>
                )}

                {/* CVSS Summary */}
                {!loading && cvssSummary && (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                            {/* Total Risks */}
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                                <p className="text-sm opacity-90 mb-1">Total Risks</p>
                                <p className="text-3xl font-bold">{cvssSummary.totalRisks}</p>
                                <p className="text-xs opacity-75 mt-2">With CVSS scores</p>
                            </div>

                            {/* Average CVSS */}
                            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
                                <p className="text-sm opacity-90 mb-1">Avg CVSS</p>
                                <p className="text-3xl font-bold">{cvssSummary.averageCVSS.toFixed(1)}</p>
                                <p className="text-xs opacity-75 mt-2">Out of 10.0</p>
                            </div>

                            {/* Critical */}
                            <div className={`bg-slate-800 rounded-lg shadow-lg p-6 border-l-4 ${getCVSSBorderColor('CRITICAL')}`}>
                                <p className="text-sm text-slate-400 mb-1">Critical</p>
                                <p className="text-3xl font-bold text-white">{cvssSummary.criticalCount}</p>
                                <p className="text-xs text-slate-500 mt-2">9.0 - 10.0</p>
                            </div>

                            {/* High */}
                            <div className={`bg-slate-800 rounded-lg shadow-lg p-6 border-l-4 ${getCVSSBorderColor('HIGH')}`}>
                                <p className="text-sm text-slate-400 mb-1">High</p>
                                <p className="text-3xl font-bold text-white">{cvssSummary.highCount}</p>
                                <p className="text-xs text-slate-500 mt-2">7.0 - 8.9</p>
                            </div>

                            {/* Medium */}
                            <div className={`bg-slate-800 rounded-lg shadow-lg p-6 border-l-4 ${getCVSSBorderColor('MEDIUM')}`}>
                                <p className="text-sm text-slate-400 mb-1">Medium</p>
                                <p className="text-3xl font-bold text-white">{cvssSummary.mediumCount}</p>
                                <p className="text-xs text-slate-500 mt-2">4.0 - 6.9</p>
                            </div>

                            {/* Low */}
                            <div className={`bg-slate-800 rounded-lg shadow-lg p-6 border-l-4 ${getCVSSBorderColor('LOW')}`}>
                                <p className="text-sm text-slate-400 mb-1">Low</p>
                                <p className="text-3xl font-bold text-white">{cvssSummary.lowCount}</p>
                                <p className="text-xs text-slate-500 mt-2">0.1 - 3.9</p>
                            </div>
                        </div>

                        {/* Metric Distribution */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Attack Vector */}
                            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                                <h3 className="text-lg font-bold text-white mb-4">Attack Vector</h3>
                                <div className="space-y-2">
                                    {Object.entries(cvssSummary.metricDistribution.attackVector).map(([key, value]) => (
                                        value > 0 && (
                                            <div key={key} className="flex justify-between items-center">
                                                <span className="text-sm text-slate-400">{getMetricLabel('attackVector', key)}</span>
                                                <span className="text-lg font-bold text-white">{value}</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>

                            {/* Attack Complexity */}
                            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                                <h3 className="text-lg font-bold text-white mb-4">Attack Complexity</h3>
                                <div className="space-y-2">
                                    {Object.entries(cvssSummary.metricDistribution.attackComplexity).map(([key, value]) => (
                                        value > 0 && (
                                            <div key={key} className="flex justify-between items-center">
                                                <span className="text-sm text-slate-400">{getMetricLabel('attackComplexity', key)}</span>
                                                <span className="text-lg font-bold text-white">{value}</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>

                            {/* Privileges Required */}
                            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                                <h3 className="text-lg font-bold text-white mb-4">Privileges Required</h3>
                                <div className="space-y-2">
                                    {Object.entries(cvssSummary.metricDistribution.privilegesRequired).map(([key, value]) => (
                                        value > 0 && (
                                            <div key={key} className="flex justify-between items-center">
                                                <span className="text-sm text-slate-400">{getMetricLabel('privilegesRequired', key)}</span>
                                                <span className="text-lg font-bold text-white">{value}</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>

                            {/* User Interaction */}
                            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                                <h3 className="text-lg font-bold text-white mb-4">User Interaction</h3>
                                <div className="space-y-2">
                                    {Object.entries(cvssSummary.metricDistribution.userInteraction).map(([key, value]) => (
                                        value > 0 && (
                                            <div key={key} className="flex justify-between items-center">
                                                <span className="text-sm text-slate-400">{getMetricLabel('userInteraction', key)}</span>
                                                <span className="text-lg font-bold text-white">{value}</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Top Risks Table */}
                        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                            <div className="p-6 border-b border-slate-700">
                                <h2 className="text-xl font-bold text-white">Top 10 Vulnerabilities by CVSS Score</h2>
                                <p className="text-sm text-slate-400 mt-1">Ranked by technical severity</p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-900">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Rank
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Question / Risk
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Level
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                CVSS Score
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Severity
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Vector String
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Threat
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {cvssSummary.topRisks.map((risk, index) => (
                                            <tr key={risk.questionId} className="hover:bg-slate-700/50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                                    #{index + 1}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-white">
                                                    <div className="font-medium">{risk.section}</div>
                                                    <div className="text-slate-400 text-xs mt-1">{risk.question.substring(0, 80)}...</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                                    <span className="capitalize">{risk.level}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className="text-2xl font-bold text-white">{risk.cvssScore.toFixed(1)}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-white text-xs font-semibold ${getCVSSColor(risk.cvssSeverity)}`}>
                                                        {risk.cvssSeverity}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-mono text-slate-400">
                                                    {risk.cvssVectorString || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-400">
                                                    {risk.threat.substring(0, 50)}...
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {cvssSummary.topRisks.length === 0 && (
                                <div className="p-12 text-center text-slate-500">
                                    <p>No CVSS data available for this analysis.</p>
                                    <p className="text-sm mt-2">CVSS scores are calculated automatically during risk analysis.</p>
                                </div>
                            )}
                        </div>

                        {/* CVSS Info */}
                        <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-blue-300 mb-3">CVSS v3.1 Scoring System</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-200">
                                <div>
                                    <p className="font-semibold mb-2">Base Metrics:</p>
                                    <ul className="space-y-1 text-xs">
                                        <li>• Attack Vector (AV): Network, Adjacent, Local, Physical</li>
                                        <li>• Attack Complexity (AC): Low, High</li>
                                        <li>• Privileges Required (PR): None, Low, High</li>
                                        <li>• User Interaction (UI): None, Required</li>
                                    </ul>
                                </div>
                                <div>
                                    <p className="font-semibold mb-2">Impact Metrics:</p>
                                    <ul className="space-y-1 text-xs">
                                        <li>• Confidentiality (C): None, Low, High</li>
                                        <li>• Integrity (I): None, Low, High</li>
                                        <li>• Availability (A): None, Low, High</li>
                                        <li>• Scope (S): Unchanged, Changed</li>
                                    </ul>
                                </div>
                            </div>
                            <p className="text-xs text-blue-400 mt-4">
                                CVSS scores are automatically calculated during risk analysis and integrated with threat intelligence data.
                            </p>
                        </div>
                    </>
                )}

                {/* No Selection */}
                {!loading && !cvssSummary && !selectedAnalysis && (
                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
                        <svg className="mx-auto h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-white">No Analysis Selected</h3>
                        <p className="mt-1 text-sm text-slate-400">Select a risk analysis to view CVSS dashboard</p>
                    </div>
                )}
            </div>
        </Layout>
    );
}
