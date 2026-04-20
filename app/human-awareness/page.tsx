
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Layout from "@/app/components/Layout";
import {
  HiOutlineAcademicCap, HiSparkles, HiX, HiDownload,
  HiCheckCircle, HiSearch, HiOfficeBuilding, HiCalendar,
  HiOutlineDocumentText, HiChevronRight,
} from "react-icons/hi";
import { MdBolt } from "react-icons/md";

// ── Types ──────────────────────────────────────────────────────────────────
type Period = "monthly" | "6-month" | "yearly";
type ReportType = "specific" | "general";

interface HAReport {
  _id: string;
  company: string;
  reportType: ReportType;
  period: Period;
  periodLabel: string;
  content: string;
  cultureScore: string;
  participationRate: number;
  phishingClickRate: number;
  phishingReportRate: number;
  trainingCompletion: number;
  highRiskDepartments: string[];
  generatedAt: string;
  notificationSent: boolean;
}

const GRADE_META: Record<string, { color: string; bg: string; border: string; label: string }> = {
  A: { color: "text-emerald-600", bg: "bg-emerald-50",  border: "border-emerald-200", label: "Excellent" },
  B: { color: "text-blue-600",    bg: "bg-blue-50",     border: "border-blue-200",    label: "Good" },
  C: { color: "text-yellow-600",  bg: "bg-yellow-50",   border: "border-yellow-200",  label: "Fair" },
  D: { color: "text-orange-600",  bg: "bg-orange-50",   border: "border-orange-200",  label: "Poor" },
  F: { color: "text-red-600",     bg: "bg-red-50",      border: "border-red-200",     label: "Critical" },
};

const DEPARTMENTS = [
  "Finance","Sales","Marketing","HR","IT","Operations",
  "Legal","Executive","Customer Support","Engineering",
];

const PERIOD_LABELS: Record<Period, string> = {
  "monthly":  "Monthly",
  "6-month":  "6-Month",
  "yearly":   "Annual",
};

