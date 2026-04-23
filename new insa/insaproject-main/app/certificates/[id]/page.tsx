'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Certificate {
    certificateNumber: string;
    company: string;
    overallRiskLevel: string;
    registeredAt: string;
    status: string;
}

const riskColors: Record<string, string> = {
    CRITICAL: '#dc2626',
    HIGH: '#ea580c',
    MEDIUM: '#f97316',
    LOW: '#16a34a',
    VERY_LOW: '#15803d',
    UNKNOWN: '#6b7280',
};

export default function CertificatePage() {
    const { id } = useParams();
    const [cert, setCert] = useState<Certificate | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/certificates/${id}`)
            .then(r => r.json())
            .then(data => {
                if (data.success) setCert(data.certificate);
                else setError('Certificate not found');
            })
            .catch(() => setError('Failed to load certificate'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <p className="text-white">Loading...</p>
        </div>
    );

    if (error || !cert) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <p className="text-red-400">{error || 'Certificate not found'}</p>
        </div>
    );

    const riskColor = riskColors[cert.overallRiskLevel] || riskColors.UNKNOWN;
    const date = new Date(cert.registeredAt).toLocaleDateString('en-GB');

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8 print:bg-white">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-10 print:shadow-none" id="certificate">

                {/* Header */}
                <div className="text-center border-b-4 border-blue-900 pb-6 mb-6">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Federal Republic of Ethiopia</p>
                    <h1 className="text-2xl font-black text-blue-900 uppercase tracking-tight">
                        Information Network Security Administration
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Cyber Security Governance & Compliance Department</p>
                </div>

                {/* Title */}
                <div className="text-center mb-8">
                    <h2 className="text-xl font-bold text-slate-700 uppercase tracking-widest">
                        Certificate of Risk Assessment
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">This certifies that the following organization has completed a cybersecurity risk assessment</p>
                </div>

                {/* Organization */}
                <div className="text-center mb-8">
                    <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">Organization</p>
                    <h3 className="text-3xl font-black text-blue-900">{cert.company}</h3>
                </div>

                {/* Details */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="text-center bg-slate-50 rounded-xl p-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Certificate No</p>
                        <p className="text-sm font-bold text-slate-700">{cert.certificateNumber}</p>
                    </div>
                    <div className="text-center bg-slate-50 rounded-xl p-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Overall Risk</p>
                        <p className="text-sm font-bold" style={{ color: riskColor }}>{cert.overallRiskLevel}</p>
                    </div>
                    <div className="text-center bg-slate-50 rounded-xl p-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Date Issued</p>
                        <p className="text-sm font-bold text-slate-700">{date}</p>
                    </div>
                </div>

                {/* Status Badge */}
                <div className="text-center mb-8">
                    <span className="inline-block bg-green-100 text-green-700 font-bold px-6 py-2 rounded-full text-sm uppercase tracking-wider border border-green-300">
                        ✓ Officially Registered
                    </span>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 pt-6 text-center">
                    <p className="text-xs text-slate-400">
                        This certificate is issued by INSA and is valid as of the date shown above.
                    </p>
                    <p className="text-xs text-slate-300 mt-1">Verify at: /certificates/{cert.certificateNumber}</p>
                </div>
            </div>

            {/* Print Button */}
            <div className="fixed bottom-6 right-6 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-full shadow-lg transition"
                >
                    Print / Save PDF
                </button>
            </div>
        </div>
    );
}
