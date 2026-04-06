"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

type Analysis = {
  questionId: number;
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
  impactLabel: string;
  impactDescription: string;
};

type Assessment = {
  _id: string;
  company: string;
  category: string;
  date: string;
  analyses: Analysis[];
  summary?: any;
};

type Registration = {
  analysisId: string;
  certificateNumber: string;
  overallRiskLevel: string;
  registeredAt: string;
};

const RISK_CHART_COLORS = {
  CRITICAL: '#DC2626',
  HIGH: '#EA580C',
  MEDIUM: '#EAB308',
  LOW: '#16A34A',
};

const TABS = [
  { key: 'all', label: 'All Reports', color: 'bg-slate-600', audience: 'All Users' },
  { key: 'strategic', label: 'Strategic', color: 'bg-orange-600', audience: 'Directors & Executives' },
  { key: 'tactical', label: 'Tactical', color: 'bg-purple-600', audience: 'Division Heads & Managers' },
  { key: 'operational', label: 'Operational', color: 'bg-blue-600', audience: 'Technical Teams' },
];

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [processedAssessments, setProcessedAssessments] = useState<Assessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([]);
  const [loadingDocx, setLoadingDocx] = useState(true);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchProcessedAssessments = useCallback(async () => {
    try {
      setLoadingDocx(true);
      const [assessRes, regRes] = await Promise.all([
        fetch("/api/analysis/processed"),
        fetch("/api/registrations"),
      ]);
      const assessData = await assessRes.json();
      const regData = await regRes.json();
      setProcessedAssessments(
        assessData.success && Array.isArray(assessData.assessments) ? assessData.assessments : []
      );
      setRegistrations(
        regData.success && Array.isArray(regData.registrations) ? regData.registrations : []
      );
    } catch (error) {
      console.error("Error:", error);
      setProcessedAssessments([]);
    } finally {
      setLoadingDocx(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchProcessedAssessments();
  }, [status, fetchProcessedAssessments]);

  useEffect(() => {
    let filtered = [...processedAssessments];
    if (selectedCompany) filtered = filtered.filter(a => a.company.toLowerCase() === selectedCompany.toLowerCase());
    if (selectedDate) filtered = filtered.filter(a => new Date(a.date).toISOString().split("T")[0] === selectedDate);
    setFilteredAssessments(filtered);
  }, [processedAssessments, selectedCompany, selectedDate]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    window.URL.revokeObjectURL(url); document.body.removeChild(a);
  };

  const handleExport = async (assessment: Assessment, format: string) => {
    try {
      const endpoints: Record<string, string> = {
        DOCX: `/api/reports/export?analysisId=${assessment._id}&format=DOCX`,
        Excel: `/api/reports/export-excel?analysisId=${assessment._id}`,
        PDF: `/api/reports/export-pdf?analysisId=${assessment._id}`,
        PPTX: `/api/reports/export-pptx?analysisId=${assessment._id}`,
      };
      const exts: Record<string, string> = { DOCX: 'docx', Excel: 'xlsx', PDF: 'pdf', PPTX: 'pptx' };
      const res = await fetch(endpoints[format]);
      if (!res.ok) throw new Error(`Failed to generate ${format}`);
      const blob = await res.blob();
      const date = new Date(assessment.date).toISOString().split("T")[0];
      downloadBlob(blob, `${activeTab}-report-${assessment.company}-${date}.${exts[format]}`);
    } catch (error) {
      alert(`Error generating ${format} report`);
    }
  };

  const closeModal = () => { setIsModalOpen(false); setSelectedAssessment(null); };

  const uniqueCompanies = Array.from(new Set(processedAssessments.map(a => a.company)));
  const uniqueDates = Array.from(new Set(processedAssessments.map(a => new Date(a.date).toISOString().split("T")[0]))).sort().reverse();

  if (status === "loading" || loadingDocx) {
    return <Layout><div className="flex items-center justify-center h-64"><div className="text-slate-400">Loading...</div></div></Layout>;
  }
  if (!session) return null;

  // Helper: get risk distribution for an assessment
  const getRiskDist = (assessment: Assessment) => {
    const analyses = activeTab === 'all' ? assessment.analyses : assessment.analyses.filter(a => a.level === activeTab);
    const dist = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    analyses.forEach(a => { if (dist[a.riskLevel as keyof typeof dist] !== undefined) dist[a.riskLevel as keyof typeof dist]++; });
    return { dist, analyses };
  };

  const currentTab = TABS.find(t => t.key === activeTab)!;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Reports & Documentation</h1>
        </div>

        {/* Report Level Tabs */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-1 flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition ${activeTab === tab.key ? `${tab.color} text-white` : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
            >
              <div>{tab.label}</div>
              <div className="text-xs font-normal opacity-75">{tab.audience}</div>
            </button>
          ))}
        </div>

        {/* Tab description */}
        {activeTab !== 'all' && (
          <div className={`rounded-lg p-3 border ${activeTab === 'strategic' ? 'bg-orange-900/20 border-orange-600/30 text-orange-300' :
            activeTab === 'tactical' ? 'bg-purple-900/20 border-purple-600/30 text-purple-300' :
              'bg-blue-900/20 border-blue-600/30 text-blue-300'
            } text-sm`}>
            {activeTab === 'strategic' && '📊 Strategic Report: High-level graphical overview of overall risk posture, trending and resource allocation for executives.'}
            {activeTab === 'tactical' && '📋 Tactical Report: Control effectiveness, risk treatment plans and compliance status for security managers.'}
            {activeTab === 'operational' && '🔧 Operational Report: Specific vulnerabilities, patching requirements and immediate action items for technical teams.'}
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Filter by Company</label>
              <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none">
                <option value="">All Companies</option>
                {uniqueCompanies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Filter by Date</label>
              <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none">
                <option value="">All Dates</option>
                {uniqueDates.map(d => <option key={d} value={d}>{new Date(d).toLocaleDateString()}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Assessments */}
        {filteredAssessments.length === 0 ? (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
            <p className="text-slate-400 text-lg">No assessed questionnaires found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredAssessments.map((assessment) => {
              const { dist, analyses } = getRiskDist(assessment);
              const reg = registrations.find(r => r.analysisId === assessment._id);
              const chartData = Object.entries(dist).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k, value: v, color: RISK_CHART_COLORS[k as keyof typeof RISK_CHART_COLORS] }));
              const criticalHighRisks = analyses.filter(a => a.riskLevel === 'CRITICAL' || a.riskLevel === 'HIGH').slice(0, 5);
              const avgScore = analyses.length > 0 ? (analyses.reduce((s, a) => s + a.riskScore, 0) / analyses.length).toFixed(1) : '0';

              return (
                <div key={assessment._id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                  {/* Assessment Header */}
                  <div className="p-6 border-b border-slate-700">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white">{assessment.company}</h3>
                        <p className="text-slate-400 text-sm mt-1">
                          {new Date(assessment.date).toLocaleDateString()} | Category: {assessment.category} | {analyses.length} questions
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        {['DOCX', 'PDF', 'Excel', 'PPTX'].map(fmt => (
                          <button key={fmt} onClick={() => handleExport(assessment, fmt)}
                            className={`px-3 py-1.5 rounded text-xs font-semibold text-white transition ${fmt === 'DOCX' ? 'bg-blue-600 hover:bg-blue-700' :
                              fmt === 'PDF' ? 'bg-red-600 hover:bg-red-700' :
                                fmt === 'Excel' ? 'bg-emerald-600 hover:bg-emerald-700' :
                                  'bg-orange-600 hover:bg-orange-700'
                              }`}>
                            {fmt}
                          </button>
                        ))}
                        {reg && (
                          <a href={`/certificates/${reg.certificateNumber}`} target="_blank" rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold transition">
                            Certificate
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Strategic Tab: Charts + Summary */}
                  {(activeTab === 'all' || activeTab === 'strategic') && (
                    <div className="p-6 border-b border-slate-700">
                      {activeTab === 'strategic' && <p className="text-orange-300 text-xs font-semibold uppercase mb-3">Executive Summary</p>}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Risk Distribution Pie Chart */}
                        <div className="md:col-span-1">
                          <p className="text-slate-400 text-xs mb-2">Risk Distribution</p>
                          {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={160}>
                              <PieChart>
                                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff', fontSize: 11 }} />
                                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : <p className="text-slate-500 text-xs">No data</p>}
                        </div>
                        {/* Risk Stats */}
                        <div className="md:col-span-2 grid grid-cols-2 gap-3">
                          {[
                            { label: 'Avg Risk Score', value: `${avgScore}/25`, color: 'text-blue-400' },
                            { label: 'Critical', value: dist.CRITICAL, color: 'text-red-400' },
                            { label: 'High', value: dist.HIGH, color: 'text-orange-400' },
                            { label: 'Total Questions', value: analyses.length, color: 'text-white' },
                          ].map(s => (
                            <div key={s.label} className="bg-slate-900/50 rounded-lg p-3 text-center">
                              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                              <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bar Chart - only on Strategic tab */}
                      {activeTab === 'strategic' && chartData.length > 0 && (
                        <div className="mt-4">
                          <p className="text-slate-400 text-xs mb-2">Risk Level Breakdown</p>
                          <ResponsiveContainer width="100%" height={140}>
                            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff', fontSize: 11 }} />
                              <Bar dataKey="value" name="Count">
                                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tactical Tab: Control Effectiveness + Treatment Plans */}
                  {(activeTab === 'tactical') && (
                    <div className="p-6 border-b border-slate-700">
                      <p className="text-purple-300 text-xs font-semibold uppercase mb-3">Control Effectiveness & Treatment Plans</p>
                      <div className="space-y-2">
                        {criticalHighRisks.map((a, i) => (
                          <div key={i} className="bg-slate-900/50 rounded-lg p-3 flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-white text-xs font-medium">{a.question.substring(0, 80)}...</p>
                              <p className="text-slate-400 text-xs mt-1">Gap: {a.gap?.substring(0, 60)}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${a.riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-300' : 'bg-orange-500/20 text-orange-300'}`}>
                                {a.riskLevel}
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-300">Mitigate</span>
                            </div>
                          </div>
                        ))}
                        {criticalHighRisks.length === 0 && <p className="text-slate-500 text-sm">No critical/high risks found.</p>}
                      </div>
                    </div>
                  )}

                  {/* Operational Tab: Vulnerabilities + Action Items */}
                  {(activeTab === 'operational') && (
                    <div className="p-6 border-b border-slate-700">
                      <p className="text-blue-300 text-xs font-semibold uppercase mb-3">Vulnerabilities & Immediate Action Items</p>
                      <div className="space-y-2">
                        {analyses.filter(a => a.riskLevel === 'CRITICAL' || a.riskLevel === 'HIGH').map((a, i) => (
                          <div key={i} className="bg-slate-900/50 rounded-lg p-3">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-white text-xs font-medium flex-1">{a.question.substring(0, 70)}...</p>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 ${a.riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-300' : 'bg-orange-500/20 text-orange-300'}`}>
                                {a.riskScore}/25
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs">Answer: {a.answer}</p>
                            {a.mitigation && <p className="text-green-300 text-xs mt-1">→ Action: {a.mitigation.substring(0, 80)}</p>}
                          </div>
                        ))}
                        {analyses.filter(a => a.riskLevel === 'CRITICAL' || a.riskLevel === 'HIGH').length === 0 && (
                          <p className="text-slate-500 text-sm">No critical/high vulnerabilities found.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* All Tab: View Details button */}
                  {activeTab === 'all' && (
                    <div className="p-4">
                      <button onClick={() => { setSelectedAssessment(assessment); setIsModalOpen(true); }}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md text-sm font-medium transition">
                        View Full Details
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {isModalOpen && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedAssessment.company}</h2>
                <p className="text-sm text-slate-400 mt-1">{new Date(selectedAssessment.date).toLocaleDateString()}</p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              {selectedAssessment.analyses.map((analysis, index) => (
                <div key={index} className="border border-slate-700 rounded-lg p-4 space-y-2">
                  <p className="text-xs text-slate-400">Question {index + 1}</p>
                  <p className="text-white font-medium text-sm">{analysis.question}</p>
                  <p className="text-slate-300 text-sm">Answer: {analysis.answer}</p>
                  <div className="flex gap-4 text-xs text-slate-400">
                    <span>L: {analysis.likelihood}/5</span>
                    <span>I: {analysis.impact}/5</span>
                    <span className={`font-bold ${analysis.riskLevel === 'CRITICAL' ? 'text-red-400' : analysis.riskLevel === 'HIGH' ? 'text-orange-400' : analysis.riskLevel === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'}`}>
                      {analysis.riskLevel} ({analysis.riskScore}/25)
                    </span>
                  </div>
                  {analysis.gap && <p className="text-slate-300 text-xs">Gap: {analysis.gap}</p>}
                  {analysis.mitigation && <p className="text-green-300 text-xs">Mitigation: {analysis.mitigation}</p>}
                </div>
              ))}
            </div>
            <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-4 flex gap-3">
              <button onClick={closeModal} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition font-medium">Close</button>
              <button onClick={() => { handleExport(selectedAssessment, 'DOCX'); closeModal(); }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition font-medium">Export DOCX</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
