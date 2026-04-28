/**
 * CVSS (Common Vulnerability Scoring System) Service
 * Integrates with NVD (National Vulnerability Database) for quantitative risk scoring
 * SRS Requirement: Quantitative scoring metrics (CVSS)
 */

// CVSS v3.1 Scoring Ranges
export const CVSS_SEVERITY = {
    NONE: { min: 0.0, max: 0.0, label: 'None' },
    LOW: { min: 0.1, max: 3.9, label: 'Low' },
    MEDIUM: { min: 4.0, max: 6.9, label: 'Medium' },
    HIGH: { min: 7.0, max: 8.9, label: 'High' },
    CRITICAL: { min: 9.0, max: 10.0, label: 'Critical' },
};

export interface CVSSScore {
    version: string; // e.g., "3.1"
    vectorString: string; // e.g., "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
    baseScore: number; // 0.0 - 10.0
    baseSeverity: string; // NONE, LOW, MEDIUM, HIGH, CRITICAL
    exploitabilityScore?: number;
    impactScore?: number;
}

export interface CVEData {
    cveId: string;
    description: string;
    publishedDate: string;
    lastModifiedDate: string;
    cvssScore?: CVSSScore;
    references: string[];
}

/**
 * Fetch CVE data from NVD API
 */
export async function fetchCVEData(cveId: string): Promise<CVEData | null> {
    try {
        const apiKey = process.env.NVD_API_KEY; // Optional: Increases rate limit
        const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cveId}`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (apiKey) {
            headers['apiKey'] = apiKey;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            console.warn(`⚠️ [CVSS] NVD API failed for ${cveId}: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const vulnerability = data.vulnerabilities?.[0];

        if (!vulnerability) {
            console.warn(`⚠️ [CVSS] No data found for ${cveId}`);
            return null;
        }

        const cve = vulnerability.cve;
        const metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV30?.[0];

        const cveData: CVEData = {
            cveId: cve.id,
            description: cve.descriptions?.find((d: any) => d.lang === 'en')?.value || 'No description',
            publishedDate: cve.published,
            lastModifiedDate: cve.lastModified,
            references: cve.references?.map((r: any) => r.url) || [],
        };

        if (metrics) {
            cveData.cvssScore = {
                version: metrics.cvssData.version,
                vectorString: metrics.cvssData.vectorString,
                baseScore: metrics.cvssData.baseScore,
                baseSeverity: metrics.cvssData.baseSeverity,
                exploitabilityScore: metrics.exploitabilityScore,
                impactScore: metrics.impactScore,
            };
        }

        console.log(`✅ [CVSS] Fetched ${cveId}: Score ${cveData.cvssScore?.baseScore || 'N/A'}`);
        return cveData;
    } catch (error: any) {
        console.error(`❌ [CVSS] Error fetching ${cveId}:`, error.message);
        return null;
    }
}

/**
 * Extract CVE IDs from text (e.g., threat descriptions, vulnerability reports)
 */
export function extractCVEIds(text: string): string[] {
    const cvePattern = /CVE-\d{4}-\d{4,7}/gi;
    const matches = text.match(cvePattern);
    return matches ? Array.from(new Set(matches.map(m => m.toUpperCase()))) : [];
}

/**
 * Convert CVSS score (0-10) to qualitative risk score (1-25)
 * Maps CVSS to the system's 1-25 scale
 */
export function cvssToRiskScore(cvssScore: number): number {
    // CVSS 0-10 → Risk Score 1-25
    // Linear mapping: riskScore = (cvssScore / 10) * 24 + 1
    return Math.round((cvssScore / 10) * 24) + 1;
}

/**
 * Get CVSS severity level from score
 */
export function getCVSSSeverity(score: number): string {
    if (score === 0) return 'NONE';
    if (score >= 9.0) return 'CRITICAL';
    if (score >= 7.0) return 'HIGH';
    if (score >= 4.0) return 'MEDIUM';
    if (score >= 0.1) return 'LOW';
    return 'NONE';
}

/**
 * Batch fetch multiple CVEs (with rate limiting)
 */
export async function fetchMultipleCVEs(cveIds: string[]): Promise<Map<string, CVEData>> {
    const results = new Map<string, CVEData>();
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (const cveId of cveIds) {
        const data = await fetchCVEData(cveId);
        if (data) {
            results.set(cveId, data);
        }
        // Rate limiting: NVD allows 5 requests per 30 seconds without API key
        // With API key: 50 requests per 30 seconds
        await delay(process.env.NVD_API_KEY ? 600 : 6000);
    }

    return results;
}

/**
 * Calculate weighted CVSS score for multiple vulnerabilities
 * Returns the highest CVSS score (worst case)
 */
