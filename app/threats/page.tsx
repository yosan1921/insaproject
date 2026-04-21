"use client";

import { useEffect, useState } from "react";
import Layout from "@/app/components/Layout";

interface Threat {
    _id: string;
    company: string;
    source: "virustotal" | "shodan" | "ai";
    threatType: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    description: string;
    originalRiskScore: number;
    enhancedScore: number;
    threatWeight: number;
    fetchedAt: string;
    assetId?: {
        _id: string;
        ip: string;
        hostname?: string;
        os?: string;
        deviceType?: string;
        openPorts?: number[];
    };
}

const SEVERITY_STYLES: Record<string, string> = {
    critical: "bg-red-500/20 text-red-300 border-red-500/30",
    high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    low: "bg-green-500/20 text-green-300 border-green-500/30",
    info: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

const SOURCE_STYLES: Record<string, string> = {
    virustotal: "bg-blue-500/20 text-blue-300",
    shodan: "bg-purple-500/20 text-purple-300",
    ai: "bg-teal-500/20 text-teal-300",
};

export default function ThreatsPage() {
    const [threats, setThreats] = useState<Threat[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<string>("all");
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadThreats = () => {
        setLoading(true);
        fetch("/api/threats")
            .then((r) => r.json())
            .then((d) => setThreats(d.threats || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadThreats();
    }, []);

    const handleRefresh = async () => {
        if (!threats.length) {
            setMessage({ type: 'error', text: 'No threats to refresh. Complete an assessment with assets first.' });
            return;
        }

        // Get unique questionnaire IDs from threats
        const questionnaireIds = Array.from(new Set(threats.map(t => (t as any).questionnaireId).filter(Boolean)));

        if (questionnaireIds.length === 0) {
            setMessage({ type: 'error', text: 'No questionnaire IDs found in threats.' });
            return;
        }

        setRefreshing(true);
        setMessage(null);

        try {
            let totalRefreshed = 0;
            let totalErrors = 0;
            const errors: string[] = [];

            // Refresh threats for ALL questionnaires
            for (const qId of questionnaireIds) {
                try {
                    const response = await fetch('/api/threats/refresh', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ questionnaireId: qId }),
                    });

                    const data = await response.json();

                    if (data.success) {
                        totalRefreshed += data.threatsFound || 0;
                        if (data.errors && data.errors.length > 0) {
                            totalErrors += data.errors.length;
                            errors.push(...data.errors);
                        }
                    } else {
                        totalErrors++;
                        errors.push(data.error || 'Unknown error');
                    }
                } catch (error: any) {
                    console.error(`Refresh error for ${qId}:`, error);
                    totalErrors++;
                    errors.push(`Failed to refresh questionnaire ${qId}`);
                }
            }

            // Show summary message
            if (totalErrors === 0) {
                setMessage({
                    type: 'success',
                    text: `✅ Successfully refreshed ${totalRefreshed} threats across ${questionnaireIds.length} companies`
                });
            } else if (totalRefreshed > 0) {
                setMessage({
                    type: 'success',
                    text: `⚠️ Refreshed ${totalRefreshed} threats with ${totalErrors} errors. Check console for details.`
                });
                console.error('Refresh errors:', errors);
            } else {
                setMessage({
                    type: 'error',
                    text: `❌ Failed to refresh threats. ${totalErrors} errors occurred.`
                });
                console.error('Refresh errors:', errors);
            }

            loadThreats(); // Reload threats
        } catch (error) {
            console.error('Refresh error:', error);
            setMessage({ type: 'error', text: '❌ Failed to refresh threats' });
        } finally {
            setRefreshing(false);
        }
    };

    const filtered = filter === "all" ? threats : threats.filter((t) => t.severity === filter);

    const summary = {
        critical: threats.filter((t) => t.severity === "critical").length,
        high: threats.filter((t) => t.severity === "high").length,
        medium: threats.filter((t) => t.severity === "medium").length,
        low: threats.filter((t) => t.severity === "low").length,
    };

    return (
        <Layout>
            <div className="space-y-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Threat Intelligence</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Threats discovered via VirusTotal, Shodan, and AI analysis. Enhanced risk scores shown alongside original scores.
                        </p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing || loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition flex items-center gap-2"
                    >
                        {refreshing ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Refreshing...
                            </>
                        ) : (
                            <>
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh Threats
                            </>
                        )}
                    </button>
                </div>

                {/* Message Banner */}
                {message && (
                    <div className={`px-4 py-3 rounded-lg border ${message.type === 'success'
                        ? 'bg-green-900/30 border-green-500/50 text-green-300'
                        : 'bg-red-900/30 border-red-500/50 text-red-300'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "Critical", count: summary.critical, color: "border-red-500/50 bg-red-500/10 text-red-300" },
                        { label: "High", count: summary.high, color: "border-orange-500/50 bg-orange-500/10 text-orange-300" },
                        { label: "Medium", count: summary.medium, color: "border-yellow-500/50 bg-yellow-500/10 text-yellow-300" },
                        { label: "Low", count: summary.low, color: "border-green-500/50 bg-green-500/10 text-green-300" },
                    ].map((s) => (
                        <div key={s.label} className={`border rounded-xl p-4 ${s.color}`}>
                            <div className="text-3xl font-bold">{s.count}</div>
                            <div className="text-sm font-semibold mt-1">{s.label} Threats</div>
                        </div>
                    ))}
                </div>

                {/* Filter */}
                <div className="flex gap-2 flex-wrap">
                    {["all", "critical", "high", "medium", "low"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition capitalize ${filter === f
                                ? "bg-blue-600 text-white"
                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* Threats Table */}
                {loading ? (
                    <div className="text-slate-400 text-sm">Loading threats...</div>
                ) : filtered.length === 0 ? (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                        <p className="text-slate-400">No threats found.</p>
                        <p className="text-slate-500 text-sm mt-1">
                            Threats appear after asset scanning completes and API keys are configured.
                        </p>
                    </div>
                ) : (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-slate-400 text-xs uppercase border-b border-slate-700">
                                        <th className="px-6 py-3 text-left">Company</th>
                                        <th className="px-6 py-3 text-left">Asset</th>
                                        <th className="px-6 py-3 text-left">Source</th>
                                        <th className="px-6 py-3 text-left">Threat Type</th>
                                        <th className="px-6 py-3 text-left">Severity</th>
                                        <th className="px-6 py-3 text-left">Description</th>
                                        <th className="px-6 py-3 text-left">Original Score</th>
                                        <th className="px-6 py-3 text-left">Enhanced Score</th>
                                        <th className="px-6 py-3 text-left">Detected At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((threat) => (
                                        <tr key={threat._id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                                            <td className="px-6 py-3 text-white font-semibold">{threat.company}</td>
                                            <td className="px-6 py-3">
                                                {threat.assetId ? (
                                                    <div className="text-xs">
                                                        <div className="text-blue-400 font-mono font-semibold">{threat.assetId.ip}</div>
                                                        {threat.assetId.hostname && (
                                                            <div className="text-slate-400">{threat.assetId.hostname}</div>
                                                        )}
                                                        {threat.assetId.os && (
                                                            <div className="text-slate-500">{threat.assetId.os}</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-500 text-xs">Unknown</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${SOURCE_STYLES[threat.source]}`}>
                                                    {threat.source}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-slate-300">{threat.threatType}</td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${SEVERITY_STYLES[threat.severity]}`}>
                                                    {threat.severity.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-slate-400 text-xs max-w-xs truncate" title={threat.description}>
                                                {threat.description}
                                            </td>
                                            <td className="px-6 py-3 text-slate-300 font-mono">{threat.originalRiskScore}/25</td>
                                            <td className="px-6 py-3 font-mono font-bold">
                                                <span className={threat.enhancedScore > threat.originalRiskScore ? "text-red-400" : "text-green-400"}>
                                                    {threat.enhancedScore}/25
                                                </span>
                                                {threat.enhancedScore > threat.originalRiskScore && (
                                                    <span className="text-red-400 text-xs ml-1">
                                                        (+{threat.threatWeight})
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-slate-400 text-xs">
                                                {new Date(threat.fetchedAt).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
