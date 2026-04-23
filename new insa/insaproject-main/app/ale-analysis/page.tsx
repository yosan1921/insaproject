"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "@/app/components/Layout";

interface ALEResult {
    company: string;
    assetValue: number;
    totalALE: number;
    topRisks: {
        question: string;
        riskLevel: string;
        likelihood: number;
        impact: number;
        aro: number;
        exposureFactor: number;
        sle: number;
        ale: number;
    }[];
}

interface Assessment {
    _id: string;
    company: string;
    date: string;
}

const RISK_COLORS: Record<string, string> = {
    CRITICAL: 'text-red-400',
    HIGH: 'text-orange-400',
    MEDIUM: 'text-yellow-400',
    LOW: 'text-green-400',
};

export default function ALEAnalysisPage() {
    const { status } = useSession();
    const router = useRouter();
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [selectedAssessment, setSelectedAssessment] = useState("");
    const [assetValue, setAssetValue] = useState("1000000");
    const [result, setResult] = useState<ALEResult | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        else if (status === "authenticated") {
            fetch("/api/analysis/processed")
                .then(r => r.json())
                .then(d => setAssessments(d.assessments || []));
        }
    }, [status, router]);

    async function calculate() {
        if (!selectedAssessment) return;
        const value = assetValue.trim() === '' ? '1000000' : assetValue;
        setLoading(true);
        try {
            const res = await fetch(`/api/analysis/ale?analysisId=${selectedAssessment}&assetValue=${value}`);
            const data = await res.json();
            if (data.success) setResult(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">ALE / SLE Analysis</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Annual Loss Expectancy (ALE) and Single Loss Expectancy (SLE) quantitative risk analysis
                    </p>
                </div>

                {/* Formula explanation */}
                <div className="bg-slate-800 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-blue-300 text-sm font-semibold mb-2">Formulas Used:</p>
                    <div className="grid grid-cols-3 gap-4 text-xs text-slate-300">
                        <div><span className="text-blue-400 font-mono">SLE</span> = Asset Value × Exposure Factor</div>
                        <div><span className="text-blue-400 font-mono">ALE</span> = ARO × SLE</div>
                        <div><span className="text-blue-400 font-mono">ARO</span> = Annual Rate of Occurrence</div>
                    </div>
                </div>

                {/* Input */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-4 items-end flex-wrap">
                    <div className="flex-1 min-w-48">
                        <label className="block text-xs text-slate-400 mb-1">Select Assessment</label>
                        <select
                            value={selectedAssessment}
                            onChange={(e) => setSelectedAssessment(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="">Choose assessment...</option>
                            {assessments.map(a => (
                                <option key={a._id} value={a._id}>
                                    {a.company} - {new Date(a.date).toLocaleDateString()}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="min-w-48">
                        <label className="block text-xs text-slate-400 mb-1">Asset Value (USD)</label>
                        <input
                            type="number"
                            value={assetValue}
                            onChange={(e) => setAssetValue(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                            placeholder="1000000"
                        />
                    </div>
                    <button
                        onClick={calculate}
                        disabled={!selectedAssessment || loading}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition"
                    >
                        {loading ? "Calculating..." : "Calculate ALE"}
                    </button>
                </div>

                {/* Results */}
                {result && (
                    <div className="space-y-4">
                        {/* Summary */}
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                            <h2 className="text-white font-semibold mb-4">{result.company} - ALE Summary</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                                    <p className="text-xs text-slate-400 mb-1">Asset Value</p>
                                    <p className="text-2xl font-bold text-blue-400">{formatCurrency(result.assetValue)}</p>
                                </div>
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
                                    <p className="text-xs text-slate-400 mb-1">Total Annual Loss Expectancy</p>
                                    <p className="text-2xl font-bold text-red-400">{formatCurrency(result.totalALE)}</p>
                                    <p className="text-xs text-slate-500 mt-1">Expected annual financial loss</p>
                                </div>
                            </div>
                        </div>

                        {/* Top risks table */}
                        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-700">
                                <h2 className="text-white font-semibold">Top 10 Risks by ALE</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-slate-400 uppercase border-b border-slate-700">
                                            <th className="px-4 py-3 text-left">Risk</th>
                                            <th className="px-4 py-3 text-left">Level</th>
                                            <th className="px-4 py-3 text-right">ARO</th>
                                            <th className="px-4 py-3 text-right">EF</th>
                                            <th className="px-4 py-3 text-right">SLE</th>
                                            <th className="px-4 py-3 text-right">ALE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.topRisks.map((r, i) => (
                                            <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                                <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{r.question}...</td>
                                                <td className={`px-4 py-3 font-bold ${RISK_COLORS[r.riskLevel] || 'text-slate-400'}`}>{r.riskLevel}</td>
                                                <td className="px-4 py-3 text-right text-slate-300">{r.aro}x/yr</td>
                                                <td className="px-4 py-3 text-right text-slate-300">{(r.exposureFactor * 100).toFixed(0)}%</td>
                                                <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(r.sle)}</td>
                                                <td className="px-4 py-3 text-right font-bold text-red-400">{formatCurrency(r.ale)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
