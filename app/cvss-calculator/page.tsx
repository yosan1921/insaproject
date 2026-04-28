'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface CVSSMetrics {
    attackVector: 'N' | 'A' | 'L' | 'P';
    attackComplexity: 'L' | 'H';
    privilegesRequired: 'N' | 'L' | 'H';
    userInteraction: 'N' | 'R';
    scope: 'U' | 'C';
    confidentiality: 'N' | 'L' | 'H';
    integrity: 'N' | 'L' | 'H';
    availability: 'N' | 'L' | 'H';
}

export default function CVSSCalculatorPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [metrics, setMetrics] = useState<CVSSMetrics>({
        attackVector: 'N',
        attackComplexity: 'L',
        privilegesRequired: 'N',
        userInteraction: 'N',
        scope: 'U',
        confidentiality: 'N',
        integrity: 'N',
        availability: 'N'
    });

    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (status === 'loading') {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    if (!session) {
        router.push('/login');
        return null;
    }

    const handleCalculate = async () => {
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch('/api/analysis/cvss-calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ metrics })
            });

            const data = await response.json();

            if (data.success) {
                setResult(data);
            } else {
                setError(data.error || 'Calculation failed');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return 'bg-red-600';
            case 'HIGH': return 'bg-orange-600';
            case 'MEDIUM': return 'bg-yellow-600';
            case 'LOW': return 'bg-green-600';
            default: return 'bg-gray-600';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">CVSS v3.1 Calculator</h1>
                    <p className="text-gray-600 mb-6">Calculate Common Vulnerability Scoring System scores</p>

                    {/* Attack Vector */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Attack Vector (AV)
                        </label>
                        <select
                            value={metrics.attackVector}
                            onChange={(e) => setMetrics({ ...metrics, attackVector: e.target.value as any })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="N">Network (N)</option>
                            <option value="A">Adjacent (A)</option>
                            <option value="L">Local (L)</option>
                            <option value="P">Physical (P)</option>
                        </select>
                    </div>

                    {/* Attack Complexity */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Attack Complexity (AC)
                        </label>
                        <select
                            value={metrics.attackComplexity}
                            onChange={(e) => setMetrics({ ...metrics, attackComplexity: e.target.value as any })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="L">Low (L)</option>
                            <option value="H">High (H)</option>
                        </select>
                    </div>

                    {/* Privileges Required */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Privileges Required (PR)
                        </label>
                        <select
                            value={metrics.privilegesRequired}
                            onChange={(e) => setMetrics({ ...metrics, privilegesRequired: e.target.value as any })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="N">None (N)</option>
                            <option value="L">Low (L)</option>
                            <option value="H">High (H)</option>
                        </select>
                    </div>

                    {/* User Interaction */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            User Interaction (UI)
                        </label>
                        <select
                            value={metrics.userInteraction}
                            onChange={(e) => setMetrics({ ...metrics, userInteraction: e.target.value as any })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="N">None (N)</option>
                            <option value="R">Required (R)</option>
                        </select>
                    </div>

                    {/* Scope */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Scope (S)
                        </label>
                        <select
                            value={metrics.scope}
                            onChange={(e) => setMetrics({ ...metrics, scope: e.target.value as any })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="U">Unchanged (U)</option>
                            <option value="C">Changed (C)</option>
                        </select>
                    </div>

                    {/* Confidentiality */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confidentiality (C)
                        </label>
                        <select
                            value={metrics.confidentiality}
                            onChange={(e) => setMetrics({ ...metrics, confidentiality: e.target.value as any })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="N">None (N)</option>
                            <option value="L">Low (L)</option>
                            <option value="H">High (H)</option>
                        </select>
                    </div>

                    {/* Integrity */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Integrity (I)
                        </label>
                        <select
                            value={metrics.integrity}
                            onChange={(e) => setMetrics({ ...metrics, integrity: e.target.value as any })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="N">None (N)</option>
                            <option value="L">Low (L)</option>
                            <option value="H">High (H)</option>
                        </select>
                    </div>

                    {/* Availability */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Availability (A)
                        </label>
                        <select
                            value={metrics.availability}
                            onChange={(e) => setMetrics({ ...metrics, availability: e.target.value as any })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="N">None (N)</option>
                            <option value="L">Low (L)</option>
                            <option value="H">High (H)</option>
                        </select>
                    </div>

                    {/* Calculate Button */}
                    <button
                        onClick={handleCalculate}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                    >
                        {loading ? 'Calculating...' : 'Calculate CVSS Score'}
                    </button>

                    {/* Error Message */}
                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">CVSS Score Result</h2>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-sm text-gray-600">Base Score</p>
                                    <p className="text-3xl font-bold text-gray-900">{result.baseScore}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Severity</p>
                                    <span className={`inline-block px-4 py-2 rounded-lg text-white font-semibold ${getSeverityColor(result.baseSeverity)}`}>
                                        {result.baseSeverity}
                                    </span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-1">Vector String</p>
                                <code className="block p-3 bg-white border border-gray-300 rounded text-sm font-mono">
                                    {result.vectorString}
                                </code>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Exploitability Score</p>
                                    <p className="text-lg font-semibold text-gray-900">{result.exploitabilityScore}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Impact Score</p>
                                    <p className="text-lg font-semibold text-gray-900">{result.impactScore}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