export default function HumanAwarenessPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Data ──
  const [allReports, setAllReports] = useState<HAReport[]>([]);
  const [companies, setCompanies] = useState<{ name: string; category: string; date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Filters ──
  const [nameSearch, setNameSearch] = useState("");
  const [dateSearch, setDateSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ReportType>("all");

  // ── UI ──
  const [viewReport, setViewReport] = useState<HAReport | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);

  // ── Form ──
  const [fCompany, setFCompany] = useState("");
  const [fCompanySearch, setFCompanySearch] = useState("");
  const [fShowDrop, setFShowDrop] = useState(false);
  const [fReportType, setFReportType] = useState<ReportType>("specific");
  const [fPeriod, setFPeriod] = useState<Period>("monthly");
  const [fPeriodLabel, setFPeriodLabel] = useState("");
  const [fParticipation, setFParticipation] = useState(75);
  const [fClickRate, setFClickRate] = useState(20);
  const [fReportRate, setFReportRate] = useState(45);
  const [fTraining, setFTraining] = useState(68);
  const [fDepts, setFDepts] = useState<string[]>([]);
  const [fContext, setFContext] = useState("");
  const [fError, setFError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/human-awareness/list");
      const data = await res.json();
      setAllReports(data.success ? data.reports : []);
    } catch { setAllReports([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchReports();
      fetch("/api/analysis/processed")
        .then(r => r.json())
        .then(d => {
          if (d.success && Array.isArray(d.assessments)) {
            const unique = Array.from(
              new Map(d.assessments.map((a: any) => [
                a.company,
                { name: a.company, category: a.category, date: a.date }
              ])).values()
            ) as { name: string; category: string; date: string }[];
            setCompanies(unique);
          }
        }).catch(() => {});
    }
  }, [status, fetchReports]);

  // Auto-open from notification link
  useEffect(() => {
    const id = searchParams.get("id");
    if (id && allReports.length > 0) {
      const found = allReports.find(r => r._id === id);
      if (found) setViewReport(found);
    }
  }, [searchParams, allReports]);

  // ── Filtered list ──
  const filtered = allReports.filter(r => {
    const matchName = r.company.toLowerCase().includes(nameSearch.toLowerCase());
    const matchDate = dateSearch
      ? new Date(r.generatedAt).toISOString().split("T")[0] === dateSearch
      : true;
    const matchType = typeFilter === "all" || r.reportType === typeFilter;
    return matchName && matchDate && matchType;
  });

  // ── Form helpers ──
  const selectCompany = (c: { name: string; category: string; date: string }) => {
    setFCompany(c.name);
    setFCompanySearch(c.name);
    setFShowDrop(false);
    setFContext(`Industry: ${c.category}. Assessment date: ${new Date(c.date).toLocaleDateString()}.`);
    const now = new Date();
    if (fPeriod === "monthly") setFPeriodLabel(now.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
    else if (fPeriod === "6-month") setFPeriodLabel(now.getMonth() < 6 ? `H1 ${now.getFullYear()}` : `H2 ${now.getFullYear()}`);
    else setFPeriodLabel(`${now.getFullYear()} Annual`);
  };

  const toggleDept = (d: string) =>
    setFDepts(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const handleGenerate = async () => {
    if (!fCompany.trim()) { setFError("Select a company."); return; }
    if (!fPeriodLabel.trim()) { setFError("Period label is required."); return; }
    setFError(""); setGenerating(true);
    try {
      const res = await fetch("/api/human-awareness/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: fCompany, reportType: fReportType, period: fPeriod,
          periodLabel: fPeriodLabel, participationRate: fParticipation,
          phishingClickRate: fClickRate, phishingReportRate: fReportRate,
          trainingCompletion: fTraining, highRiskDepartments: fDepts,
          additionalContext: fContext,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        await fetchReports();
        setViewReport(data.report);
      } else { setFError(data.error || "Generation failed."); }
    } catch { setFError("Network error."); }
    finally { setGenerating(false); }
  };

  const downloadTxt = (r: HAReport) => {
    const blob = new Blob([r.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${r.company}-${r.periodLabel}-awareness.txt`;
    document.body.appendChild(a); a.click();
    URL.revokeObjectURL(url); document.body.removeChild(a);
  };

  const gradeOf = (r: HAReport) => GRADE_META[r.cultureScore] || GRADE_META["C"];

  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-72 gap-3">
          <div className="w-8 h-8 border-4 border-violet-100 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading awareness reports...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/20 to-blue-50/20 p-6">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* ── Page Header ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200">
                <HiOutlineAcademicCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-gray-900">Human Awareness Reports</h1>
                <p className="text-xs text-gray-400">AI-generated behavioral risk reports per company</p>
              </div>
            </div>
            <button
              onClick={() => { setFError(""); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-violet-200"
            >
              <HiSparkles className="w-4 h-4" />
              Generate Report
            </button>
          </div>

          {/* ── Search Bars ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Name search */}
            <div className="relative">
              <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search organization..."
                value={nameSearch}
                onChange={e => setNameSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-200 shadow-sm"
              />
            </div>
            {/* Date search */}
            <div className="relative">
              <HiCalendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={dateSearch}
                onChange={e => setDateSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-200 shadow-sm"
              />
            </div>
          </div>

          {/* ── Type Filter Tabs ── */}
          <div className="flex gap-2">
            {(["all", "specific", "general"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition
                  ${typeFilter === t
                    ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                    : "bg-white border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600"
                  }`}
              >
                {t === "all" ? "All Reports" : t === "specific" ? "Specific" : "General"}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400 self-center">
              {filtered.length} report{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* ── Company List ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
                  <HiOutlineDocumentText className="w-7 h-7 text-violet-300" />
                </div>
                <p className="text-gray-500 font-semibold">No reports found</p>
                <p className="text-gray-400 text-sm">Generate a report or adjust your filters.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-violet-200"
                >
                  Generate Now
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((r, idx) => {
                  const gm = gradeOf(r);
                  const accentColor =
                    r.cultureScore === "A" || r.cultureScore === "B" ? "bg-emerald-400" :
                    r.cultureScore === "C" ? "bg-yellow-400" : "bg-red-400";
                  return (
                    <div key={r._id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors">
                      {/* Index + accent dot */}
                      <div className="flex items-center gap-2 shrink-0 w-8">
                        <span className={`w-2 h-2 rounded-full ${accentColor}`} />
                        <span className="text-xs text-gray-300 font-medium">{idx + 1}</span>
                      </div>

                      {/* Company icon */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-100">
                        <HiOfficeBuilding className="w-5 h-5 text-white" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold text-gray-800 text-sm truncate">{r.company}</p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0
                            ${r.reportType === "specific" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
                            {r.reportType === "specific" ? "Specific" : "General"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <HiCalendar className="w-3 h-3" />
                            {new Date(r.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                          <span>·</span>
                          <span>{PERIOD_LABELS[r.period]}</span>
                          <span>·</span>
                          <span>{r.periodLabel}</span>
                          {r.notificationSent && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1 text-emerald-500 font-medium">
                                <HiCheckCircle className="w-3 h-3" /> Notified
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Grade badge */}
                      <div className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center shrink-0 ${gm.bg} ${gm.border}`}>
                        <span className={`text-sm font-extrabold ${gm.color}`}>{r.cultureScore}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => downloadTxt(r)}
                          title="Download report"
                          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                        >
                          <HiDownload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewReport(r)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-violet-200"
                        >
                          Read
                          <HiChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ GENERATE FORM MODAL ══ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                  <HiSparkles className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800">Generate Awareness Report</h2>
                  <p className="text-xs text-gray-400 capitalize">{fPeriod} · AI-Powered Behavioral Analysis</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">
                <HiX className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {fError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{fError}</div>}

              {/* Company search + Period label */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Search Company *</label>
                  <div className="relative">
                    <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      value={fCompanySearch}
                      onChange={e => { setFCompanySearch(e.target.value); setFCompany(e.target.value); setFShowDrop(true); }}
                      onFocus={() => setFShowDrop(true)}
                      placeholder="Search assessed companies..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
                    />
                  </div>
                  {fShowDrop && fCompanySearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-50 max-h-48 overflow-y-auto">
                      {companies.filter(c => c.name.toLowerCase().includes(fCompanySearch.toLowerCase())).map(c => (
                        <button key={c.name} onClick={() => selectCompany(c)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50 text-left transition border-b border-gray-50 last:border-0">
                          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                            <HiOfficeBuilding className="w-3.5 h-3.5 text-violet-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                            <p className="text-xs text-gray-400">{c.category} · {new Date(c.date).toLocaleDateString()}</p>
                          </div>
                        </button>
                      ))}
                      {companies.filter(c => c.name.toLowerCase().includes(fCompanySearch.toLowerCase())).length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-400 text-center">No companies found</div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Period Label *</label>
                  <input value={fPeriodLabel} onChange={e => setFPeriodLabel(e.target.value)}
                    placeholder={fPeriod === "monthly" ? "e.g. January 2026" : fPeriod === "6-month" ? "e.g. H1 2026" : "e.g. 2025 Annual"}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
              </div>

              {/* Period + Report Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Period</label>
                  <div className="flex gap-2">
                    {(["monthly","6-month","yearly"] as Period[]).map(p => (
                      <button key={p} onClick={() => setFPeriod(p)}
                        className={`flex-1 py-2 rounded-xl border text-xs font-bold transition
                          ${fPeriod === p ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-gray-200 text-gray-500 hover:border-violet-300"}`}>
                        {p === "monthly" ? "Monthly" : p === "6-month" ? "6-Month" : "Annual"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Report Type</label>
                  <div className="flex gap-2">
                    {(["specific","general"] as ReportType[]).map(t => (
                      <button key={t} onClick={() => setFReportType(t)}
                        className={`flex-1 py-2 rounded-xl border text-xs font-bold transition capitalize
                          ${fReportType === t ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-gray-200 text-gray-500 hover:border-violet-300"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Behavioral Metrics</p>
                {[
                  { label: "Staff Participation Rate", value: fParticipation, set: setFParticipation },
                  { label: "Phishing Report Rate ★",   value: fReportRate,    set: setFReportRate },
                  { label: "Training Completion Rate",  value: fTraining,      set: setFTraining },
                  { label: "Phishing Click Rate",       value: fClickRate,     set: setFClickRate },
                ].map(m => (
                  <div key={m.label}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs text-gray-600 font-medium">{m.label}</span>
                      <span className="text-xs font-bold text-gray-700">{m.value}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={m.value}
                      onChange={e => m.set(Number(e.target.value))}
                      className="w-full h-2 rounded-full accent-violet-600" />
                  </div>
                ))}
              </div>

              {/* Departments */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">High-Risk Departments</label>
                <div className="flex flex-wrap gap-2">
                  {DEPARTMENTS.map(d => (
                    <button key={d} onClick={() => toggleDept(d)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition
                        ${fDepts.includes(d) ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-gray-200 text-gray-500 hover:border-orange-300"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Context */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Additional Context</label>
                <textarea value={fContext} onChange={e => setFContext(e.target.value)} rows={3}
                  placeholder="e.g. Recent phishing campaign used 'Urgent Payroll' subject line..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none" />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleGenerate} disabled={generating}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition shadow-lg shadow-violet-200 flex items-center justify-center gap-2 disabled:opacity-60">
                {generating
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Generating...</>
                  : <><HiSparkles className="w-4 h-4" /> Generate & Notify All</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ READ REPORT MODAL ══ */}
      {viewReport && (() => {
        const gm = gradeOf(viewReport);
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50 shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center ${gm.bg} ${gm.border}`}>
                      <span className={`text-2xl font-extrabold ${gm.color}`}>{viewReport.cultureScore}</span>
                    </div>
                    <div>
                      <h2 className="font-extrabold text-gray-800 text-lg">{viewReport.company}</h2>
                      <p className="text-sm text-gray-500">{viewReport.periodLabel} · <span className="capitalize">{viewReport.period}</span> · <span className={`font-semibold ${gm.color}`}>{gm.label}</span></p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${viewReport.reportType === "specific" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
                          {viewReport.reportType === "specific" ? "Specific" : "General"}
                        </span>
                        {viewReport.notificationSent && (
                          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <HiCheckCircle className="w-3 h-3" /> All members notified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setViewReport(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">
                    <HiX className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-4">
                  {[
                    { label: "Participation",  value: `${viewReport.participationRate}%`,  color: "text-blue-600" },
                    { label: "Report Rate ★",  value: `${viewReport.phishingReportRate}%`, color: "text-emerald-600" },
                    { label: "Training Done",  value: `${viewReport.trainingCompletion}%`, color: "text-violet-600" },
                    { label: "Click Rate",     value: `${viewReport.phishingClickRate}%`,  color: "text-red-500" },
                  ].map(m => (
                    <div key={m.label} className="bg-white rounded-xl px-3 py-2 text-center border border-gray-100">
                      <p className={`text-lg font-extrabold ${m.color}`}>{m.value}</p>
                      <p className="text-xs text-gray-400">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5 bg-gray-50/40">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-7">{viewReport.content}</pre>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
                <button onClick={() => setViewReport(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">
                  Close
                </button>
                <button onClick={() => downloadTxt(viewReport)}
                  className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition shadow-lg shadow-violet-200">
                  <HiDownload className="w-4 h-4" /> Download Report
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </Layout>
  );
}
