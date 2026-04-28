/**
 * CVSS Integration Service
 * Maps CVSS scores to qualitative risk metrics (Likelihood & Impact)
 * Integrates CVSS with the existing risk analysis workflow
 */

import { calculateCVSSScore, CVSSMetricsInput } from './cvssService';

/**
 * Map CVSS score (0-10) to Likelihood (1-5)
 * Based on Exploitability sub-score
 */
export function cvssToLikelihood(cvssScore: number, exploitabilityScore?: number): number {
    // If exploitability score is available, use it for more accurate mapping
    if (exploitabilityScore !== undefined) {
        // Exploitability ranges from 0 to ~3.9
        if (exploitabilityScore >= 3.5) return 5; // Almost Certain
        if (exploitabilityScore >= 3.0) return 4; // High
        if (exploitabilityScore >= 2.0) return 3; // Moderate
        if (exploitabilityScore >= 1.0) return 2; // Low
        return 1; // Remote
    }

    // Fallback: Use base CVSS score
    if (cvssScore >= 9.0) return 5; // Almost Certain
    if (cvssScore >= 7.0) return 4; // High
    if (cvssScore >= 4.0) return 3; // Moderate
    if (cvssScore >= 2.0) return 2; // Low
    return 1; // Remote
}

/**
 * Map CVSS score (0-10) to Impact (1-5)
 * Based on Impact sub-score
 */
export function cvssToImpact(cvssScore: number, impactScore?: number): number {
    // If impact score is available, use it for more accurate mapping
    if (impactScore !== undefined) {
        // Impact ranges from 0 to ~6.0
        if (impactScore >= 5.0) return 5; // Critical
        if (impactScore >= 4.0) return 4; // High
        if (impactScore >= 2.5) return 3; // Moderate
        if (impactScore >= 1.0) return 2; // Low
        return 1; // Minimal
    }

    // Fallback: Use base CVSS score
    if (cvssScore >= 9.0) return 5; // Critical
    if (cvssScore >= 7.0) return 4; // High
    if (cvssScore >= 4.0) return 3; // Moderate
    if (cvssScore >= 2.0) return 2; // Low
    return 1; // Minimal
}

/**
 * Infer CVSS metrics from threat keywords and question context
 * This enables automatic CVSS calculation during risk analysis
 */
export function inferCVSSMetrics(params: {
    threat: string;
    question: string;
    answer: string;
    section: string;
}): CVSSMetricsInput | null {
    const { threat, question, answer } = params;
    const text = `${threat} ${question} ${answer}`.toLowerCase();

    // Default metrics (moderate risk)
    let metrics: CVSSMetricsInput = {
        attackVector: 'N',      // Network (most common)
        attackComplexity: 'L',  // Low
        privilegesRequired: 'N', // None
        userInteraction: 'N',   // None
        scope: 'U',             // Unchanged
        confidentiality: 'L',   // Low
        integrity: 'L',         // Low
        availability: 'L'       // Low
    };

    // Attack Vector inference
    if (text.match(/remote|internet|network|external|online/)) {
        metrics.attackVector = 'N'; // Network
    } else if (text.match(/adjacent|local network|lan|wifi/)) {
        metrics.attackVector = 'A'; // Adjacent
    } else if (text.match(/local|physical access|on-site/)) {
        metrics.attackVector = 'L'; // Local
    } else if (text.match(/physical|hardware|device/)) {
        metrics.attackVector = 'P'; // Physical
    }

    // Attack Complexity
    if (text.match(/complex|difficult|advanced|sophisticated/)) {
        metrics.attackComplexity = 'H'; // High
    } else if (text.match(/simple|easy|trivial|basic|automated/)) {
        metrics.attackComplexity = 'L'; // Low
    }

    // Privileges Required
    if (text.match(/admin|root|privileged|elevated/)) {
        metrics.privilegesRequired = 'H'; // High
    } else if (text.match(/user|authenticated|login|account/)) {
        metrics.privilegesRequired = 'L'; // Low
    } else if (text.match(/unauthenticated|anonymous|public|no auth/)) {
        metrics.privilegesRequired = 'N'; // None
    }

    // User Interaction
    if (text.match(/phishing|click|open|social engineering|user action/)) {
        metrics.userInteraction = 'R'; // Required
    } else {
        metrics.userInteraction = 'N'; // None
    }

    // Scope
    if (text.match(/privilege escalation|escape|sandbox|container/)) {
        metrics.scope = 'C'; // Changed
    }

    // Confidentiality Impact
    if (text.match(/data breach|leak|exposure|disclosure|confidential|sensitive data|pii|personal information/)) {
        metrics.confidentiality = 'H'; // High
    } else if (text.match(/limited data|some information|partial disclosure/)) {
        metrics.confidentiality = 'L'; // Low
    } else if (text.match(/no data|no information|no disclosure/)) {
        metrics.confidentiality = 'N'; // None
    }

    // Integrity Impact
    if (text.match(/modify|alter|tamper|corrupt|inject|sql injection|xss|malware/)) {
        metrics.integrity = 'H'; // High
    } else if (text.match(/limited modification|minor changes/)) {
        metrics.integrity = 'L'; // Low
    } else if (text.match(/read-only|no modification/)) {
        metrics.integrity = 'N'; // None
    }

    // Availability Impact
    if (text.match(/ddos|denial of service|crash|outage|downtime|ransomware|unavailable/)) {
        metrics.availability = 'H'; // High
    } else if (text.match(/degraded|slow|performance|partial outage/)) {
        metrics.availability = 'L'; // Low
    } else if (text.match(/no impact|available|uptime/)) {
        metrics.availability = 'N'; // None
    }

    // High-severity threat patterns
    if (text.match(/critical|severe|ransomware|data breach|sql injection|remote code execution|rce/)) {
        metrics.confidentiality = 'H';
        metrics.integrity = 'H';
        metrics.availability = 'H';
    }

    return metrics;
}

