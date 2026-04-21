"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import {
  HiOfficeBuilding, HiCalendar, HiShieldCheck,
  HiSearch, HiRefresh, HiDownload, HiDocumentReport,
  HiExclamation, HiBadgeCheck, HiX, HiSparkles,
} from "react-icons/hi";
import { MdOutlineTrackChanges, MdBolt, MdOpenInNew } from "react-icons/md";
import { RiBarChartBoxFill, RiFileChartFill } from "react-icons/ri";
import { FiFileText } from "react-icons/fi";

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

const REPORT_TYPES = [
  {
    key: "strategic",
    label: "Strategic",
    fullLabel: "Strategic Report",
    desc: "High-level risk posture & executive insights",
    audience: "Director / Division Head",
    Icon: MdOutlineTrackChanges,
    textColor: "text-violet-600",
    iconBg: "bg-violet-100",
    cardBg: "bg-gradient-to-br from-violet-50 to-purple-50",
    cardBorder: "border-violet-200",
    btnBg: "bg-violet-600 hover:bg-violet-700",
    btnShadow: "shadow-violet-200",
    pill: "bg-violet-100 text-violet-700",
    bar: "bg-violet-500",
  },
  {
    key: "tactical",
    label: "Tactical",
    fullLabel: "Tactical Report",
    desc: "Controls, compliance & treatment plans",
    audience: "Security Manager / Risk Analyst",
    Icon: HiShieldCheck,
    textColor: "text-sky-600",
    iconBg: "bg-sky-100",
    cardBg: "bg-gradient-to-br from-sky-50 to-blue-50",
    cardBorder: "border-sky-200",
    btnBg: "bg-sky-600 hover:bg-sky-700",
    btnShadow: "shadow-sky-200",
    pill: "bg-sky-100 text-sky-700",
    bar: "bg-sky-500",
  },
  {
    key: "operational",
    label: "Operational",
    fullLabel: "Operational Report",
    desc: "Vulnerabilities, patches & immediate actions",
    audience: "Technical Team / All Staff",
    Icon: MdBolt,
    textColor: "text-amber-600",
    iconBg: "bg-amber-100",
    cardBg: "bg-gradient-to-br from-amber-50 to-orange-50",
    cardBorder: "border-amber-200",
    btnBg: "bg-amber-500 hover:bg-amber-600",
    btnShadow: "shadow-amber-200",
    pill: "bg-amber-100 text-amber-700",
    bar: "bg-amber-500",
  },
];

const RISK_META: Record<string, { bg: string; text: string; bar: string; dot: string }> = {
  CRITICAL: { bg: "bg-red-100",    text: "text-red-600",    bar: "bg-red-500",    dot: "bg-red-500" },
  HIGH:     { bg: "bg-orange-100", text: "text-orange-600", bar: "bg-orange-400", dot: "bg-orange-400" },
  MEDIUM:   { bg: "bg-yellow-100", text: "text-yellow-600", bar: "bg-yellow-400", dot: "bg-yellow-400" },
  LOW:      { bg: "bg-emerald-100",text: "text-emerald-600",bar: "bg-emerald-400",dot: "bg-emerald-400" },
};