export function calculateWeightedCVSS(cvssScores: number[]): number {
    if (cvssScores.length === 0) return 0;
    return Math.max(...cvssScores);
}

/**
 * CVSS v3.1 Calculator
 * Calculate CVSS Base Score from metrics
 */

export interface CVSSMetricsInput {
    attackVector: 'N' | 'A' | 'L' | 'P';
    attackComplexity: 'L' | 'H';
    privilegesRequired: 'N' | 'L' | 'H';
    userInteraction: 'N' | 'R';
    scope: 'U' | 'C';
    confidentiality: 'N' | 'L' | 'H';
    integrity: 'N' | 'L' | 'H';
    availability: 'N' | 'L' | 'H';
}

// CVSS v3.1 Metric Values
const METRIC_VALUES = {
    attackVector: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
    attackComplexity: { L: 0.77, H: 0.44 },
    privilegesRequired: {
        unchanged: { N: 0.85, L: 0.62, H: 0.27 },
        changed: { N: 0.85, L: 0.68, H: 0.5 }
    },
    userInteraction: { N: 0.85, R: 0.62 },
    confidentiality: { N: 0, L: 0.22, H: 0.56 },
    integrity: { N: 0, L: 0.22, H: 0.56 },
    availability: { N: 0, L: 0.22, H: 0.56 }
};

/**
 * Calculate CVSS v3.1 Base Score
 */
export function calculateCVSSScore(metrics: CVSSMetricsInput): {
    baseScore: number;
    baseSeverity: string;
    vectorString: string;
    exploitabilityScore: number;
    impactScore: number;
} {
    // Get metric values
    const av = METRIC_VALUES.attackVector[metrics.attackVector];
    const ac = METRIC_VALUES.attackComplexity[metrics.attackComplexity];
    const pr = metrics.scope === 'U'
        ? METRIC_VALUES.privilegesRequired.unchanged[metrics.privilegesRequired]
        : METRIC_VALUES.privilegesRequired.changed[metrics.privilegesRequired];
    const ui = METRIC_VALUES.userInteraction[metrics.userInteraction];
    const c = METRIC_VALUES.confidentiality[metrics.confidentiality];
    const i = METRIC_VALUES.integrity[metrics.integrity];
    const a = METRIC_VALUES.availability[metrics.availability];

    // Calculate Impact Sub-Score (ISS)
    const iss = 1 - ((1 - c) * (1 - i) * (1 - a));

    // Calculate Impact Score
    let impact: number;
    if (metrics.scope === 'U') {
        impact = 6.42 * iss;
    } else {
        impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
    }

    // Calculate Exploitability Score
    const exploitability = 8.22 * av * ac * pr * ui;

    // Calculate Base Score
    let baseScore: number;
    if (impact <= 0) {
        baseScore = 0;
    } else {
        if (metrics.scope === 'U') {
            baseScore = Math.min(impact + exploitability, 10);
        } else {
            baseScore = Math.min(1.08 * (impact + exploitability), 10);
        }
    }

    // Round up to one decimal place
    baseScore = Math.ceil(baseScore * 10) / 10;

    // Determine severity
    const baseSeverity = getCVSSSeverity(baseScore);

    // Generate vector string
    const vectorString = `CVSS:3.1/AV:${metrics.attackVector}/AC:${metrics.attackComplexity}/PR:${metrics.privilegesRequired}/UI:${metrics.userInteraction}/S:${metrics.scope}/C:${metrics.confidentiality}/I:${metrics.integrity}/A:${metrics.availability}`;

    return {
        baseScore,
        baseSeverity,
        vectorString,
        exploitabilityScore: Math.round(exploitability * 10) / 10,
        impactScore: Math.round(impact * 10) / 10
    };
}

/**
 * Parse CVSS vector string to metrics
 */
export function parseCVSSVector(vectorString: string): CVSSMetricsInput | null {
    try {
        const regex = /CVSS:3\.[01]\/AV:([NALP])\/AC:([LH])\/PR:([NLH])\/UI:([NR])\/S:([UC])\/C:([NLH])\/I:([NLH])\/A:([NLH])/;
        const match = vectorString.match(regex);

        if (!match) return null;

        return {
            attackVector: match[1] as 'N' | 'A' | 'L' | 'P',
            attackComplexity: match[2] as 'L' | 'H',
            privilegesRequired: match[3] as 'N' | 'L' | 'H',
            userInteraction: match[4] as 'N' | 'R',
            scope: match[5] as 'U' | 'C',
            confidentiality: match[6] as 'N' | 'L' | 'H',
            integrity: match[7] as 'N' | 'L' | 'H',
            availability: match[8] as 'N' | 'L' | 'H'
        };
    } catch (error) {
        return null;
    }
}