/**
 * Calculate CVSS and map to qualitative risk metrics
 * This is the main integration function used by riskAnalyzer
 */
export function calculateCVSSForRisk(params: {
    threat: string;
    question: string;
    answer: string;
    section: string;
}): {
    cvssScore: number;
    cvssSeverity: string;
    cvssMetrics: CVSSMetricsInput;
    cvssVectorString: string;
    likelihood: number;
    impact: number;
    exploitabilityScore: number;
    impactScore: number;
} | null {
    try {
        // Infer CVSS metrics from context
        const metrics = inferCVSSMetrics(params);
        if (!metrics) return null;

        // Calculate CVSS score
        const cvssResult = calculateCVSSScore(metrics);

        // Map CVSS to Likelihood and Impact
        const likelihood = cvssToLikelihood(cvssResult.baseScore, cvssResult.exploitabilityScore);
        const impact = cvssToImpact(cvssResult.baseScore, cvssResult.impactScore);

        return {
            cvssScore: cvssResult.baseScore,
            cvssSeverity: cvssResult.baseSeverity,
            cvssMetrics: metrics,
            cvssVectorString: cvssResult.vectorString,
            likelihood,
            impact,
            exploitabilityScore: cvssResult.exploitabilityScore,
            impactScore: cvssResult.impactScore
        };
    } catch (error) {
        console.error('❌ Error calculating CVSS for risk:', error);
        return null;
    }
}

/**
 * Enhance existing risk analysis with CVSS data
 * Can be used to update risks that were analyzed without CVSS
 */
export function enhanceRiskWithCVSS(risk: {
    threat: string;
    question: string;
    answer: string;
    section: string;
    likelihood: number;
    impact: number;
}): any {
    const cvssData = calculateCVSSForRisk(risk);

    if (!cvssData) {
        return risk; // Return original if CVSS calculation fails
    }

    // Use CVSS-derived likelihood/impact if they're higher (more conservative)
    const finalLikelihood = Math.max(risk.likelihood, cvssData.likelihood);
    const finalImpact = Math.max(risk.impact, cvssData.impact);

    return {
        ...risk,
        likelihood: finalLikelihood,
        impact: finalImpact,
        cvssScore: cvssData.cvssScore,
        cvssSeverity: cvssData.cvssSeverity,
        cvssMetrics: cvssData.cvssMetrics,
        cvssVectorString: cvssData.cvssVectorString
    };
}

/**
 * Recalculate CVSS for all risks when new threats are detected
 * Auto-triggered by threat intelligence service
 */
