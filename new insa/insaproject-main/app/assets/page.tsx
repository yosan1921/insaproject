"use client";

import { useEffect, useState } from "react";
import Layout from "@/app/components/Layout";

interface Asset {
    _id: string;
    questionnaireId: string;
    company: string;
    ip: string;
    hostname: string;
    openPorts: number[];
    os: string;
    deviceType: string;
    status: string;
    scannedAt: string;
}

interface Questionnaire {
    _id: string;
    company: string;
    companyDomain: string;
    companyIp: string;
    status: string;
}

const DEVICE_COLORS: Record<string, string> = {
    server: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    device: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    software: "bg-green-500/20 text-green-300 border-green-500/30",
    unknown: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

export default function AssetsPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQ, setSelectedQ] = useState<Questionnaire | null>(null);
    const [domain, setDomain] = useState("");
    const [ip, setIp] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState("");
    const [scanning, setScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);

    useEffect(() => {
        fetchAll();
    }, []);

    async function fetchAll() {
        setLoading(true);
        try {
            const [assetsRes, qRes] = await Promise.all([
                fetch("/api/assets"),
                fetch("/api/questionnaires/list"),
            ]);
            const assetsData = await assetsRes.json();
            const qData = await qRes.json();
            setAssets(assetsData.assets || []);
            setQuestionnaires(qData.questionnaires || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveDomainIp() {
        if (!selectedQ) return;
        setSaving(true);
        setSaveMsg("");
        try {
            const res = await fetch(`/api/assets/${selectedQ._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companyDomain: domain, companyIp: ip }),
            });
            const data = await res.json();
            if (data.success) {
                setSaveMsg("Saved! Asset scan started in background.");
                setScanning(true);
                setScanProgress(0);

                // Progress simulation: 0→90% over 50s, then fetch real results
                let progress = 0;
                const interval = setInterval(() => {
                    progress += 2;
                    setScanProgress(Math.min(progress, 90));
                    if (progress >= 90) clearInterval(interval);
                }, 1000);

                // After 55s fetch results and complete
                setTimeout(async () => {
                    clearInterval(interval);
                    setScanProgress(100);
                    await fetchAll();
                    setScanning(false);
                    setScanProgress(0);
                    setSaveMsg("Scan complete. Results updated.");
                }, 55000);
            } else {
                setSaveMsg(`Error: ${data.error}`);
            }
        } catch (e: any) {
            setSaveMsg(`Error: ${e.message}`);
        } finally {
            setSaving(false);
        }
    }

    function handleSelectQ(q: Questionnaire) {
        setSelectedQ(q);
        setDomain(q.companyDomain || "");
        setIp(q.companyIp || "");
        setSaveMsg("");
    }

    const groupedAssets = assets.reduce((acc, a) => {
        if (!acc[a.company]) acc[a.company] = [];
        acc[a.company].push(a);
        return acc;
    }, {} as Record<string, Asset[]>);

    return (
        <Layout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Asset Inventory</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Network assets discovered via automated scanning. Add domain/IP to trigger a scan.
                    </p>
                </div>

                {/* Manual Domain/IP Entry */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-white font-semibold mb-4">Add / Update Company Domain or IP</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <select
                            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                            onChange={(e) => {
                                const q = questionnaires.find((q) => q._id === e.target.value);
                                if (q) handleSelectQ(q);
                            }}
                            defaultValue=""
                        >
                            <option value="" disabled>Select Questionnaire / Company</option>
                            {questionnaires.map((q) => (
                                <option key={q._id} value={q._id}>
                                    {q.company}
                                </option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder="Company Domain (e.g. example.com)"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-400"
                        />
                        <input
                            type="text"
                            placeholder="Company IP (e.g. 192.168.1.1)"
                            value={ip}
                            onChange={(e) => setIp(e.target.value)}
                            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-400"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSaveDomainIp}
                            disabled={saving || !selectedQ || scanning}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
                        >
                            {saving ? "Saving & Scanning..." : scanning ? "Scanning..." : "Save & Start Scan"}
                        </button>
                        {saveMsg && (
                            <span className={`text-sm ${saveMsg.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
                                {saveMsg}
                            </span>
                        )}
                    </div>

                    {/* Scan Progress Bar */}
                    {scanning && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-slate-400 flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                    nmap scanning in progress... please wait
                                </span>
                                <span className="text-xs text-blue-400 font-mono">{scanProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                                    style={{ width: `${scanProgress}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                This may take up to 60 seconds. Results will appear automatically.
                            </p>
                        </div>
                    )}
                </div>

                {/* Assets Table */}
                {loading ? (
                    <div className="text-slate-400 text-sm">Loading assets...</div>
                ) : assets.length === 0 ? (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                        <p className="text-slate-400">No assets discovered yet.</p>
                        <p className="text-slate-500 text-sm mt-1">
                            Add a company domain or IP above to start scanning.
                        </p>
                    </div>
                ) : (
                    Object.entries(groupedAssets).map(([company, companyAssets]) => (
                        <div key={company} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                                <h3 className="text-white font-semibold">{company}</h3>
                                <span className="text-slate-400 text-sm">{companyAssets.length} asset(s)</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-slate-400 text-xs uppercase border-b border-slate-700">
                                            <th className="px-6 py-3 text-left">IP Address</th>
                                            <th className="px-6 py-3 text-left">Hostname</th>
                                            <th className="px-6 py-3 text-left">OS</th>
                                            <th className="px-6 py-3 text-left">Type</th>
                                            <th className="px-6 py-3 text-left">Open Ports</th>
                                            <th className="px-6 py-3 text-left">Status</th>
                                            <th className="px-6 py-3 text-left">Scanned At</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {companyAssets.map((asset) => (
                                            <tr key={asset._id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                                                <td className="px-6 py-3 text-white font-mono">{asset.ip}</td>
                                                <td className="px-6 py-3 text-slate-300">{asset.hostname || "-"}</td>
                                                <td className="px-6 py-3 text-slate-300">{asset.os}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${DEVICE_COLORS[asset.deviceType] || DEVICE_COLORS.unknown}`}>
                                                        {asset.deviceType}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-slate-300 font-mono text-xs">
                                                    {asset.openPorts?.length > 0 ? asset.openPorts.join(", ") : "None"}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${asset.status === "active" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                                                        {asset.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-slate-400 text-xs">
                                                    {new Date(asset.scannedAt).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Layout>
    );
}
