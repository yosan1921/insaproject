"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

interface SectorStats {
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
    complianceRate: number;
}

interface NationalOverview {
    totalOrganizations: number;
    totalAssessments: number;
    nationalAverageScore: number;
    sectors: SectorStats[];
    lastUpdated: string;
}

// INSA Brand Colors
const INSA_COLORS = {
    primary: "#5C6AC4",      // Indigo
    secondary: "#684DF4",    // Royal Blue
    dark: "#000C2C",         // Midnight
    accent: "#4F46E5",       // Deep Blue
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#3B82F6"
};

const RISK_COLORS = {
    critical: "#EF4444",
    high: "#F59E0B",
    medium: "#FBBF24",
    low: "#10B981",
    veryLow: "#3B82F6"
};

export default function BenchmarkingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<NationalOverview | null>(null);
    const [selectedSector, setSelectedSector] = useState<string | null>(null);
    const [sectorDetails, setSectorDetails] = useState<any>(null);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated") {
            fetchNationalOverview();
        }
    }, [status, router]);

    const fetchNationalOverview = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/benchmarking/national");
            const data = await res.json();

            if (data.success) {
                setOverview(data.data);
            }
        } catch (error) {
            console.error("Error fetching national overview:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSectorDetails = async (sectorName: string) => {
        try {
            const res = await fetch(`/api/benchmarking/sector/${encodeURIComponent(sectorName)}`);
            const data = await res.json();

            if (data.success) {
                setSectorDetails(data.data);
                setSelectedSector(sectorName);
            }
        } catch (error) {
            console.error("Error fetching sector details:", error);
        }
    };

    if (status === "loading" || loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-slate-400">Loading national benchmarking data...</div>
                </div>
            </Layout>
        );
    }

    if (!session || !overview) return null;

    const chartData = overview.sectors.map(s => ({
        name: s.sector,
        score: s.averageRiskScore,
        organizations: s.totalOrganizations
    }));

    const riskDistributionData = overview.sectors.flatMap(s => [
        { name: `${s.sector} - Critical`, value: s.riskDistribution.critical, color: RISK_COLORS.critical },
        { name: `${s.sector} - High`, value: s.riskDistribution.high, color: RISK_COLORS.high },
        { name: `${s.sector} - Medium`, value: s.riskDistribution.medium, color: RISK_COLORS.medium },
        { name: `${s.sector} - Low`, value: s.riskDistribution.low, color: RISK_COLORS.low },
    ]).filter(d => d.value > 0);

    return (
        <Layout>
            <div className="space-y-8">
                {/* Modern Header with INSA Branding */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#5C6AC4] via-[#684DF4] to-[#000C2C] rounded-2xl p-8 shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white">National Sectoral Benchmarking</h1>
                                <p className="text-white/80 text-sm mt-1">
                                    Ethiopia's Cybersecurity Maturity Dashboard • Powered by INSA
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white font-medium">
                                Real-time Analytics
                            </span>
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white font-medium">
                                {overview.sectors.length} Active Sectors
                            </span>
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white font-medium">
                                Last Updated: {new Date(overview.lastUpdated).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Modern KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="group relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6 hover:border-[#5C6AC4] transition-all duration-300 hover:shadow-lg hover:shadow-[#5C6AC4]/20">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#5C6AC4] to-[#684DF4] rounded-lg flex items-center justify-center shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <span className="text-xs text-emerald-400 font-semibold px-2 py-1 bg-emerald-400/10 rounded-full">Active</span>
                        </div>
                        <p className="text-slate-400 text-sm mb-2 font-medium">Total Organizations</p>
                        <p className="text-4xl font-bold text-white mb-1">{overview.totalOrganizations}</p>
                        <p className="text-xs text-slate-500">Across all sectors</p>
                    </div>

                    <div className="group relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6 hover:border-[#684DF4] transition-all duration-300 hover:shadow-lg hover:shadow-[#684DF4]/20">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#684DF4] to-[#5C6AC4] rounded-lg flex items-center justify-center shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <span className="text-xs text-blue-400 font-semibold px-2 py-1 bg-blue-400/10 rounded-full">Completed</span>
                        </div>
                        <p className="text-slate-400 text-sm mb-2 font-medium">Total Assessments</p>
                        <p className="text-4xl font-bold text-white mb-1">{overview.totalAssessments}</p>
                        <p className="text-xs text-slate-500">Risk evaluations</p>
                    </div>

                    <div className="group relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6 hover:border-[#5C6AC4] transition-all duration-300 hover:shadow-lg hover:shadow-[#5C6AC4]/20">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <span className="text-xs text-amber-400 font-semibold px-2 py-1 bg-amber-400/10 rounded-full">National</span>
                        </div>
                        <p className="text-slate-400 text-sm mb-2 font-medium">National Average Score</p>
                        <p className="text-4xl font-bold text-white mb-1">{overview.nationalAverageScore.toFixed(1)}<span className="text-xl text-slate-500">/25</span></p>
                        <p className="text-xs text-slate-500">Risk maturity index</p>
                    </div>

                    <div className="group relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6 hover:border-[#684DF4] transition-all duration-300 hover:shadow-lg hover:shadow-[#684DF4]/20">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                </svg>
                            </div>
                            <span className="text-xs text-purple-400 font-semibold px-2 py-1 bg-purple-400/10 rounded-full">Monitored</span>
                        </div>
                        <p className="text-slate-400 text-sm mb-2 font-medium">Active Sectors</p>
                        <p className="text-4xl font-bold text-white mb-1">{overview.sectors.length}</p>
                        <p className="text-xs text-slate-500">Industry verticals</p>
                    </div>
                </div>

                {/* Modern Chart Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sector Risk Score Comparison */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-[#5C6AC4]">Sector Risk Comparison</h2>
                                <p className="text-sm text-slate-400 mt-1">Average risk scores by sector</p>
                            </div>
                            <div className="w-10 h-10 bg-[#5C6AC4]/10 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-[#5C6AC4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 80 }}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#684DF4" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="#5C6AC4" stopOpacity={0.6} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#94a3b8"
                                    angle={-45}
                                    textAnchor="end"
                                    height={100}
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    domain={[0, 25]}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0f172a',
                                        border: '1px solid #5C6AC4',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                    }}
                                    labelStyle={{ color: '#f1f5f9', fontWeight: 'bold' }}
                                    itemStyle={{ color: '#cbd5e1' }}
                                />
                                <Bar dataKey="score" fill="url(#barGradient)" name="Risk Score" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Sector Distribution Radar */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-[#684DF4]">Compliance Overview</h2>
                                <p className="text-sm text-slate-400 mt-1">Sector compliance rates</p>
                            </div>
                            <div className="w-10 h-10 bg-[#684DF4]/10 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-[#684DF4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={350}>
                            <RadarChart data={overview.sectors.slice(0, 8).map(s => ({
                                sector: s.sector.length > 15 ? s.sector.substring(0, 15) + '...' : s.sector,
                                compliance: s.complianceRate
                            }))}>
                                <PolarGrid stroke="#334155" />
                                <PolarAngleAxis dataKey="sector" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                                <Radar name="Compliance Rate" dataKey="compliance" stroke="#684DF4" fill="#684DF4" fillOpacity={0.6} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0f172a',
                                        border: '1px solid #684DF4',
                                        borderRadius: '8px'
                                    }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Modern Sector Cards */}
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-[#5C6AC4]">Sector Performance Analysis</h2>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Click any sector for detailed analysis</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {overview.sectors.map((sector) => {
                            const riskLevel = sector.averageRiskScore >= 20 ? 'critical' :
                                sector.averageRiskScore >= 15 ? 'high' :
                                    sector.averageRiskScore >= 10 ? 'medium' : 'low';
                            const riskColor = riskLevel === 'critical' ? 'red' :
                                riskLevel === 'high' ? 'orange' :
                                    riskLevel === 'medium' ? 'yellow' : 'emerald';

                            return (
                                <div
                                    key={sector.sector}
                                    className="group relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6 hover:border-[#684DF4] transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-[#684DF4]/20 hover:-translate-y-1"
                                    onClick={() => fetchSectorDetails(sector.sector)}
                                >
                                    {/* Sector Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#684DF4] transition-colors">
                                                {sector.sector}
                                            </h3>
                                            <p className="text-xs text-slate-500">{sector.totalOrganizations} organizations monitored</p>
                                        </div>
                                        <div className={`w-10 h-10 bg-${riskColor}-500/10 rounded-lg flex items-center justify-center`}>
                                            <svg className={`w-5 h-5 text-${riskColor}-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Key Metrics */}
                                    <div className="space-y-3 mb-4">
                                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                            <span className="text-sm text-slate-400">Risk Score</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-white">{sector.averageRiskScore.toFixed(1)}</span>
                                                <span className="text-xs text-slate-500">/25</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                            <span className="text-sm text-slate-400">Compliance</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-[#5C6AC4] to-[#684DF4] rounded-full transition-all duration-500"
                                                        style={{ width: `${sector.complianceRate}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-semibold text-white">{sector.complianceRate}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Risk Distribution Badges */}
                                    <div className="pt-4 border-t border-slate-700/50">
                                        <p className="text-xs text-slate-400 mb-2 font-medium">Risk Distribution</p>
                                        <div className="flex flex-wrap gap-2">
                                            {sector.riskDistribution.critical > 0 && (
                                                <span className="px-2.5 py-1 bg-red-500/20 text-red-300 text-xs rounded-full font-semibold border border-red-500/30">
                                                    {sector.riskDistribution.critical} Critical
                                                </span>
                                            )}
                                            {sector.riskDistribution.high > 0 && (
                                                <span className="px-2.5 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full font-semibold border border-orange-500/30">
                                                    {sector.riskDistribution.high} High
                                                </span>
                                            )}
                                            {sector.riskDistribution.medium > 0 && (
                                                <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full font-semibold border border-yellow-500/30">
                                                    {sector.riskDistribution.medium} Medium
                                                </span>
                                            )}
                                            {sector.riskDistribution.low > 0 && (
                                                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full font-semibold border border-emerald-500/30">
                                                    {sector.riskDistribution.low} Low
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* View Details Button */}
                                    <button className="mt-4 w-full px-4 py-2.5 bg-gradient-to-r from-[#5C6AC4] to-[#684DF4] hover:from-[#684DF4] hover:to-[#5C6AC4] text-white rounded-lg text-sm font-semibold transition-all duration-300 shadow-lg group-hover:shadow-[#684DF4]/50">
                                        View Detailed Analysis
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sector Details Modal */}
                {selectedSector && sectorDetails && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{selectedSector}</h2>
                                    <p className="text-sm text-slate-400 mt-1">Detailed Sector Analysis</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedSector(null);
                                        setSectorDetails(null);
                                    }}
                                    className="text-slate-400 hover:text-white text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Sector Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-slate-900/50 rounded-lg p-4">
                                        <p className="text-xs text-slate-400 mb-1">Organizations</p>
                                        <p className="text-2xl font-bold text-white">{sectorDetails.totalOrganizations}</p>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-4">
                                        <p className="text-xs text-slate-400 mb-1">Avg Score</p>
                                        <p className="text-2xl font-bold text-white">{sectorDetails.averageRiskScore.toFixed(1)}/25</p>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-4">
                                        <p className="text-xs text-slate-400 mb-1">Compliance</p>
                                        <p className="text-2xl font-bold text-white">{sectorDetails.complianceRate}%</p>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-4">
                                        <p className="text-xs text-slate-400 mb-1">Critical Risks</p>
                                        <p className="text-2xl font-bold text-red-400">{sectorDetails.riskDistribution.critical}</p>
                                    </div>
                                </div>

                                {/* Top Vulnerabilities */}
                                {sectorDetails.topVulnerabilities.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-3">Top Vulnerabilities</h3>
                                        <div className="space-y-2">
                                            {sectorDetails.topVulnerabilities.map((vuln: any, index: number) => (
                                                <div key={index} className="bg-slate-900/50 rounded-lg p-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-white text-sm">{vuln.name}</span>
                                                        <span className="text-slate-400 text-sm">{vuln.percentage}%</span>
                                                    </div>
                                                    <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                                                        <div
                                                            className="bg-red-500 h-2 rounded-full"
                                                            style={{ width: `${vuln.percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Organization Rankings (Anonymized) */}
                                {sectorDetails.organizations && sectorDetails.organizations.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-3">
                                            Organization Rankings
                                            {!sectorDetails.organizations[0]?.realName && (
                                                <span className="text-sm text-slate-400 font-normal ml-2">(Anonymized)</span>
                                            )}
                                        </h3>
                                        <div className="bg-slate-900/50 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-700">
                                                        <th className="px-4 py-3 text-left text-slate-400">Rank</th>
                                                        <th className="px-4 py-3 text-left text-slate-400">Organization</th>
                                                        <th className="px-4 py-3 text-left text-slate-400">Risk Score</th>
                                                        <th className="px-4 py-3 text-left text-slate-400">Risk Level</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sectorDetails.organizations.map((org: any) => (
                                                        <tr key={org.anonymousId} className="border-b border-slate-700/50">
                                                            <td className="px-4 py-3 text-white font-semibold">#{org.rank}</td>
                                                            <td className="px-4 py-3 text-slate-300">
                                                                {org.realName || org.anonymousName}
                                                            </td>
                                                            <td className="px-4 py-3 text-white font-mono">{org.riskScore.toFixed(1)}/25</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${org.riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-300' :
                                                                    org.riskLevel === 'HIGH' ? 'bg-orange-500/20 text-orange-300' :
                                                                        org.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300' :
                                                                            'bg-green-500/20 text-green-300'
                                                                    }`}>
                                                                    {org.riskLevel}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
