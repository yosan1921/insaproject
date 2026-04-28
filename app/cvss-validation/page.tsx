'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function CVSSValidationPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [analyses, setAnalyses] = useState<any[]>([]);
    const [selectedAnalysis, setSelectedAnalysis] = useState('');
    const [validationResult, setValidationResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (status === 'authenticated') {
            fetchAnalyses();
        }
    }, [status]);

    if (status === 'loading') {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    if (!session) {
        router.push('/login');
        return null;
    }

    const fetchAnalyses = async () => {
        try {
            const response = await fetch('/api/analysis/processed');
            const data = await response.json();

            if (data.success) {
                setAnalyses(data.assessments || []);
            }
        } catch (err) {
            console.error('Failed to fetch analyses:', err);
        }
    };

    const handleValidate = async () => {
        if (!selectedAnalysis) {
            setError('Please select an analysis');
            return;
        }

        setLoading(true);
        setError('');
        setValidationResult(null);

        try {
            const response = await fetch('/api/analysis/cvss-validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ analysisId: selectedAnalysis })
            });

            const data = await response.json();

            if (data.success) {
                setValidationResult(data);
            } else {
                setError(data.error || 'Validation failed');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DONE': return 'bg-green-100 text-green-800 border-green-200';
            case 'PARTIALLY DONE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'NOT DONE': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'DONE': return '✅';
            case 'PARTIALLY DONE': return '⚠️';
            case 'NOT DONE': return '❌';
            default: return '❓';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">CVSS Validation Dashboard</h1>
                    <p className="text-gray-600 mb-6">Validate CVSS analysis compliance with SRS requirements</p>

                    {/* Analysis Selector */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Risk Analysis
                        </label>
                        <select
                            value={selectedAnalysis}
                            onChange={(e) => setSelectedAnalysis(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">-- Select an analysis --</option>
                            {analyses.map((analysis) => (
                                <option key={analysis._id} value={analysis._id}>
                                    {analysis.riskRegisterId} - {analysis.company} ({analysis.category})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Validate Button */}
                    <button
                        onClick={handleValidate}
                        disabled={loading || !selectedAnalysis}
                        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition mb-6"
                    >
                        {loading ? 'Validating...' : 'Validate CVSS Analysis'}
                    </button>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Validation Results */}
                    {validationResult && (
                        <div className="space-y-6">
                            {/* Summary */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Validation Summary</h2>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <p className="text-sm text-gray-600">Total Questions</p>
                                        <p className="text-2xl font-bold text-gray-900">{validationResult.summary.total}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <p className="text-sm text-gray-600">✅ Done</p>
                                        <p className="text-2xl font-bold text-green-600">{validationResult.summary.done}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <p className="text-sm text-gray-600">⚠️ Partially Done</p>
                                        <p className="text-2xl font-bold text-yellow-600">{validationResult.summary.partiallyDone}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <p className="text-sm text-gray-600">❌ Not Done</p>
                                        <p className="text-2xl font-bold text-red-600">{validationResult.summary.notDone}</p>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <span className={`inline-block px-4 py-2 rounded-lg font-semibold border ${getStatusColor(validationResult.summary.overallStatus)}`}>
                                        {getStatusIcon(validationResult.summary.overallStatus)} Overall Status: {validationResult.summary.overallStatus}
                                    </span>
                                </div>
                            </div>

                            {/* Detailed Results */}
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Detailed Validation Results</h2>

                                <div className="space-y-3">
                                    {validationResult.validations.map((item: any, index: number) => (
                                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">
                                                        Question {item.questionId} ({item.level})
                                                    </h3>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(item.validation.status)}`}>
                                                    {getStatusIcon(item.validation.status)} {item.validation.status}
                                                </span>
                                            </div>

                                            {/* Validation Details */}
                                            <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                                                <div>
                                                    <p className="text-gray-600">Calculation Valid</p>
                                                    <p className="font-medium">{item.validation.calculation_valid ? '✅ Yes' : '❌ No'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">SRS Compliance</p>
                                                    <p className="font-medium">{item.validation.srs_compliance ? '✅ Yes' : '❌ No'}</p>
                                                </div>
                                            </div>

                                            {/* Issues */}
                                            {item.validation.issues.length > 0 && (
                                                <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                                                    <p className="text-sm font-medium text-red-800 mb-1">Issues:</p>
                                                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                                                        {item.validation.issues.map((issue: string, i: number) => (
                                                            <li key={i}>{issue}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Missing Fields */}
                                            {item.validation.missing_fields.length > 0 && (
                                                <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                                                    <p className="text-sm font-medium text-yellow-800 mb-1">Missing Fields:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {item.validation.missing_fields.map((field: string, i: number) => (
                                                            <span key={i} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                                                {field}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Recommendation */}
                                            <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                                                <p className="text-sm font-medium text-blue-800 mb-1">Recommendation:</p>
                                                <p className="text-sm text-blue-700">{item.validation.recommendation}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
