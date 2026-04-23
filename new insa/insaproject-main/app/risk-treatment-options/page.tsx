"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "@/app/components/Layout";

interface Treatment {
    idx: number;
    questionId: number;
    question: string;
    riskLevel: string;
    riskScore: number;
    inherentRisk: number;
    residualRisk: number | null;
    treatmentOption: string | null;
    treatmentNote: string;
}

interface Assessment {
    _id: string;
    company: string;
    date: string;
}

const TREATMENT_OPTIONS = [
    { value: 'mitigate', label: 'Mitigate', color: 'bg-blue-600', desc: 'Reduce the risk by implementing controls' },
    { value: 'transfer', label: 'Transfer', color: 'bg-purple-600', desc: 'Transfer risk to third party (insurance, outsourcing)' },
    { value: 'avoid', label: 'Avoid', color: 'bg-red-600', desc: 'Eliminate the risk by stopping the activity' },
    { value: 'accept', label: 'Accept', color: 'bg-green-600', desc: 'Accept the risk as is (low risk or cost too high)' },
];

const RISK_COLORS: Record<string, string> = {
    CRITICAL: 'text-red-400 border-red-500/30 bg-red-500/10',
    HIGH: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    MEDIUM: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    LOW: 'text-green-400 border-green-500/30 bg-green-500/10',
};

export default function RiskTreatmentOptionsPage() {
    const { status } = useSession();
    const router = useRouter();
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [selectedAssessment, setSelectedAssessment] = useState("");
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [company, setCompany] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState<number | null>(null);
    const [editIdx, setEditIdx] = useState<number | null>(null);
    const [editOption, setEditOption] = useState("");
    const [editResidual, setEditResidual] = useState("");
    const [editNote, setEditNote] = useState("");

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        else if (status === "authenticated") {
            fetch("/api/analysis/processed")
                .then(r => r.json())
                .then(d => setAssessments(d.assessments || []));
        }
    }, [status, router]);

    async function fetchTreatments() {
        if (!selectedAssessment) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/analysis/treatment?analysisId=${selectedAssessment}`);
            const data = await res.json();
            if (data.success) {
                setTreatments(data.treatments);
                setCompany(data.company);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    async function saveTreatment(idx: number) {
        setSaving(idx);
        try {
            await fetch('/api/analysis/treatment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analysisId: selectedAssessment,
                    questionIdx: idx,
                    treatmentOption: editOption,
                    residualRisk: editResidual ? Number(editResidual) : null,
                    treatmentNote: editNote,
                }),
            });
            setTreatments(prev => prev.map(t =>
                t.idx === idx ? { ...t, treatmentOption: editOption, residualRisk: editResidual ? Number(editResidual) : t.residualRisk, treatmentNote: editNote } : t
            ));
            setEditIdx(null);
        } catch (e) { console.error(e); }
        finally { setSaving(null); }
    }

    const stats = {
        mitigate: treatments.filter(t => t.treatmentOption === 'mitigate').length,
        transfer: treatments.filter(t => t.treatmentOption === 'transfer').length,
        avoid: treatments.filter(t => t.treatmentOption === 'avoid').length,
        accept: treatments.filter(t => t.treatmentOption === 'accept').length,
        untreated: treatments.filter(t => !t.treatmentOption).length,
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Risk Treatment Options</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Assign treatment options: Mitigate, Transfer, Avoid, or Accept for each risk
                    </p>
                </div>

                {/* Treatment options legend */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {TREATMENT_OPTIONS.map(opt => (
                        <div key={opt.value} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white ${opt.color} mb-1`}>
                                {opt.label}
                            </span>
                            <p className="text-slate-400 text-xs">{opt.desc}</p>
                        </div>
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
                            <option value="">Choose assessment...</option>
                            {assessments.map(a => (
                                <option key={a._id} value={a._id}>
                                    {a.company} - {new Date(a.date).toLocaleDateString()}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={fetchTreatments}
                        disabled={!selectedAssessment || loading}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition"
                    >
                        {loading ? "Loading..." : "Load Risks"}
                    </button>
                </div>

                {/* Stats */}
                {treatments.length > 0 && (
                    <div className="grid grid-cols-5 gap-3">
                        {[
                            { label: 'Mitigate', count: stats.mitigate, color: 'text-blue-400' },
                            { label: 'Transfer', count: stats.transfer, color: 'text-purple-400' },
                            { label: 'Avoid', count: stats.avoid, color: 'text-red-400' },
                            { label: 'Accept', count: stats.accept, color: 'text-green-400' },
                            { label: 'Untreated', count: stats.untreated, color: 'text-slate-400' },
                        ].map(s => (
                            <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
                                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Risk list */}
                {treatments.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-white font-semibold">{company} - {treatments.length} Risks</h2>
                        {treatments.map((t) => (
                            <div key={t.idx} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <p className="text-white text-sm font-medium">{t.question}</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${RISK_COLORS[t.riskLevel] || RISK_COLORS.LOW}`}>
                                                {t.riskLevel}
                                            </span>
                                            <span className="text-slate-400 text-xs">
                                                Inherent: <span className="text-red-400 font-mono">{t.inherentRisk}/25</span>
                                            </span>
                                            {t.residualRisk !== null && (
                                                <span className="text-slate-400 text-xs">
                                                    Residual: <span className="text-green-400 font-mono">{t.residualRisk}/25</span>
                                                </span>
                                            )}
                                            {t.treatmentOption && (
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${TREATMENT_OPTIONS.find(o => o.value === t.treatmentOption)?.color || 'bg-slate-600'
                                                    }`}>
                                                    {t.treatmentOption.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        {t.treatmentNote && (
                                            <p className="text-slate-400 text-xs mt-1">{t.treatmentNote}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditIdx(t.idx);
                                            setEditOption(t.treatmentOption || '');
                                            setEditResidual(t.residualRisk?.toString() || '');
                                            setEditNote(t.treatmentNote || '');
                                        }}
                                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs transition whitespace-nowrap"
                                    >
                                        {t.treatmentOption ? 'Edit' : 'Assign'}
                                    </button>
                                </div>

                                {/* Edit form */}
                                {editIdx === t.idx && (
                                    <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {TREATMENT_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setEditOption(opt.value)}
                                                    className={`py-2 rounded-lg text-xs font-bold transition ${editOption === opt.value
                                                            ? `${opt.color} text-white`
                                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                        }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1">Residual Risk Score (0-25)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={25}
                                                    value={editResidual}
                                                    onChange={(e) => setEditResidual(e.target.value)}
                                                    placeholder="After treatment..."
                                                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1">Treatment Note</label>
                                                <input
                                                    type="text"
                                                    value={editNote}
                                                    onChange={(e) => setEditNote(e.target.value)}
                                                    placeholder="Brief note..."
                                                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => saveTreatment(t.idx)}
                                                disabled={!editOption || saving === t.idx}
                                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
                                            >
                                                {saving === t.idx ? 'Saving...' : 'Save'}
                                            </button>
                                            <button
                                                onClick={() => setEditIdx(null)}
                                                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs transition"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