const EXPORT_FMTS = [
  { fmt: "PDF",   label: "PDF",   color: "text-red-500",    border: "border-red-200",    hover: "hover:bg-red-50" },
  { fmt: "DOCX",  label: "DOCX",  color: "text-blue-500",   border: "border-blue-200",   hover: "hover:bg-blue-50" },
  { fmt: "Excel", label: "Excel", color: "text-emerald-600",border: "border-emerald-200",hover: "hover:bg-emerald-50" },
  { fmt: "PPTX",  label: "PPTX",  color: "text-orange-500", border: "border-orange-200", hover: "hover:bg-orange-50" },
];

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState<{ id: string; level: string } | null>(null);
  const [exporting, setExporting] = useState<{ id: string; fmt: string } | null>(null);
  const [modal, setModal] = useState<{ assessment: Assessment; level: string; content: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const [aRes, rRes] = await Promise.all([
        fetch("/api/analysis/processed"),
        fetch("/api/registrations"),
      ]);
      const aData = await aRes.json();
      const rData = await rRes.json();
      setAssessments(aData.success && Array.isArray(aData.assessments) ? aData.assessments : []);
      setRegistrations(rData.success && Array.isArray(rData.registrations) ? rData.registrations : []);
    } catch {
      setAssessments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchData();
  }, [status, fetchData]);

  const handleGenerate = async (assessment: Assessment, level: string) => {
    setGenerating({ id: assessment._id, level });
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: assessment._id, level }),
      });
      const data = await res.json();
      if (data.success && data.report?.content) {
        setModal({ assessment, level, content: data.report.content });
      } else {
        alert(data.error || "Failed to generate report");
      }
    } catch {
      alert("Error generating report");
    } finally {
      setGenerating(null);
    }
  };

  const handleExport = async (assessment: Assessment, fmt: string) => {
    setExporting({ id: assessment._id, fmt });
    try {
      const endpoints: Record<string, string> = {
        PDF:   `/api/reports/export-pdf?analysisId=${assessment._id}`,
        DOCX:  `/api/reports/export?analysisId=${assessment._id}&format=DOCX`,
        Excel: `/api/reports/export-excel?analysisId=${assessment._id}`,
        PPTX:  `/api/reports/export-pptx?analysisId=${assessment._id}`,
      };
      const exts: Record<string, string> = { PDF: "pdf", DOCX: "docx", Excel: "xlsx", PPTX: "pptx" };
      const res = await fetch(endpoints[fmt]);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${assessment.company}-${fmt.toLowerCase()}.${exts[fmt]}`;
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch {
      alert(`Failed to export ${fmt}`);
    } finally {
      setExporting(null);
    }
  };

  const getRiskDist = (a: Assessment) => {
    const d: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    a.analyses.forEach(x => { if (d[x.riskLevel] !== undefined) d[x.riskLevel]++; });
    return d;
  };

  const getDominant = (d: Record<string, number>) =>
    d.CRITICAL > 0 ? "CRITICAL" : d.HIGH > 0 ? "HIGH" : d.MEDIUM > 0 ? "MEDIUM" : "LOW";

  const filtered = assessments.filter(a =>
    a.company.toLowerCase().includes(search.toLowerCase())
  );

  const totalCritical = assessments.reduce((s, a) => s + (getRiskDist(a).CRITICAL || 0), 0);
  const totalHigh     = assessments.reduce((s, a) => s + (getRiskDist(a).HIGH || 0), 0);

  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-72 gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
            <RiBarChartBoxFill className="absolute inset-0 m-auto w-6 h-6 text-blue-400" />
          </div>
          <p className="text-slate-400 text-sm font-medium">Loading reports...</p>
        </div>
      </Layout>
    );
  }
  if (!session) return null;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-blue-50/60 p-6">
        <div className="max-w-4xl mx-auto space-y-7">

          {/* ══ HERO HEADER ══ */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 p-7 shadow-2xl shadow-blue-200">
            {/* decorative blobs */}
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <RiFileChartFill className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">Reports</h1>
                </div>
                <p className="text-blue-100 text-sm max-w-md">
                  AI-powered security reports — generate strategic, tactical, and operational insights for every assessed organization.
                </p>
                {/* quick stats */}
                <div className="flex gap-5 mt-5">
                  {[
                    { label: "Organizations", value: assessments.length, icon: HiOfficeBuilding },
                    { label: "Critical Risks", value: totalCritical, icon: HiExclamation },
                    { label: "High Risks", value: totalHigh, icon: HiShieldCheck },
                    { label: "Certificates", value: registrations.length, icon: HiBadgeCheck },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                        <s.icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-lg leading-none">{s.value}</p>
                        <p className="text-blue-200 text-xs">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur border border-white/30 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60"
              >
                <HiRefresh className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* ══ REPORT TYPE LEGEND ══ */}
          <div className="grid grid-cols-3 gap-4">
            {REPORT_TYPES.map(rt => (
              <div key={rt.key} className={`rounded-2xl border ${rt.cardBorder} ${rt.cardBg} p-4 flex flex-col gap-3`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl ${rt.iconBg} flex items-center justify-center`}>
                    <rt.Icon className={`w-5 h-5 ${rt.textColor}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${rt.textColor}`}>{rt.label}</p>
                    <p className="text-xs text-gray-400">{rt.desc}</p>
                  </div>
                </div>
                <span className={`self-start text-xs font-semibold px-2.5 py-1 rounded-full ${rt.pill}`}>
                  {rt.audience}
                </span>
              </div>
            ))}
          </div>

          {/* ══ SEARCH ══ */}
          <div className="relative">
            <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search organization..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-3.5 bg-white rounded-2xl shadow-sm border border-gray-200 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm transition"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition">
                <HiX className="w-4 h-4" />
              </button>
            )}
          </div>
          {search && (
            <p className="text-xs text-gray-400 -mt-3 pl-1">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &quot;{search}&quot;
            </p>
          )}

          {/* ══ EMPTY STATE ══ */}
          {filtered.length === 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <FiFileText className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-gray-500 font-semibold">No organizations found</p>
              <p className="text-gray-300 text-sm mt-1">Try a different search term or refresh the list.</p>
            </div>
          )}

          {/* ══ COMPANY CARDS ══ */}
          <div className="space-y-5">
            {filtered.map(assessment => {
              const dist = getRiskDist(assessment);
              const total = Object.values(dist).reduce((s, v) => s + v, 0);
              const dominant = getDominant(dist);
              const reg = registrations.find(r => r.analysisId === assessment._id);
              const dm = RISK_META[dominant];

              return (
                <div key={assessment._id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">

                  {/* ── Card Header ── */}
                  <div className="relative px-6 pt-6 pb-5">
                    {/* subtle top accent line */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${dm.bar} opacity-60`} />

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {/* company avatar */}
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
                          <HiOfficeBuilding className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-gray-900 text-lg leading-tight">{assessment.company}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <HiCalendar className="w-3 h-3" />
                              {new Date(assessment.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                            </span>
                            <span className="text-gray-200">•</span>
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <HiShieldCheck className="w-3 h-3" />
                              {assessment.category || "General"}
                            </span>
                            <span className="text-gray-200">•</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dm.bg} ${dm.text}`}>
                              {dominant}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* right side: cert + export */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {reg && (
                          <a
                            href={`/certificates/${reg.certificateNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition"
                          >
                            <HiBadgeCheck className="w-3.5 h-3.5" />
                            Certificate
                            <MdOpenInNew className="w-3 h-3" />
                          </a>
                        )}
                        <div className="flex gap-1.5">
                          {EXPORT_FMTS.map(({ fmt, label, color, border, hover }) => (
                            <button
                              key={fmt}
                              onClick={() => handleExport(assessment, fmt)}
                              disabled={exporting?.id === assessment._id && exporting?.fmt === fmt}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border bg-white text-xs font-semibold transition ${color} ${border} ${hover} disabled:opacity-40`}
                            >
                              <HiDownload className="w-3 h-3" />
                              {exporting?.id === assessment._id && exporting?.fmt === fmt ? "..." : label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ── Risk Distribution Bar ── */}
                    <div className="mt-5">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Risk Distribution</p>
                        <p className="text-xs text-gray-400">{total} risks identified</p>
                      </div>
                      <div className="flex rounded-full overflow-hidden h-2.5 bg-gray-100 gap-px">
                        {(["CRITICAL","HIGH","MEDIUM","LOW"] as const).map(lvl =>
                          dist[lvl] > 0 ? (
                            <div
                              key={lvl}
                              title={`${lvl}: ${dist[lvl]}`}
                              className={`${RISK_META[lvl].bar} transition-all`}
                              style={{ width: `${(dist[lvl] / total) * 100}%` }}
                            />
                          ) : null
                        )}
                      </div>
                      <div className="flex gap-4 mt-2">
                        {(["CRITICAL","HIGH","MEDIUM","LOW"] as const).map(lvl => (
                          <span key={lvl} className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span className={`w-2 h-2 rounded-full ${RISK_META[lvl].dot}`} />
                            <span className="font-semibold">{dist[lvl]}</span>
                            <span className="text-gray-400">{lvl.charAt(0) + lvl.slice(1).toLowerCase()}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Report Type Rows ── */}
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {REPORT_TYPES.map(rt => {
                      const isGen = generating?.id === assessment._id && generating?.level === rt.key;
                      return (
                        <div key={rt.key} className={`flex items-center justify-between px-6 py-4 hover:bg-gray-50/70 transition-colors`}>
                          <div className="flex items-center gap-3.5">
                            <div className={`w-9 h-9 rounded-xl ${rt.iconBg} flex items-center justify-center`}>
                              <rt.Icon className={`w-5 h-5 ${rt.textColor}`} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">{rt.fullLabel}</p>
                              <p className="text-xs text-gray-400">{rt.audience}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleGenerate(assessment, rt.key)}
                            disabled={isGen}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-md ${rt.btnBg} ${rt.btnShadow} disabled:opacity-50`}
                          >
                            {isGen ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <HiSparkles className="w-3.5 h-3.5" />
                                Generate & Read
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══ REPORT MODAL ══ */}
      {modal && (() => {
        const rt = REPORT_TYPES.find(r => r.key === modal.level)!;
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">

              {/* Modal Header */}
              <div className={`relative px-6 py-5 ${rt.cardBg} border-b ${rt.cardBorder}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${rt.iconBg} flex items-center justify-center`}>
                      <rt.Icon className={`w-5 h-5 ${rt.textColor}`} />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-gray-900 text-base">{modal.assessment.company}</h2>
                      <p className={`text-xs font-semibold capitalize ${rt.textColor}`}>{modal.level} Report</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModal(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-gray-500 hover:text-gray-700 transition"
                  >
                    <HiX className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto flex-1 px-6 py-5 bg-gray-50/40">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                    <RiFileChartFill className={`w-4 h-4 ${rt.textColor}`} />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Report Content</span>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-7">
                    {modal.content}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-white flex gap-3">
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => handleExport(modal.assessment, "PDF")}
                  className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold transition shadow-lg shadow-blue-200"
                >
                  <HiDownload className="w-4 h-4" />
                  Export as PDF
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </Layout>
  );
}