export async function recalculateCVSSForThreats(questionnaireId: string): Promise<void> {
    try {
        const mongoose = await import('mongoose');
        const RiskAnalysis = (await import('@/models/RiskAnalysis')).default;

        const analysis = await RiskAnalysis.findOne({
            questionnaireId: new mongoose.Types.ObjectId(questionnaireId)
        });

        if (!analysis) {
            console.warn(`⚠️ [CVSS] No risk analysis found for questionnaire ${questionnaireId}`);
            return;
        }

        let updatedCount = 0;
        const levels = ['operational', 'tactical', 'strategic'] as const;

        for (const level of levels) {
            const questions = analysis[level] || [];

            for (const question of questions) {
                // Store previous CVSS score for comparison
                const previousCVSS = question.analysis.cvssScore;

                // Recalculate CVSS
                const cvssData = calculateCVSSForRisk({
                    threat: question.analysis.threat || '',
                    question: question.question || '',
                    answer: question.answer || '',
                    section: question.section || ''
                });

                if (cvssData) {
                    // Update with new CVSS data
                    question.analysis.cvssScore = cvssData.cvssScore;
                    question.analysis.cvssSeverity = cvssData.cvssSeverity;
                    question.analysis.cvssMetrics = cvssData.cvssMetrics;
                    question.analysis.cvssVectorString = cvssData.cvssVectorString;

                    // Update likelihood/impact if CVSS suggests higher risk
                    question.analysis.likelihood = Math.max(question.analysis.likelihood, cvssData.likelihood);
                    question.analysis.impact = Math.max(question.analysis.impact, cvssData.impact);
                    question.analysis.riskScore = question.analysis.likelihood * question.analysis.impact;

                    // Log if CVSS changed significantly
                    if (previousCVSS && Math.abs(cvssData.cvssScore - previousCVSS) >= 1.0) {
                        console.log(`📊 [CVSS] Updated Q${question.questionId}: ${previousCVSS.toFixed(1)} → ${cvssData.cvssScore.toFixed(1)}`);
                    }

                    updatedCount++;
                }
            }
        }

        // Save updated analysis
        await analysis.save();
        console.log(`✅ [CVSS] Recalculated CVSS for ${updatedCount} risks in questionnaire ${questionnaireId}`);

    } catch (error) {
        console.error('❌ [CVSS] Recalculation failed:', error);
        throw error;
    }
}

/**
 * Get CVSS history for a specific risk
 * Tracks how CVSS scores have changed over time
 */
export async function getCVSSHistory(params: {
    questionnaireId: string;
    questionId: number;
}): Promise<Array<{
    timestamp: Date;
    cvssScore: number;
    cvssSeverity: string;
    cvssVectorString: string;
}>> {
    try {
        const mongoose = await import('mongoose');
        const RiskAnalysis = (await import('@/models/RiskAnalysis')).default;

        // Get all versions of this risk analysis (if versioning is implemented)
        // For now, return current version only
        const analysis = await RiskAnalysis.findOne({
            questionnaireId: new mongoose.Types.ObjectId(params.questionnaireId)
        });

        if (!analysis) return [];

        const allQuestions = [
            ...analysis.operational,
            ...analysis.tactical,
            ...analysis.strategic
        ];

        const question = allQuestions.find(q => q.questionId === params.questionId);

        if (!question?.analysis.cvssScore) return [];

        return [{
            timestamp: question.timestamp || analysis.updatedAt,
            cvssScore: question.analysis.cvssScore,
            cvssSeverity: question.analysis.cvssSeverity || 'UNKNOWN',
            cvssVectorString: question.analysis.cvssVectorString || ''
        }];

    } catch (error) {
        console.error('❌ [CVSS] History fetch failed:', error);
        return [];
    }
}

/**
 * Compare CVSS scores between two risk analyses
 * Useful for tracking risk changes over time
 */
export function compareCVSSScores(params: {
    previous: { cvssScore?: number; cvssSeverity?: string };
    current: { cvssScore?: number; cvssSeverity?: string };
}): {
    changed: boolean;
    direction: 'increased' | 'decreased' | 'unchanged';
    delta: number;
    message: string;
} {
    const { previous, current } = params;

    if (!previous.cvssScore || !current.cvssScore) {
        return {
            changed: false,
            direction: 'unchanged',
            delta: 0,
            message: 'No CVSS data available for comparison'
        };
    }

    const delta = current.cvssScore - previous.cvssScore;
    const changed = Math.abs(delta) >= 0.1; // Consider changes >= 0.1 as significant

    let direction: 'increased' | 'decreased' | 'unchanged' = 'unchanged';
    let message = 'CVSS score unchanged';

    if (delta > 0) {
        direction = 'increased';
        message = `CVSS increased by ${delta.toFixed(1)} (${previous.cvssSeverity} → ${current.cvssSeverity})`;
    } else if (delta < 0) {
        direction = 'decreased';
        message = `CVSS decreased by ${Math.abs(delta).toFixed(1)} (${previous.cvssSeverity} → ${current.cvssSeverity})`;
    }

    return { changed, direction, delta, message };
}
