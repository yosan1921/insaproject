"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

interface QuestionAnalysis {
  questionId: string;
  level: string;
  question: string;
  answer: string;

  // New fields
  riskName: string;
  description: string;
  status: 'Open' | 'Closed';
  riskType: 'Risk' | 'Issue';
  threatOpportunity: 'Threat' | 'Opportunity';
  assignedTo: string;

  // Pre-Mitigation
  preMitigationProbability: number;
  preMitigationImpact: number;
  preMitigationScore: number;
  preMitigationCost: number;

  // Current values
  likelihood: number;
  impact: number;
  riskScore: number;
  riskLevel: string;

  // Post-Mitigation
  postMitigationProbability: number;
  postMitigationImpact: number;
  postMitigationScore: number;
  postMitigationCost: number;

  // Mitigation details
  mitigationCost: number;
  gap: string;
  threat: string;
  mitigation: string;
  impactLabel?: string;
  impactDescription?: string;
}

interface ProcessedAssessment {
  _id: string; // RiskAnalysis _id
  riskRegisterId: string; // Risk Register ID
  company: string;
  category: string;
  date: string;
  analyses: QuestionAnalysis[];
}

type SortOrder = "newest" | "oldest";

interface EditingState {
  analysisId: string;
  questionId: string;
  level: string;

  // New fields
  riskName: string;
  description: string;
  status: 'Open' | 'Closed';
  riskType: 'Risk' | 'Issue';
  threatOpportunity: 'Threat' | 'Opportunity';
  assignedTo: string;

  // Pre-Mitigation
  preMitigationProbability: string;
  preMitigationImpact: string;
  preMitigationCost: string;

  // Current values
  likelihood: string;
  impact: string;

  // Post-Mitigation
  postMitigationProbability: string;
  postMitigationImpact: string;
  postMitigationCost: string;

  // Mitigation details
  mitigationCost: string;
  gap: string;
  threat: string;
  mitigation: string;
  impactLabel: string;
  impactDescription: string;
}

export default function RiskRegisterFromAssessmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<ProcessedAssessment[]>([]);

  const [companyFilter, setCompanyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [riskLevelFilter, setRiskLevelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchAssessments();
    }
  }, [status, router]);

  const fetchAssessments = async () => {
    try {
      const res = await fetch("/api/analysis/processed");
      const data = await res.json();

      const list: ProcessedAssessment[] = Array.isArray(data.assessments)
        ? data.assessments
        : [];

      setAssessments(list);

      const companies = Array.from(
        new Set(list.map((a) => a.company).filter((c): c is string => !!c))
      );
      setAvailableCompanies(companies);

      const categories = Array.from(
        new Set(list.map((a) => a.category).filter((c): c is string => !!c))
      );
      setAvailableCategories(categories);

      setLoading(false);
    } catch (error) {
      console.error("Error loading assessments", error);
      setAssessments([]);
      setLoading(false);
    }
  };

  // 1) sort assessments by date
  const sortedAssessments = useMemo(() => {
    const copy = [...assessments];
    copy.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });
    return copy;
  }, [assessments, sortOrder]);

  // 2) apply company/category and date range filters
  const filteredAssessments = useMemo(() => {
    return sortedAssessments.filter((a) => {
      const matchCompany =
        !companyFilter ||
        (a.company || "").toLowerCase() === companyFilter.toLowerCase();
      const matchCategory =
        !categoryFilter ||
        (a.category || "").toLowerCase() === categoryFilter.toLowerCase();

      if (!matchCompany || !matchCategory) return false;

      const d = new Date(a.date);
      if (startDate) {
        const start = new Date(startDate);
        if (d < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }

      return true;
    });
  }, [sortedAssessments, companyFilter, categoryFilter, startDate, endDate]);

  // 3) flatten to rows and filter by risk level
  const rows: Array<
    QuestionAnalysis & {
      riskRegisterId: string;
      company: string;
      category: string;
      date: string;
      analysisId: string;
    }
  > = filteredAssessments
    .flatMap((a) =>
      (a.analyses || []).map((q) => ({
        ...q,
        riskRegisterId: a.riskRegisterId,
        company: a.company,
        category: a.category,
        date: a.date,
        analysisId: a._id,
      }))
    )
    .filter((q) => {
      if (riskLevelFilter && (q.riskLevel || "").toLowerCase() !== riskLevelFilter.toLowerCase()) {
        return false;
      }
      if (statusFilter && (q.status || "").toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      return true;
    });

  const startEditing = (row: {
    analysisId: string;
    questionId: string;
    level: string;
    riskName: string;
    description: string;
    status: 'Open' | 'Closed';
    riskType: 'Risk' | 'Issue';
    threatOpportunity: 'Threat' | 'Opportunity';
    assignedTo: string;
    preMitigationProbability: number;
    preMitigationImpact: number;
    preMitigationCost: number;
    likelihood: number;
    impact: number;
    postMitigationProbability: number;
    postMitigationImpact: number;
    postMitigationCost: number;
    mitigationCost: number;
    gap: string;
    threat: string;
    mitigation: string;
    impactLabel?: string;
    impactDescription?: string;
  }) => {
    setEditing({
      analysisId: row.analysisId,
      questionId: row.questionId,
      level: row.level,
      riskName: row.riskName ?? "",
      description: row.description ?? "",
      status: row.status ?? "Open",
      riskType: row.riskType ?? "Risk",
      threatOpportunity: row.threatOpportunity ?? "Threat",
      assignedTo: row.assignedTo ?? "",
      preMitigationProbability: String(row.preMitigationProbability ?? ""),
      preMitigationImpact: String(row.preMitigationImpact ?? ""),
      preMitigationCost: String(row.preMitigationCost ?? ""),
      likelihood: String(row.likelihood ?? ""),
      impact: String(row.impact ?? ""),
      postMitigationProbability: String(row.postMitigationProbability ?? ""),
      postMitigationImpact: String(row.postMitigationImpact ?? ""),
      postMitigationCost: String(row.postMitigationCost ?? ""),
      mitigationCost: String(row.mitigationCost ?? ""),
      gap: row.gap ?? "",
      threat: row.threat ?? "",
      mitigation: row.mitigation ?? "",
      impactLabel: row.impactLabel ?? "",
      impactDescription: row.impactDescription ?? "",
    });
  };

  const cancelEditing = () => {
    setEditing(null);
  };

  const saveEdit = async () => {
    if (!editing) return;

    try {
      setSaving(true);

      const res = await fetch("/api/analysis/processed/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: editing.analysisId,
          level: editing.level,
          questionId: Number(editing.questionId),

          // New fields
          riskName: editing.riskName,
          description: editing.description,
          status: editing.status,
          riskType: editing.riskType,
          threatOpportunity: editing.threatOpportunity,
          assignedTo: editing.assignedTo,

          // Pre-Mitigation
          preMitigationProbability: editing.preMitigationProbability.trim() === "" ? undefined : Number(editing.preMitigationProbability),
          preMitigationImpact: editing.preMitigationImpact.trim() === "" ? undefined : Number(editing.preMitigationImpact),
          preMitigationCost: editing.preMitigationCost.trim() === "" ? undefined : Number(editing.preMitigationCost),

          // Current values
          likelihood: editing.likelihood.trim() === "" ? undefined : Number(editing.likelihood),
          impact: editing.impact.trim() === "" ? undefined : Number(editing.impact),

          // Post-Mitigation
          postMitigationProbability: editing.postMitigationProbability.trim() === "" ? undefined : Number(editing.postMitigationProbability),
          postMitigationImpact: editing.postMitigationImpact.trim() === "" ? undefined : Number(editing.postMitigationImpact),
          postMitigationCost: editing.postMitigationCost.trim() === "" ? undefined : Number(editing.postMitigationCost),

          // Mitigation details
          mitigationCost: editing.mitigationCost.trim() === "" ? undefined : Number(editing.mitigationCost),
          gap: editing.gap,
          threat: editing.threat,
          mitigation: editing.mitigation,
          impactLabel: editing.impactLabel,
          impactDescription: editing.impactDescription,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error("Failed to update assessment", data);
        setSaving(false);
        return;
      }

      const updatedAssessment = data.assessment as ProcessedAssessment;

      setAssessments((prev) =>
        prev.map((a) =>
          a._id === updatedAssessment._id ? updatedAssessment : a
        )
      );

      setSaving(false);
      setEditing(null);
    } catch (error) {
      console.error("Error updating assessment", error);
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Loading assessments...</div>
        </div>
      </Layout>
    );
  }

  if (!session) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">
          Risk Register (from Assessments)
        </h1>

        {/* Filters */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Company */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Company
              </label>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">All</option>
                {availableCompanies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">All</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Risk level */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Risk level
              </label>
              <select
                value={riskLevelFilter}
                onChange={(e) => setRiskLevelFilter(e.target.value)}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Sort + date range */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sort order */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Sort by date
              </label>
              <select
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(e.target.value as SortOrder)
                }
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              >
                <option value="newest">Newest to oldest</option>
                <option value="oldest">Oldest to newest</option>
              </select>
            </div>

            {/* Start date */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              />
            </div>

            {/* End date */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* Table + editing */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400">
              No records match the current filters.
            </p>
          ) : (
            <>
              {/* Desktop Table View - Hidden on mobile */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full text-xs text-left border-collapse text-slate-100">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="py-2 pr-3 sticky left-0 bg-slate-800 z-10">Actions</th>
                      <th className="py-2 pr-3">Risk ID</th>
                      <th className="py-2 pr-3">Risk Name</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Risk/Issue</th>
                      <th className="py-2 pr-3">Threat/Opp</th>
                      <th className="py-2 pr-3">Assigned To</th>
                      <th className="py-2 pr-3">Company</th>
                      <th className="py-2 pr-3">Category</th>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Level</th>
                      <th className="py-2 pr-3 bg-orange-900/20">Pre-Prob%</th>
                      <th className="py-2 pr-3 bg-orange-900/20">Pre-Impact%</th>
                      <th className="py-2 pr-3 bg-orange-900/20">Pre-Score%</th>
                      <th className="py-2 pr-3 bg-orange-900/20">Pre-Cost$</th>
                      <th className="py-2 pr-3">Likelihood</th>
                      <th className="py-2 pr-3">Impact</th>
                      <th className="py-2 pr-3">Risk Score</th>
                      <th className="py-2 pr-3">Risk Level</th>
                      <th className="py-2 pr-3 bg-green-900/20">Post-Prob%</th>
                      <th className="py-2 pr-3 bg-green-900/20">Post-Impact%</th>
                      <th className="py-2 pr-3 bg-green-900/20">Post-Score%</th>
                      <th className="py-2 pr-3 bg-green-900/20">Post-Cost$</th>
                      <th className="py-2 pr-3">Mitigation Cost$</th>
                      <th className="py-2 pr-3">Gap</th>
                      <th className="py-2 pr-3">Threat</th>
                      <th className="py-2 pr-3">Mitigation</th>
                      <th className="py-2 pr-3">Description</th>
                      <th className="py-2 pr-3">Impact Label</th>
                      <th className="py-2 pr-3">Impact Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => {
                      const isEditing =
                        editing &&
                        editing.analysisId === r.analysisId &&
                        editing.questionId === r.questionId &&
                        editing.level === r.level;

                      return (
                        <tr
                          key={`${r.analysisId}-${r.questionId}-${idx}`}
                          className="border-b border-slate-700 last:border-b-0"
                        >
                          {/* Actions */}
                          <td className="py-2 pr-3">
                            {isEditing ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={saveEdit}
                                  disabled={saving}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs"
                                >
                                  {saving ? "Saving..." : "Save"}
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  disabled={saving}
                                  className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() =>
                                  startEditing({
                                    analysisId: r.analysisId,
                                    questionId: r.questionId,
                                    level: r.level,
                                    riskName: r.riskName,
                                    description: r.description,
                                    status: r.status,
                                    riskType: r.riskType,
                                    threatOpportunity: r.threatOpportunity,
                                    assignedTo: r.assignedTo,
                                    preMitigationProbability: r.preMitigationProbability,
                                    preMitigationImpact: r.preMitigationImpact,
                                    preMitigationCost: r.preMitigationCost,
                                    likelihood: r.likelihood,
                                    impact: r.impact,
                                    postMitigationProbability: r.postMitigationProbability,
                                    postMitigationImpact: r.postMitigationImpact,
                                    postMitigationCost: r.postMitigationCost,
                                    mitigationCost: r.mitigationCost,
                                    gap: r.gap,
                                    threat: r.threat,
                                    mitigation: r.mitigation,
                                    impactLabel: r.impactLabel,
                                    impactDescription: r.impactDescription,
                                  })
                                }
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs"
                              >
                                Edit
                              </button>
                            )}
                          </td>

                          <td className="py-2 pr-3 font-mono text-emerald-400">{r.riskRegisterId}</td>

                          {/* Risk Name */}
                          <td className="py-2 pr-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editing.riskName}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev ? { ...prev, riskName: e.target.value } : prev
                                  )
                                }
                                className="w-40 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            ) : (
                              r.riskName || '-'
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-2 pr-3">
                            {isEditing ? (
                              <select
                                value={editing.status}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev ? { ...prev, status: e.target.value as 'Open' | 'Closed' } : prev
                                  )
                                }
                                className="w-24 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              >
                                <option value="Open">Open</option>
                                <option value="Closed">Closed</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-xs ${r.status === 'Open' ? 'bg-yellow-600/30 text-yellow-300' : 'bg-green-600/30 text-green-300'}`}>
                                {r.status || 'Open'}
                              </span>
                            )}
                          </td>

                          {/* Risk/Issue */}
                          <td className="py-2 pr-3">
                            {isEditing ? (
                              <select
                                value={editing.riskType}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev ? { ...prev, riskType: e.target.value as 'Risk' | 'Issue' } : prev
                                  )
                                }
                                className="w-24 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              >
                                <option value="Risk">Risk</option>
                                <option value="Issue">Issue</option>
                              </select>
                            ) : (
                              r.riskType || 'Risk'
                            )}
                          </td>

                          {/* Threat/Opportunity */}
                          <td className="py-2 pr-3">
                            {isEditing ? (
                              <select
                                value={editing.threatOpportunity}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev ? { ...prev, threatOpportunity: e.target.value as 'Threat' | 'Opportunity' } : prev
                                  )
                                }
                                className="w-28 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              >
                                <option value="Threat">Threat</option>
                                <option value="Opportunity">Opportunity</option>
                              </select>
                            ) : (
                              r.threatOpportunity || 'Threat'
                            )}
                          </td>

                          {/* Assigned To */}
                          <td className="py-2 pr-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editing.assignedTo}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev ? { ...prev, assignedTo: e.target.value } : prev
                                  )
                                }
                                className="w-32 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            ) : (
                              r.assignedTo || '-'
                            )}
                          </td>

                          <td className="py-2 pr-3">{r.company}</td>
                          <td className="py-2 pr-3">{r.category}</td>
                          <td className="py-2 pr-3">
                            {r.date
                              ? new Date(r.date).toLocaleDateString()
                              : "-"}
                          </td>
                          <td className="py-2 pr-3">{r.level}</td>

                          {/* Pre-Mitigation Probability */}
                          <td className="py-2 pr-3 bg-orange-900/10">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={editing.preMitigationProbability}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev ? { ...prev, preMitigationProbability: e.target.value } : prev
                                  )
                                }
                                className="w-16 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            ) : (
                              `${r.preMitigationProbability || 0}%`
                            )}
                          </td>

                          {/* Pre-Mitigation Impact */}
                          <td className="py-2 pr-3 bg-orange-900/10">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={editing.preMitigationImpact}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev ? { ...prev, preMitigationImpact: e.target.value } : prev
                                  )
                                }
                                className="w-16 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            ) : (
                              `${r.preMitigationImpact || 0}%`
                            )}
                          </td>

                          {/* Pre-Mitigation Score (calculated) */}
                          <td className="py-2 pr-3 bg-orange-900/10">
                            {r.preMitigationScore?.toFixed(2) || 0}%
                          </td>

                          {/* Pre-Mitigation Cost */}
                          <td className="py-2 pr-3 bg-orange-900/10">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={editing.preMitigationCost}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev ? { ...prev, preMitigationCost: e.target.value } : prev
                                  )
                                }
                                className="w-20 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            ) : (
                              `$${r.preMitigationCost?.toFixed(2) || 0}`
                            )}
                          </td>

                          {/* Likelihood */}
                          <td className="py-2 pr-3">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                max={5}
                                value={editing.likelihood}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev
                                      ? {
                                        ...prev,
                                        likelihood: e.target.value,
                                      }
                                      : prev
                                  )
                                }
                                className="w-16 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            ) : (
                              r.likelihood
                            )}
                          </td>

                          {/* Impact */}
                          <td className="py-2 pr-3">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                max={5}
                                value={editing.impact}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev
                                      ? {
                                        ...prev,
                                        impact: e.target.value,
                                      }
                                      : prev
                                  )
                                }
                                className="w-16 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            ) : (
                              r.impact
                            )}
                          </td>

                          {/* Risk score / level (readonly, recalculated backend) */}
                          <td className="py-2 pr-3">{r.riskScore}</td>
                          <td className="py-2 pr-3">
                            <span className={`px-2 py-0.5 rounded text-xs ${r.riskLevel === 'CRITICAL' ? 'bg-red-600/30 text-red-300' :
                              r.riskLevel === 'HIGH' ? 'bg-orange-600/30 text-orange-300' :
                                r.riskLevel === 'MEDIUM' ? 'bg-yellow-600/30 text-yellow-300' :
                                  'bg-green-600/30 text-green-300'
                              }`}>
                              {r.riskLevel}
                            </span>
                          </td>

                          {/* Post-Mitigation Probability */}
                          <td className="py-2 pr-3 bg-green-900/10">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={editing.postMitigationProbability}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev ? { ...prev, postMitigationProbability: e.target.value } : prev
                                  )
                                }
                                className="w-16 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            ) : (
                              `${r.postMitigationProbability || 0}%`
                            )}
                          </td>

                          {/* Post-Mitigation Impact */}
                          <td className="py-2 pr-3 bg-green-900/10">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={editing.postMitigationImpact}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev ? { ...prev, postMitigationImpact: e.target.value } : prev
                                  )
                                }
                                className="w-16 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            ) : (
                              `${r.postMitigationImpact || 0}%`
                            )}
                          </td>

                          {/* Post-Mitigation Score (calculated) */}
                          <td className="py-2 pr-3 bg-green-900/10">
                            {r.postMitigationScore?.toFixed(2) || 0}%
                          </td>

                          {/* Post-Mitigation Cost */}
                          <td className="py-2 pr-3 bg-green-900/10">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={editing.postMitigationCost}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev ? { ...prev, postMitigationCost: e.target.value } : prev
                                  )
                                }
                                className="w-20 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            ) : (
                              `$${r.postMitigationCost?.toFixed(2) || 0}`
                            )}
                          </td>

                          {/* Mitigation Cost */}
                          <td className="py-2 pr-3">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={editing.mitigationCost}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev ? { ...prev, mitigationCost: e.target.value } : prev
                                  )
                                }
                                className="w-20 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            ) : (
                              `$${r.mitigationCost?.toFixed(2) || 0}`
                            )}
                          </td>

                          {/* Gap */}
                          <td className="py-2 pr-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editing.gap}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev
                                      ? { ...prev, gap: e.target.value }
                                      : prev
                                  )
                                }
                                className="w-40 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            ) : (
                              r.gap || '-'
                            )}
                          </td>

                          {/* Threat */}
                          <td className="py-2 pr-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editing.threat}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev
                                      ? { ...prev, threat: e.target.value }
                                      : prev
                                  )
                                }
                                className="w-40 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            ) : (
                              r.threat || '-'
                            )}
                          </td>

                          {/* Mitigation */}
                          <td className="py-2 pr-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editing.mitigation}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev ? { ...prev, mitigation: e.target.value } : prev
                                  )
                                }
                                className="w-40 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            ) : (
                              r.mitigation || '-'
                            )}
                          </td>

                          {/* Description */}
                          <td className="py-2 pr-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editing.description}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev ? { ...prev, description: e.target.value } : prev
                                  )
                                }
                                className="w-64 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            ) : (
                              r.description || '-'
                            )}
                          </td>

                          {/* Impact label */}
                          <td className="py-2 pr-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editing.impactLabel}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev
                                      ? {
                                        ...prev,
                                        impactLabel: e.target.value,
                                      }
                                      : prev
                                  )
                                }
                                className="w-32 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            ) : (
                              r.impactLabel || '-'
                            )}
                          </td>

                          {/* Impact description */}
                          <td className="py-2 pr-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editing.impactDescription}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev
                                      ? {
                                        ...prev,
                                        impactDescription: e.target.value,
                                      }
                                      : prev
                                  )
                                }
                                className="w-64 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            ) : (
                              r.impactDescription || '-'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View - Visible on mobile/tablet */}
              <div className="lg:hidden space-y-4">
                {rows.map((r, idx) => {
                  const isEditing =
                    editing &&
                    editing.analysisId === r.analysisId &&
                    editing.questionId === r.questionId &&
                    editing.level === r.level;

                  return (
                    <div
                      key={`mobile-${r.analysisId}-${r.questionId}-${idx}`}
                      className="bg-slate-900 rounded-lg border border-slate-700 p-4 space-y-3"
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start border-b border-slate-700 pb-3">
                        <div className="flex-1">
                          <div className="font-mono text-emerald-400 text-sm font-semibold">{r.riskRegisterId}</div>
                          <div className="text-white font-medium mt-1">{r.riskName || 'Unnamed Risk'}</div>
                        </div>
                        <button
                          onClick={() => startEditing({
                            analysisId: r.analysisId,
                            questionId: r.questionId,
                            level: r.level,
                            riskName: r.riskName,
                            description: r.description,
                            status: r.status,
                            riskType: r.riskType,
                            threatOpportunity: r.threatOpportunity,
                            assignedTo: r.assignedTo,
                            preMitigationProbability: r.preMitigationProbability,
                            preMitigationImpact: r.preMitigationImpact,
                            preMitigationCost: r.preMitigationCost,
                            likelihood: r.likelihood,
                            impact: r.impact,
                            postMitigationProbability: r.postMitigationProbability,
                            postMitigationImpact: r.postMitigationImpact,
                            postMitigationCost: r.postMitigationCost,
                            mitigationCost: r.mitigationCost,
                            gap: r.gap,
                            threat: r.threat,
                            mitigation: r.mitigation,
                            impactLabel: r.impactLabel,
                            impactDescription: r.impactDescription,
                          })}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs"
                        >
                          Edit
                        </button>
                      </div>

                      {/* Basic Info */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400">Status:</span>
                          <div className="mt-1">
                            <span className={`px-2 py-0.5 rounded ${r.status === 'Open' ? 'bg-yellow-600/30 text-yellow-300' : 'bg-green-600/30 text-green-300'}`}>
                              {r.status || 'Open'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400">Risk Level:</span>
                          <div className="mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs ${r.riskLevel === 'CRITICAL' ? 'bg-red-600/30 text-red-300' :
                              r.riskLevel === 'HIGH' ? 'bg-orange-600/30 text-orange-300' :
                                r.riskLevel === 'MEDIUM' ? 'bg-yellow-600/30 text-yellow-300' :
                                  'bg-green-600/30 text-green-300'
                              }`}>
                              {r.riskLevel}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400">Company:</span>
                          <div className="mt-1 text-white">{r.company}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Category:</span>
                          <div className="mt-1 text-white">{r.category}</div>
                        </div>
                      </div>

                      {/* Pre-Mitigation */}
                      <div className="bg-orange-900/10 rounded p-3 space-y-2">
                        <div className="text-orange-400 font-semibold text-xs">Pre-Mitigation</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400">Probability:</span>
                            <div className="mt-1 text-white">{r.preMitigationProbability || 0}%</div>
                          </div>
                          <div>
                            <span className="text-slate-400">Impact:</span>
                            <div className="mt-1 text-white">{r.preMitigationImpact || 0}%</div>
                          </div>
                        </div>
                      </div>

                      {/* Current */}
                      <div className="bg-blue-900/10 rounded p-3 space-y-2">
                        <div className="text-blue-400 font-semibold text-xs">Current Assessment</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400">Likelihood:</span>
                            <div className="mt-1 text-white">{r.likelihood}/5</div>
                          </div>
                          <div>
                            <span className="text-slate-400">Impact:</span>
                            <div className="mt-1 text-white">{r.impact}/5</div>
                          </div>
                        </div>
                      </div>

                      {/* Post-Mitigation */}
                      <div className="bg-green-900/10 rounded p-3 space-y-2">
                        <div className="text-green-400 font-semibold text-xs">Post-Mitigation</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400">Probability:</span>
                            <div className="mt-1 text-white">{r.postMitigationProbability || 0}%</div>
                          </div>
                          <div>
                            <span className="text-slate-400">Impact:</span>
                            <div className="mt-1 text-white">{r.postMitigationImpact || 0}%</div>
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-slate-400">Threat:</span>
                          <div className="mt-1 text-white">{r.threat || '-'}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Gap:</span>
                          <div className="mt-1 text-white">{r.gap || '-'}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Mitigation:</span>
                          <div className="mt-1 text-white">{r.mitigation || '-'}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
