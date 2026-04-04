"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "@/app/components/Layout";

const CATEGORIES = [
    "Performance",
    "User Interface (UI/UX)",
    "Security",
    "Functionality",
    "Reliability",
    "Other",
];

const RATING_LABELS: Record<number, string> = {
    1: "Very Poor",
    2: "Poor",
    3: "Average",
    4: "Good",
    5: "Excellent",
};

export default function FeedbackPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [rating, setRating] = useState(0);
    const [category, setCategory] = useState("");
    const [categoryOther, setCategoryOther] = useState("");
    const [detailedFeedback, setDetailedFeedback] = useState("");
    const [issuesEncountered, setIssuesEncountered] = useState("");
    const [suggestions, setSuggestions] = useState("");
    const [wouldRecommend, setWouldRecommend] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!rating) { setError("Please select a rating."); return; }
        if (!category) { setError("Please select a category."); return; }
        if (!wouldRecommend) { setError("Please answer the recommendation question."); return; }

        setSubmitting(true);
        setError("");
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name, email, rating, category,
                    categoryOther, detailedFeedback,
                    issuesEncountered, suggestions, wouldRecommend,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                setName(""); setEmail(""); setRating(0); setCategory("");
                setCategoryOther(""); setDetailedFeedback("");
                setIssuesEncountered(""); setSuggestions(""); setWouldRecommend("");
            } else {
                setError(data.error || "Failed to submit feedback");
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    }

    if (status === "loading") return null;

    return (
        <Layout>
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">User Feedback</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Help us improve CSRARS by sharing your experience
                    </p>
                </div>

                {success && (
                    <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4 text-green-300">
                        Thank you for your feedback! Your input helps us improve the system.
                    </div>
                )}

                {error && (
                    <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 text-red-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Section 1: Basic Information */}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                        <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                            1. Basic Information
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Name (optional)</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your full name"
                                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Email (optional)</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Date</label>
                                <input
                                    type="text"
                                    value={new Date().toLocaleDateString()}
                                    disabled
                                    className="w-full bg-slate-700/50 border border-slate-600 text-slate-400 rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Overall Rating */}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                        <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                            2. Overall Rating
                        </h2>
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map(star => (
                                <label key={star} className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="rating"
                                        value={star}
                                        checked={rating === star}
                                        onChange={() => setRating(star)}
                                        className="w-4 h-4 accent-blue-500"
                                    />
                                    <div className="flex items-center gap-2">
                                        <span className="text-yellow-400 text-lg">
                                            {'★'.repeat(star)}{'☆'.repeat(5 - star)}
                                        </span>
                                        <span className="text-slate-300 text-sm">
                                            {star} – {RATING_LABELS[star]}
                                        </span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Section 3: Feedback Category */}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                        <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                            3. Feedback Category
                        </h2>
                        <div className="grid grid-cols-2 gap-2">
                            {CATEGORIES.map(cat => (
                                <label key={cat} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="category"
                                        value={cat}
                                        checked={category === cat}
                                        onChange={() => setCategory(cat)}
                                        className="w-4 h-4 accent-blue-500"
                                    />
                                    <span className="text-slate-300 text-sm">{cat}</span>
                                </label>
                            ))}
                        </div>
                        {category === "Other" && (
                            <input
                                type="text"
                                value={categoryOther}
                                onChange={(e) => setCategoryOther(e.target.value)}
                                placeholder="Please specify..."
                                className="mt-3 w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                        )}
                    </div>

                    {/* Section 4: Detailed Feedback */}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                        <h2 className="text-white font-semibold mb-1 text-sm uppercase tracking-wider">
                            4. Detailed Feedback
                        </h2>
                        <p className="text-slate-400 text-xs mb-3">Please describe your experience clearly:</p>
                        <textarea
                            value={detailedFeedback}
                            onChange={(e) => setDetailedFeedback(e.target.value)}
                            required
                            rows={4}
                            placeholder="Describe your experience..."
                            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Section 5: Issues Encountered */}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                        <h2 className="text-white font-semibold mb-1 text-sm uppercase tracking-wider">
                            5. Issues Encountered (if any)
                        </h2>
                        <p className="text-slate-400 text-xs mb-3">Describe any problems you faced:</p>
                        <textarea
                            value={issuesEncountered}
                            onChange={(e) => setIssuesEncountered(e.target.value)}
                            rows={3}
                            placeholder="Describe any issues..."
                            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Section 6: Suggestions */}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                        <h2 className="text-white font-semibold mb-1 text-sm uppercase tracking-wider">
                            6. Suggestions for Improvement
                        </h2>
                        <p className="text-slate-400 text-xs mb-3">Optional but highly recommended:</p>
                        <textarea
                            value={suggestions}
                            onChange={(e) => setSuggestions(e.target.value)}
                            rows={3}
                            placeholder="Your suggestions..."
                            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Section 7: Would Recommend */}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                        <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                            7. Would You Recommend This System?
                        </h2>
                        <div className="flex gap-6">
                            {["Yes", "No", "Maybe"].map(opt => (
                                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="wouldRecommend"
                                        value={opt}
                                        checked={wouldRecommend === opt}
                                        onChange={() => setWouldRecommend(opt)}
                                        className="w-4 h-4 accent-blue-500"
                                    />
                                    <span className="text-slate-300 text-sm">{opt}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition text-sm"
                    >
                        {submitting ? "Submitting..." : "Submit Feedback"}
                    </button>

                </form>
            </div>
        </Layout>
    );
}
