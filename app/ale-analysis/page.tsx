'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Layout from '../components/Layout';

interface ALERisk {
    questionId: number;
    question: string;
    section: string;
    level: string;
    assetValue: number;
    exposureFactor: number;
    sle: number;
    aro: number;
    ale: number;
    currency: string;
    riskLevel: string;
}

interface ALESummary {
    totalALE: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    topRisks: ALERisk[];
}

export default function ALEAnalysisPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [analyses, setAnalyses] = useState<any[]>([]);
    const [selectedAnalysis, setSelectedAnalysis] = useState<string>('');
    const [aleSummary, setALESummary] = useState<ALESummary | null>(null);
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
                setAnalyses(data.assessments || []);
            }
        } catch (err: any) {
            console.error('Failed to fetch analyses:', err);
        }
    };

    const calculateALESummary = (analysis: any) => {
        const allQuestions = [
            ...(analysis.operational || []),
            ...(analysis.tactical || []),
            ...(analysis.strategic || [])
        ];

        const risksWithALE = allQuestions.filter((q: any) =>
            q.analysis?.ale !== undefined && q.analysis?.ale > 0
        );

        const totalALE = risksWithALE.reduce((sum: number, q: any) =>
            sum + (q.analysis?.ale || 0), 0
        );

        const categorizeALE = (ale: number) => {
            if (ale >= 1000000) return 'Critical';
            if (ale >= 100000) return 'High';
            if (ale >= 10000) return 'Medium';
            return 'Low';
        };

        const criticalCount = risksWithALE.filter((q: any) =>
            categorizeALE(q.analysis.ale) === 'Critical'
        ).length;

        const highCount = risksWithALE.filter((q: any) =>
            categorizeALE(q.analysis.ale) === 'High'
        ).length;

        const mediumCount = risksWithALE.filter((q: any) =>
            categorizeALE(q.analysis.ale) === 'Medium'
        ).length;

        const lowCount = risksWithALE.filter((q: any) =>
            categorizeALE(q.analysis.ale) === 'Low'
        ).length;

        const topRisks = risksWithALE
            .sort((a: any, b: any) => (b.analysis?.ale || 0) - (a.analysis?.ale || 0))
            .slice(0, 10)
            .map((q: any) => ({
                questionId: q.questionId,
                question: q.question,
                section: q.section,
                level: q.level,
                assetValue: q.analysis?.assetValue || 0,
                exposureFactor: q.analysis?.exposureFactor || 0,
                sle: q.analysis?.sle || 0,
                aro: q.analysis?.aro || 0,
                ale: q.analysis?.ale || 0,
                currency: q.analysis?.currency || 'USD',
                riskLevel: categorizeALE(q.analysis?.ale || 0)
            }));

        return {
            totalALE,
            criticalCount,
            highCount,
            mediumCount,
            lowCount,
            topRisks
        };
    };

    const handleAnalysisSelect = async (analysisId: string) => {
        setSelectedAnalysis(analysisId);
        setLoading(true);
        setError('');

        try {
            const analysis = analyses.find(a => a._id === analysisId);
            if (analysis) {
                const summary = calculateALESummary(analysis);
                setALESummary(summary);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to calculate ALE summary');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const getALEColor = (level: string) => {
        switch (level) {
            case 'Critical': return 'bg-red-600';
            case 'High': return 'bg-orange-600';
            case 'Medium': return 'bg-yellow-600';
            case 'Low': return 'bg-green-600';
            default: return 'bg-gray-600';
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        ALE (Annual Loss Expectancy) Analysis Dashboard
                    </h1>
                    <p className="text-gray-600">
                        Quantitative financial risk assessment based on SRS requirements
                    </p>
                </div>

                {/* Analysis Selector */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Risk Analysis
                    </label>
                    <select
                        value={selectedAnalysis}
                        onChange={(e) => handleAnalysisSelect(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">-- Select an analysis --</option>
                        {analyses.map((analysis) => (
                            <option key={analysis._id} value={analysis._id}>
                                {analysis.company} - {analysis.riskRegisterId} ({new Date(analysis.createdAt).toLocaleDateString()})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Calculating ALE summary...</p>
                    </div>
                )}

                {/* ALE Summary */}
                {!loading && aleSummary && (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                            {/* Total ALE */}
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white col-span-1 md:col-span-2 lg:col-span-1">
                                <p className="text-sm opacity-90 mb-1">Total ALE</p>
                                <p className="text-3xl font-bold">{formatCurrency(aleSummary.totalALE)}</p>
                                <p className="text-xs opacity-75 mt-2">Annual Loss Expectancy</p>
                            </div>

                            {/* Critical */}
                            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-600">
                                <p className="text-sm text-gray-600 mb-1">Critical</p>
                                <p className="text-3xl font-bold text-gray-900">{aleSummary.criticalCount}</p>
                                <p className="text-xs text-gray-500 mt-2">≥ $1,000,000</p>
                            </div>

                            {/* High */}
                            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-600">
                                <p className="text-sm text-gray-600 mb-1">High</p>
                                <p className="text-3xl font-bold text-gray-900">{aleSummary.highCount}</p>
                                <p className="text-xs text-gray-500 mt-2">$100K - $1M</p>
                            </div>

                            {/* Medium */}
                            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-600">
                                <p className="text-sm text-gray-600 mb-1">Medium</p>
                                <p className="text-3xl font-bold text-gray-900">{aleSummary.mediumCount}</p>
                                <p className="text-xs text-gray-500 mt-2">$10K - $100K</p>
                            </div>

                            {/* Low */}
                            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-600">
                                <p className="text-sm text-gray-600 mb-1">Low</p>
                                <p className="text-3xl font-bold text-gray-900">{aleSummary.lowCount}</p>
                                <p className="text-xs text-gray-500 mt-2">&lt; $10K</p>
                            </div>
                        </div>

                        {/* Top Risks Table */}
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-xl font-bold text-gray-900">Top 10 Financial Risks by ALE</h2>
                                <p className="text-sm text-gray-600 mt-1">Ranked by Annual Loss Expectancy</p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Rank
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Question / Risk
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Level
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Asset Value
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                SLE
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                ARO
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                ALE
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Severity
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {aleSummary.topRisks.map((risk, index) => (
                                            <tr key={risk.questionId} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    #{index + 1}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                    <div className="font-medium">{risk.section}</div>
                                                    <div className="text-gray-500 text-xs mt-1">{risk.question.substring(0, 80)}...</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <span className="capitalize">{risk.level}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                                    {formatCurrency(risk.assetValue, risk.currency)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                                    {formatCurrency(risk.sle, risk.currency)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                                    {risk.aro.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                                                    {formatCurrency(risk.ale, risk.currency)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-white text-xs font-semibold ${getALEColor(risk.riskLevel)}`}>
                                                        {risk.riskLevel}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {aleSummary.topRisks.length === 0 && (
                                <div className="p-12 text-center text-gray-500">
                                    <p>No ALE data available for this analysis.</p>
                                    <p className="text-sm mt-2">Please ensure quantitative risk analysis (ALE/SLE) has been performed.</p>
                                </div>
                            )}
                        </div>

                        {/* ALE Calculation Formula */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
                            <h3 className="text-lg font-bold text-blue-900 mb-3">ALE Calculation Formula</h3>
                            <div className="space-y-2 text-sm text-blue-800">
                                <p><strong>SLE (Single Loss Expectancy)</strong> = Asset Value × Exposure Factor</p>
                                <p><strong>ALE (Annual Loss Expectancy)</strong> = SLE × ARO (Annual Rate of Occurrence)</p>
                                <p className="text-xs text-blue-600 mt-3">
                                    This quantitative analysis complies with SRS Section 2.2 requirements for financial risk assessment.
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {/* No Selection */}
                {!loading && !aleSummary && !selectedAnalysis && (
                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
                        <svg className="mx-auto h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-white">No Analysis Selected</h3>
                        <p className="mt-1 text-sm text-slate-400">Select a risk analysis to view ALE dashboard</p>
                    </div>
                )}
            </div>
        </Layout>
    );
}
