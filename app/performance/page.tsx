"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "@/app/components/Layout";

interface Metrics {
    totalAssessments: number;
    totalQuestionnaires: number;
    totalAssets: number;
    totalThreats: number;
    totalUsers: number;
    totalNotifications: number;
    totalFeedback: number;
    avgRiskScore: number;
    criticalCount: number;
    highCount: number;
    recentAssessments: any[];
}

export default function PerformancePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        else if (status === "authenticated") {
            const user: any = session?.user;
            if (user?.role !== 'Director' && user?.role !== 'Division Head') {
                router.push("/dashboard");
                return;
            }
            fetchMetrics();
        }
    }, [status, router, session]);

    async function fetchMetrics() {
        setLoading(true);
        try {
            const res = await fetch("/api/performance");
            const data = await res.json();
            if (data.success) setMetrics(data.metrics);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    if (status === "loading" || loading) {
        return <Layout><div className="flex items-center justify-center h-64"><div className="text-slate-400">Loading...</div></div></Layout>;
    }

    const cards = [
        { label: "Total Assessments", value: metrics?.totalAssessments || 0, color: "text-blue-400", icon: "📊" },
        { label: "Questionnaires", value: metrics?.totalQuestionnaires || 0, color: "text-purple-400", icon: "📋" },
        { label: "Assets Discovered", value: metrics?.totalAssets || 0, color: "text-cyan-400", icon: "🖥️" },
        { label: "Threats Detected", value: metrics?.totalThreats || 0, color: "text-orange-400", icon: "⚠️" },
        { label: "Total Users", value: metrics?.totalUsers || 0, color: "text-green-400", icon: "👥" },
        { label: "Notifications Sent", value: metrics?.totalNotifications || 0, color: "text-yellow-400", icon: "🔔" },
        { label: "Feedback Received", value: metrics?.totalFeedback || 0, color: "text-pink-400", icon: "💬" },
        { label: "Avg Risk Score", value: `${metrics?.avgRiskScore || 0}/25`, color: "text-red-400", icon: "🎯" },
    ];

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Performance Metrics</h1>
                        <p className="text-slate-400 text-sm mt-1">System-wide statistics and monitoring</p>
                    </div>
                    <button
                        onClick={fetchMetrics}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition"
                    >
                        ↻ Refresh
                    </button>
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {cards.map(card => (
                        <div key={card.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl">{card.icon}</span>
                            </div>
                            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                            <p className="text-slate-400 text-xs mt-1">{card.label}</p>
                        </div>
                    ))}
                </div>

                {/* Risk Overview */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-white font-semibold mb-4">Risk Overview</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
                            <p className="text-4xl font-bold text-red-400">{metrics?.criticalCount || 0}</p>
                            <p className="text-red-300 text-sm mt-1">Critical Risks</p>
                            <p className="text-slate-500 text-xs mt-1">Require immediate action</p>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 text-center">
                            <p className="text-4xl font-bold text-orange-400">{metrics?.highCount || 0}</p>
                            <p className="text-orange-300 text-sm mt-1">High Risks</p>
                            <p className="text-slate-500 text-xs mt-1">Priority action needed</p>
                        </div>
                    </div>
                </div>

                {/* Recent Assessments */}
                {metrics?.recentAssessments && metrics.recentAssessments.length > 0 && (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-700">
                            <h2 className="text-white font-semibold">Recent Assessments</h2>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-400 text-xs uppercase border-b border-slate-700">
                                    <th className="px-4 py-3 text-left">Company</th>
                                    <th className="px-4 py-3 text-left">Category</th>
                                    <th className="px-4 py-3 text-left">Avg Score</th>
                                    <th className="px-4 py-3 text-left">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.recentAssessments.map((a: any) => (
                                    <tr key={a._id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                        <td className="px-4 py-3 text-white font-medium">{a.company}</td>
                                        <td className="px-4 py-3 text-slate-300">{a.category}</td>
                                        <td className="px-4 py-3 text-blue-400 font-mono">{a.summary?.overall?.averageRiskScore || 0}/25</td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">{new Date(a.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Layout>
    );
}
