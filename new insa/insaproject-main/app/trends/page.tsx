"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "@/app/components/Layout";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

interface TrendData {
    id: string;
    company: string;
    date: string;
    averageRiskScore: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
}

export default function TrendsPage() {
    const { status } = useSession();
    const router = useRouter();
    const [trends, setTrends] = useState<TrendData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCompany, setSelectedCompany] = useState("");
    const [companies, setCompanies] = useState<string[]>([]);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        else if (status === "authenticated") fetchTrends();
    }, [status, router]);

    async function fetchTrends(company = "") {
        setLoading(true);
        try {
            const url = company ? `/api/reports/trends?company=${encodeURIComponent(company)}` : "/api/reports/trends";
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setTrends(data.trends || []);
                const allCompanies = Array.from(new Set((data.trends || []).map((t: TrendData) => t.company))) as string[];
                setCompanies(allCompanies);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const chartData = trends.map(t => ({
        date: new Date(t.date).toLocaleDateString(),
        company: t.company,
        avgScore: t.averageRiskScore,
        critical: t.critical,
        high: t.high,
        medium: t.medium,
        low: t.low,
    }));

    if (status === "loading" || loading) {
        return <Layout><div className="flex items-center justify-center h-64"><div className="text-slate-400">Loading...</div></div></Layout>;
    }

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Trend Analysis</h1>
                    <p className="text-slate-400 text-sm mt-1">Track risk score changes over time across organizations</p>
                </div>

                {/* Filter */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <select
                        value={selectedCompany}
                        onChange={(e) => {
                            setSelectedCompany(e.target.value);
                            fetchTrends(e.target.value);
                        }}
                        className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">All Companies</option>
                        {companies.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {trends.length === 0 ? (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                        <p className="text-slate-400">No trend data available yet.</p>
                    </div>
                ) : (
                    <>
                        {/* Average Risk Score Trend */}
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                            <h2 className="text-white font-semibold mb-4">Average Risk Score Over Time</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#94A3B8" domain={[0, 25]} tick={{ fontSize: 11 }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="avgScore" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} name="Avg Risk Score" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Risk Distribution Trend */}
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                            <h2 className="text-white font-semibold mb-4">Risk Distribution Over Time</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff' }} />
                                    <Legend />
                                    <Bar dataKey="critical" fill="#DC2626" name="Critical" />
                                    <Bar dataKey="high" fill="#EA580C" name="High" />
                                    <Bar dataKey="medium" fill="#EAB308" name="Medium" />
                                    <Bar dataKey="low" fill="#16A34A" name="Low" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Trend Table */}
                        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-slate-400 text-xs uppercase border-b border-slate-700">
                                        <th className="px-4 py-3 text-left">Company</th>
                                        <th className="px-4 py-3 text-left">Date</th>
                                        <th className="px-4 py-3 text-left">Avg Score</th>
                                        <th className="px-4 py-3 text-left">Critical</th>
                                        <th className="px-4 py-3 text-left">High</th>
                                        <th className="px-4 py-3 text-left">Medium</th>
                                        <th className="px-4 py-3 text-left">Low</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trends.map(t => (
                                        <tr key={t.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                            <td className="px-4 py-3 text-white font-medium">{t.company}</td>
                                            <td className="px-4 py-3 text-slate-300">{new Date(t.date).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 text-blue-400 font-mono">{t.averageRiskScore}/25</td>
                                            <td className="px-4 py-3 text-red-400 font-bold">{t.critical}</td>
                                            <td className="px-4 py-3 text-orange-400">{t.high}</td>
                                            <td className="px-4 py-3 text-yellow-400">{t.medium}</td>
                                            <td className="px-4 py-3 text-green-400">{t.low}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}
