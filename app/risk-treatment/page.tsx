"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

interface QuestionAnalysis {
  question: string;
  answer: string;
  likelihood: number;
  impact: number;
  riskScore: number;
  riskLevel: string;
  gap: string;
  threat: string;
  mitigation: string;
  impactLabel?: string;
  impactDescription?: string;
}

interface ProcessedAssessment {
  _id: string;
  company: string;
  category: string;
  date: string;
  analyses: QuestionAnalysis[];
  riskMatrix: { likelihood: number; impact: number; count: number }[];
}

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

type MessageState =
  | {
    type: "success" | "error";
    text: string;
  }
  | null;

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

export default function RiskTreatmentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"mitigations" | "strategies">("mitigations");

  // Tab 1: View Mitigations state
  const [processedAssessments, setProcessedAssessments] = useState<ProcessedAssessment[]>([]);
  const [message, setMessage] = useState<MessageState>(null);
  const [viewingAssessment, setViewingAssessment] = useState<ProcessedAssessment | null>(null);
  const [viewingEdit, setViewingEdit] = useState<{
    assessmentId: string;
    level: string;
    questionId: number | string;
    current: any;
  } | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [companyFilter, setCompanyFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);

  // Tab 2: Assign Strategies state
  const [selectedAssessment, setSelectedAssessment] = useState("");
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [company, setCompany] = useState("");
  const [loadingTreatments, setLoadingTreatments] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editOption, setEditOption] = useState("");
  const [editResidual, setEditResidual] = useState("");
  const [editNote, setEditNote] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchProcessedAssessments();
      setLoading(false);
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let es: EventSource | null = null;
    if (typeof window !== "undefined" && "EventSource" in window) {
      try {
        es = new EventSource("/api/notifications/stream");
        es.addEventListener("analysis", () => {
          fetchProcessedAssessments();
        });
        es.onopen = () => console.debug("SSE connected");
        es.onerror = () => {
          console.debug("SSE error, falling back to polling");
          if (es) {
            es.close();
            es = null;
          }
        };
      } catch {
        es = null;
      }
    }

    const interval = setInterval(() => {
      if (!es) {
        fetchProcessedAssessments();
      }
    }, 15000);

    return () => {
      if (es) es.close();
      clearInterval(interval);
    };
  }, [status]);

  const fetchProcessedAssessments = async () => {
    try {
      const res = await fetch("/api/analysis/processed");
      const data = await res.json();
      const assessments: ProcessedAssessment[] =
        data.success && Array.isArray(data.assessments) ? data.assessments : [];
      setProcessedAssessments(assessments);

      const companies = Array.from(
        new Set(
          assessments
            .map((a) => a.company)
            .filter((c): c is string => !!c)
        )
      );
      setAvailableCompanies(companies);
    } catch (error) {
      console.error("Error:", error);
      setProcessedAssessments([]);
      setAvailableCompanies([]);
    }
  };

  const openAssessmentModal = (assessment: ProcessedAssessment) => {
    setViewingAssessment(assessment);
  };

  const closeAssessmentModal = () => setViewingAssessment(null);

  const closeEditModal = () => setViewingEdit(null);

  const saveEditedAnalysis = async (payload: any) => {
    try {
      const res = await fetch("/api/analysis/update-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.success) {
        fetchProcessedAssessments();
        closeEditModal();
        setMessage({ type: "success", text: "Analysis updated successfully" });
      } else {
        setMessage({
          type: "error",
          text: "Failed to save edits: " + (d.error || ""),
        });
      }
    } catch (err) {
      console.error("Save edit error", err);
      setMessage({ type: "error", text: "Error saving edits" });
    }
  };

  const handleReanalyze = async (assessmentId: string) => {
    if (
      !confirm(
        "Re-analyze this assessment? This will replace the existing analysis with fresh AI results."
      )
    )
      return;

    setReanalyzing(true);
    try {
      const res = await fetch("/api/analysis/reanalyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: assessmentId }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: "Re-analysis completed successfully",
        });
        fetchProcessedAssessments();
        closeAssessmentModal();
      } else {
        setMessage({
          type: "error",
          text: data.error || "Re-analysis failed",
        });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Error during re-analysis" });
    } finally {
      setReanalyzing(false);
    }
  };

  const filterItems = <T extends { company?: string; date?: string }>(
    items: T[]
  ) => {
    return items.filter((item) => {
      if (!item) return false;
      const matchCompany = !companyFilter || item.company === companyFilter;
      const matchDate = !dateFilter || item.date === dateFilter;
      return matchCompany && matchDate;
    });
  };

  // Tab 2 functions
  async function fetchTreatments() {
    if (!selectedAssessment) return;
    setLoadingTreatments(true);
    try {
      const res = await fetch(`/api/analysis/treatment?analysisId=${selectedAssessment}`);
      const data = await res.json();
      if (data.success) {
        setTreatments(data.treatments);
        setCompany(data.company);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTreatments(false);
    }
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
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  }

  const stats = {
    mitigate: treatments.filter(t => t.treatmentOption === 'mitigate').length,
    transfer: treatments.filter(t => t.treatmentOption === 'transfer').length,
    avoid: treatments.filter(t => t.treatmentOption === 'avoid').length,
    accept: treatments.filter(t => t.treatmentOption === 'accept').length,
    untreated: treatments.filter(t => !t.treatmentOption).length,
  };

  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!session) return null;

  const filteredAssessments = filterItems(processedAssessments).sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Risk Treatment</h1>
          <p className="text-slate-400 text-sm mt-1">
            View mitigation recommendations and assign treatment strategies
          </p>
        </div>

        {message && (
          <div
            className={`px-4 py-2 rounded ${message.type === "success"
              ? "bg-green-900/40 text-green-300 border border-green-700"
              : "bg-red-900/40 text-red-300 border border-red-700"
              }`}
          >
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-1 flex gap-1">
          <button
            onClick={() => setActiveTab("mitigations")}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition ${activeTab === "mitigations"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
          >
            View Mitigations
          </button>
          <button
            onClick={() => setActiveTab("strategies")}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition ${activeTab === "strategies"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
          >
            Assign Strategies
          </button>
        </div>

        {/* TAB 1: View Mitigations */}
        {activeTab === "mitigations" && (
          <>
            {/* Filters */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Filter List</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-2">
                    Company Name
                  </label>
                  <select
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                  >
                    <option value="">All Companies</option>
                    {availableCompanies.map((company) => (
                      <option key={company} value={company}>
                        {company}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Date</label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Assessments List */}
            <div className="space-y-4">
              {filteredAssessments.length === 0 ? (
                <div className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg p-12 text-center">
                  <p className="text-white font-semibold mb-2">
                    No processed assessments
                  </p>
                  <p className="text-slate-400">
                    Analyze questionnaires to see results here
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-slate-400 mb-4">
                    Showing {filteredAssessments.length} of{" "}
                    {processedAssessments.length} assessments
                  </p>
                  <div className="space-y-4">
                    {filteredAssessments.map((assessment) => (
                      <div
                        key={assessment._id}
                        className="bg-slate-800 rounded-lg border border-slate-700 p-6 hover:border-blue-500 hover:shadow-lg transition cursor-pointer"
                        onClick={() => openAssessmentModal(assessment)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-2">
                              {assessment.company || "Unknown Company"}
                            </h3>
                            <div className="space-y-1 text-sm text-slate-300">
                              <p>
                                <span className="font-medium">Category:</span>{" "}
                                {assessment.category || "Uncategorized"}
                              </p>
                              <p>
                                <span className="font-medium">Date:</span>{" "}
                                {assessment.date
                                  ? new Date(
                                    assessment.date
                                  ).toLocaleDateString()
                                  : "N/A"}
                              </p>
                              <p>
                                <span className="font-medium">Questions:</span>{" "}
                                {(assessment.analyses || []).length} analyzed
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAssessmentModal(assessment);
                              }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition font-medium text-sm"
                            >
                              View Details
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchProcessedAssessments();
                              }}
                              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition font-medium text-sm"
                            >
                              Refresh
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: Assign Strategies */}
        {activeTab === "strategies" && (
          <>
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
                  {processedAssessments.map(a => (
                    <option key={a._id} value={a._id}>
                      {a.company} - {new Date(a.date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={fetchTreatments}
                disabled={!selectedAssessment || loadingTreatments}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition"
              >
                {loadingTreatments ? "Loading..." : "Load Risks"}
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
          </>
        )}
      </div>

      {/* Assessment Details Modal (for Tab 1) */}
      {viewingAssessment && activeTab === "mitigations" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {viewingAssessment.company}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {viewingAssessment.category}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  {viewingAssessment.date
                    ? new Date(viewingAssessment.date).toLocaleString()
                    : ""}
                </p>
              </div>
              <button
                onClick={closeAssessmentModal}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-2">
                  Total Questions Analyzed
                </p>
                <p className="text-3xl font-bold text-white">
                  {(viewingAssessment.analyses || []).length}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-4">
                  Questions And Mitigation
                </h3>
                <div className="space-y-4">
                  {(viewingAssessment.analyses || []).map((a, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/50 rounded-lg p-4 border border-slate-700"
                    >
                      <div className="mb-3">
                        <p className="text-xs text-slate-400 mb-1">
                          Question {idx + 1}
                        </p>
                        <p className="text-white font-medium">
                          {a.question}
                        </p>
                      </div>

                      <div className="mb-4">
                        <p className="text-xs text-slate-400 mb-1">Answer</p>
                        <p className="text-slate-300">{a.answer}</p>
                      </div>

                      {/* Mitigation as main highlight */}
                      {a.mitigation && a.mitigation.trim() !== "" && (
                        <div className="mb-5">
                          <div className="rounded-xl border border-emerald-500 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 p-4 shadow-lg">
                            <p className="text-xs font-semibold tracking-wide text-emerald-100 mb-2 uppercase">
                              Recommended Mitigation
                            </p>
                            <p className="text-sm text-emerald-50 leading-relaxed">
                              {a.mitigation}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Gap, threat, impact description */}
                      <div className="space-y-3 mb-4">
                        {a.gap && a.gap !== "" && (
                          <div>
                            <p className="text-xs text-slate-400 mb-1">
                              Gap
                            </p>
                            <p className="text-slate-300 text-sm">{a.gap}</p>
                          </div>
                        )}
                        {a.threat && a.threat !== "" && (
                          <div>
                            <p className="text-xs text-slate-400 mb-1">
                              Threat
                            </p>
                            <p className="text-slate-300 text-sm">
                              {a.threat}
                            </p>
                          </div>
                        )}
                        {a.impactDescription && a.impactDescription !== "" && (
                          <div>
                            <p className="text-xs text-slate-400 mb-1">
                              Impact Description
                            </p>
                            <p className="text-slate-300 text-sm">
                              {a.impactDescription}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setViewingEdit({
                              assessmentId: viewingAssessment._id,
                              level: a.riskLevel,
                              questionId: idx,
                              current: a,
                            })
                          }
                          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm font-medium transition"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-6 flex justify-end gap-3">
              <button
                onClick={() => handleReanalyze(viewingAssessment._id)}
                disabled={reanalyzing}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reanalyzing ? "Re-analyzing..." : "Re-analyze"}
              </button>
              <button
                onClick={closeAssessmentModal}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Analysis Modal */}
      {viewingEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-2xl w-full">
            <div className="bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Edit Analysis</h2>
              <button
                onClick={closeEditModal}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Likelihood (1-5)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    defaultValue={viewingEdit.current.likelihood}
                    id="edit-likelihood"
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Impact (1-5)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    defaultValue={viewingEdit.current.impact}
                    id="edit-impact"
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mitigation (primary)
                </label>
                <textarea
                  defaultValue={viewingEdit.current.mitigation}
                  id="edit-mitigation"
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-emerald-500 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Gap
                </label>
                <textarea
                  defaultValue={viewingEdit.current.gap}
                  id="edit-gap"
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Threat
                </label>
                <textarea
                  defaultValue={viewingEdit.current.threat}
                  id="edit-threat"
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Impact Description
                </label>
                <textarea
                  defaultValue={viewingEdit.current.impactDescription}
                  id="edit-impactDescription"
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-slate-800 border-t border-slate-700 p-6 flex gap-3">
              <button
                onClick={async () => {
                  const likelihood = Number(
                    (
                      document.getElementById(
                        "edit-likelihood"
                      ) as HTMLInputElement
                    ).value || viewingEdit.current.likelihood
                  );
                  const impact = Number(
                    (
                      document.getElementById(
                        "edit-impact"
                      ) as HTMLInputElement
                    ).value || viewingEdit.current.impact
                  );
                  const mitigation = (
                    document.getElementById(
                      "edit-mitigation"
                    ) as HTMLTextAreaElement
                  ).value;
                  const gap = (
                    document.getElementById(
                      "edit-gap"
                    ) as HTMLTextAreaElement
                  ).value;
                  const threat = (
                    document.getElementById(
                      "edit-threat"
                    ) as HTMLTextAreaElement
                  ).value;
                  const impactDescription = (
                    document.getElementById(
                      "edit-impactDescription"
                    ) as HTMLTextAreaElement
                  ).value;

                  await saveEditedAnalysis({
                    analysisId: viewingEdit.assessmentId,
                    level: viewingEdit.level,
                    questionId: viewingEdit.questionId,
                    analysis: {
                      likelihood,
                      impact,
                      gap,
                      threat,
                      mitigation,
                      impactDescription,
                    },
                  });
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition font-medium"
              >
                Save Changes
              </button>
              <button
                onClick={closeEditModal}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
