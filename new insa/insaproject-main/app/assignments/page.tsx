"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "@/app/components/Layout";

interface Analysis {
    _id: string;
    company: string;
    date: string;
    category: string;
}

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
}

interface Assignment {
    _id: string;
    analysisId: string;
    company: string;
    assignedTo: { name: string; email: string; role: string };
    assignedBy: { name: string; email: string };
    note: string;
    createdAt: string;
}

export default function AssignmentsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [analyses, setAnalyses] = useState<Analysis[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [selectedAnalysis, setSelectedAnalysis] = useState("");
    const [selectedUser, setSelectedUser] = useState("");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const role = (session?.user as any)?.role;
    const canAssign = role === 'Director' || role === 'Division Head';

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        else if (status === "authenticated") {
            fetchData();
        }
    }, [status, router]);

    async function fetchData() {
        try {
            const [analysesRes, usersRes, assignmentsRes] = await Promise.all([
                fetch("/api/analysis/processed"),
                fetch("/api/users/list"),
                fetch("/api/assignments"),
            ]);
            const analysesData = await analysesRes.json();
            const usersData = await usersRes.json();
            const assignmentsData = await assignmentsRes.json();

            setAnalyses(analysesData.assessments || []);
            // Handle both array and object response formats
            const usersList = Array.isArray(usersData) ? usersData : (usersData.users || []);
            setUsers(usersList.filter((u: User) => u.role === 'Staff' || u.role === 'Risk Analyst'));
            setAssignments(assignmentsData.assignments || []);
        } catch (e) { console.error('fetchData error:', e); }
    }

    async function handleAssign() {
        if (!selectedAnalysis || !selectedUser) return;
        setSaving(true);
        setMessage("");
        try {
            const res = await fetch("/api/assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ analysisId: selectedAnalysis, assignedTo: selectedUser, note }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage("Assigned successfully!");
                setSelectedAnalysis(""); setSelectedUser(""); setNote("");
                fetchData();
            } else {
                setMessage(`Error: ${data.error}`);
            }
        } catch (e: any) {
            setMessage(`Error: ${e.message}`);
        } finally {
            setSaving(false);
        }
    }

    async function handleRemove(assignmentId: string) {
        if (!confirm("Remove this assignment?")) return;
        await fetch(`/api/assignments?id=${assignmentId}`, { method: "DELETE" });
        fetchData();
    }

    if (status === "loading") return null;

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Assessment Assignments</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Assign assessments to staff members for review
                    </p>
                </div>

                {/* Assign Form - only for Director/Division Head */}
                {canAssign && (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
                        <h2 className="text-white font-semibold">Assign Assessment</h2>

                        {message && (
                            <div className={`p-3 rounded text-sm ${message.startsWith('Error') ? 'bg-red-900/30 text-red-300' : 'bg-green-900/30 text-green-300'}`}>
                                {message}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Assessment</label>
                                <select value={selectedAnalysis} onChange={e => setSelectedAnalysis(e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
                                    <option value="">Select assessment...</option>
                                    {analyses.map(a => (
                                        <option key={a._id} value={a._id}>
                                            {a.company} - {new Date(a.date).toLocaleDateString()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Assign To</label>
                                <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
                                    <option value="">Select staff member...</option>
                                    {users.map(u => (
                                        <option key={u._id} value={u._id}>
                                            {u.name || u.email} ({u.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Note (optional)</label>
                                <input type="text" value={note} onChange={e => setNote(e.target.value)}
                                    placeholder="Assignment note..."
                                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
                            </div>
                        </div>

                        <button onClick={handleAssign} disabled={!selectedAnalysis || !selectedUser || saving}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition">
                            {saving ? "Assigning..." : "Assign"}
                        </button>
                    </div>
                )}

                {/* Assignments List */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-700">
                        <h2 className="text-white font-semibold">Current Assignments ({assignments.length})</h2>
                    </div>
                    {assignments.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">No assignments yet.</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-400 text-xs uppercase border-b border-slate-700">
                                    <th className="px-4 py-3 text-left">Company</th>
                                    <th className="px-4 py-3 text-left">Assigned To</th>
                                    <th className="px-4 py-3 text-left">Assigned By</th>
                                    <th className="px-4 py-3 text-left">Note</th>
                                    <th className="px-4 py-3 text-left">Date</th>
                                    {canAssign && <th className="px-4 py-3 text-left">Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {assignments.map(a => (
                                    <tr key={a._id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                        <td className="px-4 py-3 text-white font-medium">{a.company}</td>
                                        <td className="px-4 py-3 text-slate-300">
                                            {a.assignedTo?.name || a.assignedTo?.email}
                                            <span className="text-xs text-slate-500 ml-1">({a.assignedTo?.role})</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">{a.assignedBy?.name || a.assignedBy?.email}</td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">{a.note || '-'}</td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">{new Date(a.createdAt).toLocaleDateString()}</td>
                                        {canAssign && (
                                            <td className="px-4 py-3">
                                                <button onClick={() => handleRemove(a._id)}
                                                    className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded text-xs transition">
                                                    Remove
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </Layout>
    );
}
