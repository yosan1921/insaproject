"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Layout from "@/app/components/Layout";

interface Registration {
    _id: string;
    company: string;
    certificateNumber: string;
    overallRiskLevel: string;
    registeredAt: string;
    status: string;
}

const RISK_COLORS: Record<string, string> = {
    CRITICAL: "text-red-400 border-red-500/30 bg-red-500/10",
    HIGH: "text-orange-400 border-orange-500/30 bg-orange-500/10",
    MEDIUM: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    LOW: "text-green-400 border-green-500/30 bg-green-500/10",
    VERY_LOW: "text-green-300 border-green-400/30 bg-green-400/10",
    UNKNOWN: "text-slate-400 border-slate-500/30 bg-slate-500/10",
};

export default function CertificatesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        else if (status === "authenticated") fetchRegistrations();
    }, [status, router]);

    async function fetchRegistrations() {
        try {
            const res = await fetch("/api/registrations");
            const data = await res.json();
            setRegistrations(data.success ? data.registrations || [] : []);
        } catch (e) {
            console.error(e);
            setRegistrations([]);
        } finally {
            setLoading(false);
        }
    }

    const filtered = registrations.filter(
        (r) =>
            r.company.toLowerCase().includes(search.toLowerCase()) ||
            r.certificateNumber.toLowerCase().includes(search.toLowerCase())
    );

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

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Certificates</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            All registered assessment certificates
                        </p>
                    </div>
                    <span className="text-slate-400 text-sm">
                        {filtered.length} certificate(s)
                    </span>
                </div>

                {/* Search */}
                <input
                    type="text"
                    placeholder="Search by company or certificate number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />

                {/* List */}
                {filtered.length === 0 ? (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-10 text-center">
                        <p className="text-slate-400">No certificates found.</p>
                        <p className="text-slate-500 text-sm mt-1">
                            Certificates are generated automatically after risk analysis completes.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filtered.map((reg) => {
                            const colorClass = RISK_COLORS[reg.overallRiskLevel] || RISK_COLORS.UNKNOWN;
                            return (
                                <div
                                    key={reg._id}
                                    className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-blue-500 transition"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="text-white font-bold text-base">
                                                {reg.company}
                                            </h3>
                                            <p className="text-slate-400 text-xs mt-0.5 font-mono">
                                                {reg.certificateNumber}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${colorClass}`}>
                                            {reg.overallRiskLevel}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between mt-4">
                                        <p className="text-slate-500 text-xs">
                                            Issued: {new Date(reg.registeredAt).toLocaleDateString()}
                                        </p>
                                        <Link
                                            href={`/certificates/${reg.certificateNumber}`}
                                            target="_blank"
                                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
                                        >
                                            View Certificate
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Layout>
    );
}
