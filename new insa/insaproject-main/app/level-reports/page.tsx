"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "@/app/components/Layout";

interface Analysis {
    questionId: number;
    section: string;
    level: string;
    question: string;
    answer: string;
    likelihood: number;
    impact: number;
    riskScore: number;
    riskLevel: string;
    gap: string;
    threat: string;
    mitigation: string;
}

interface LevelReport {
    company: string;
    category: string;
    level: string;
    date: string;
    analyses: Analysis[];
    summary: any;
}

interface Assessment {
    _id: string;
    company: string;
    category: string;
    date: string;
}

const LEVELS = [
    { key: 'operational', label: 'Operational', color: 'bg-blue-600', desc: 'Technical teams - specific vulnerabilities and immediate actions' },
    { key: 'tactical', label: 'Tactical', color: 'bg-purple-600', desc: 'Security managers - control effectiveness and treatment plans' },
    { key: 'strategic', label: 'Strategic', color: 'bg-orange-600', desc: 'Executives - overall risk posture and resource allocation' },
];

const RISK_COLORS: Record<string, string> = {
    CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/30',
    HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    LOW: 'text-green-400 bg-green-500/10 border-green-500/30',
};

export default function LevelReportsPage() {
    const { status } = useSession();
    const router = useRouter();
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [selectedAssessment, setSelectedAssessment] = useState("");
    const [selectedLevel, setSelectedLevel] = useState("operational");
    const [report, setReport] = useState<LevelReport | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        else if (status === "authenticated") fetchAssessments();
    }, [status, router]);

    async function fetchAssessments() {
        try {
            const res = await fetch("/api/analysis/processed");
            const data = await res.json();
            setAssessments(data.assessments || []);
        } catch (e) { console.error(e); }
    }

    async function fetchReport() {
        if (!selectedAssessment) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/level-report?analysisId=${selectedAssessment}&level=${selectedLevel}`);
            const data = await res.json();
            if (data.success) setReport(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    const dist = report?.summary?.riskDistribution || {};
    const levelInfo = LEVELS.find(l => l.key === selectedLevel);

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Level-Specific Reports</h1>
                    <p className="text-slate-400 text-sm mt-1">View risk analysis by Strategic, Tactical, or Operational level</p>
                </div>

                {/* Level selector */}
                <div className="grid grid-cols-3 gap-4">
                    {LEVELS.map(l => (
                        <button
                            key={l.key}
                            onClick={() => setSelectedLevel(l.key)}
                            className={`p-4 rounded-xl border text-left transition ${selectedLevel === l.key
                                ? `${l.color} border-transparent text-white`
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                                }`}
                        >
                            <p className="font-bold text-sm">{l.label}</p>
                            <p className="text-xs mt-1 opacity-80">{l.desc}</p>
                        </button>
                    ))}
                </div>

                {/* Assessment selector */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs text-slate-400 mb-1">Select Assessment</label>
                        <select
                            value={selectedAssessment}
                            onChange={(e) => setSelectedAssessment(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="">Choose an assessment...</option>
                            {assessments.map(a => (
                                <option key={a._id} value={a._id}>
                                    {a.company} - {new Date(a.date).toLocaleDateString()}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={fetchReport}
                        disabled={!selectedAssessment || loading}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition"
                    >
                        {loading ? "Loading..." : "Generate Report"}
                    </button>
                </div>

                {/* Report */}
                {report && (
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-white">{report.company}</h2>
                                    <p className="text-slate-400 text-sm mt-1">
                                        {levelInfo?.label} Level Report | {new Date(report.date).toLocaleDateString()}
                                    </p>
                                    <p className="text-slate-500 text-xs mt-1">{levelInfo?.desc}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${levelInfo?.color} text-white`}>
                                    {levelInfo?.label}
                                </span>
                            </div>

                            {/* Summary stats */}
                            <div className="grid grid-cols-4 gap-3 mt-4">
                                {[
                                    { label: 'Total', value: report.analyses.length, color: 'text-white' },
                                    { label: 'Critical', value: dist.CRITICAL || 0, color: 'text-red-400' },
                                    { label: 'High', value: dist.HIGH || 0, color: 'text-orange-400' },
                                    { label: 'Avg Score', value: `${report.summary?.averageRiskScore || 0}/25`, color: 'text-blue-400' },
                                ].map(s => (
                                    <div key={s.label} className="bg-slate-900/50 rounded-lg p-3 text-center">
                                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                        <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Questions */}
                        {report.analyses.length === 0 ? (
                            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                                <p className="text-slate-400">No {selectedLevel} level questions found for this assessment.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {report.analyses.map((a, idx) => (
                                    <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <p className="text-white font-medium text-sm flex-1 pr-4">{a.question}</p>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${RISK_COLORS[a.riskLevel] || RISK_COLORS.LOW}`}>
                                                {a.riskLevel} ({a.riskScore}/25)
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-xs mb-2">Answer: {a.answer}</p>
                                        {a.gap && <p className="text-slate-300 text-xs mb-1"><span className="text-slate-500">Gap:</span> {a.gap}</p>}
                                        {a.mitigation && (
                                            <p className="text-green-300 text-xs">
                                                <span className="text-slate-500">Mitigation:</span> {a.mitigation}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}
