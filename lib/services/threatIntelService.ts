import dbConnect from '@/lib/mongodb';
import ThreatIntelligence from '@/models/ThreatIntelligence';
import Asset from '@/models/Asset';
import { fetchMultipleCVEs, getCVSSSeverity } from './cvssService';

// Threat weight values used to calculate enhanced score
const THREAT_WEIGHTS = {
    critical: 8,
    high: 5,
    medium: 3,
    low: 1,
    info: 0,
};

/**
 * Get average risk score from risk analysis
 */
export async function getAverageRiskScore(questionnaireId: string): Promise<number> {
    try {
        const RiskAnalysis = (await import('@/models/RiskAnalysis')).default;
        const analysis = await RiskAnalysis.findOne({ questionnaireId }).lean();

        if (!analysis) {
            console.warn(`⚠️ [ThreatIntel] No risk analysis found for questionnaire ${questionnaireId}`);
            return 0;
        }

        // Calculate average risk score from all questions
        const allQuestions = [
            ...(analysis.operational || []),
            ...(analysis.tactical || []),
            ...(analysis.strategic || []),
        ];

        const scores = allQuestions.map((q: any) => q.analysis?.riskScore || 0);
        const avgScore = scores.length > 0
            ? Math.round(scores.reduce((sum: number, s: number) => sum + s, 0) / scores.length)
            : 0;

        console.log(`📊 [ThreatIntel] Average risk score for ${questionnaireId}: ${avgScore}/25 (from ${scores.length} questions)`);
        return avgScore;
    } catch (err: any) {
        console.error('❌ [ThreatIntel] Error fetching risk score:', err.message);
        return 0;
    }
}

/**
 * Fetch threat data from VirusTotal for an IP
 */
async function fetchVirusTotal(ip: string, apiKey: string): Promise<any[]> {
    try {
        const res = await fetch(`https://www.virustotal.com/api/v3/ip_addresses/${ip}`, {
            headers: { 'x-apikey': apiKey },
        });

        if (!res.ok) return [];

        const data = await res.json();
        const stats = data?.data?.attributes?.last_analysis_stats || {};
        const malicious = stats.malicious || 0;
        const suspicious = stats.suspicious || 0;

        const threats = [];

        if (malicious > 0) {
            threats.push({
                source: 'virustotal',
                threatType: 'Malicious IP',
                severity: malicious > 5 ? 'critical' : 'high',
                description: `VirusTotal: ${malicious} security vendors flagged this IP as malicious`,
                rawData: data?.data?.attributes,
            });
        }

        if (suspicious > 0) {
            threats.push({
                source: 'virustotal',
                threatType: 'Suspicious Activity',
                severity: 'medium',
                description: `VirusTotal: ${suspicious} vendors flagged this IP as suspicious`,
                rawData: data?.data?.attributes,
            });
        }

        return threats;
    } catch (err: any) {
        console.warn(`[ThreatIntel] VirusTotal failed for ${ip}:`, err.message);
        return [];
    }
}

/**
 * Fetch threat data from Shodan for an IP
 */
async function fetchShodan(ip: string, apiKey: string): Promise<any[]> {
    try {
        console.log(`🔍 [Shodan] Scanning ${ip}...`);
        const res = await fetch(`https://api.shodan.io/shodan/host/${ip}?key=${apiKey}`);

        if (!res.ok) {
            console.warn(`⚠️ [Shodan] API returned ${res.status} for ${ip}`);
            return [];
        }

        const data = await res.json();
        const threats = [];

        // Shodan returns vulns as an object where keys are CVE IDs
        // Filter to only get actual CVE IDs (format: CVE-YYYY-NNNNN)
        const vulnsObj = data?.vulns || {};
        const allKeys = Object.keys(vulnsObj);
        const vulns = allKeys.filter(key => key.startsWith('CVE-'));

        console.log(`📊 [Shodan] Raw vulnerability keys: ${allKeys.slice(0, 10).join(', ')}${allKeys.length > 10 ? '...' : ''}`);
        console.log(`📊 [Shodan] Found ${vulns.length} CVE vulnerabilities for ${ip} (total entries: ${allKeys.length})`);

        if (vulns.length > 0) {
            console.log(`🔍 [Shodan] CVE IDs: ${vulns.slice(0, 5).join(', ')}`);

            // Extract CVE IDs and fetch CVSS scores
            const cveData = await fetchMultipleCVEs(vulns.slice(0, 5)); // Limit to 5 to avoid rate limits

            let maxCVSS = 0;
            const cveDetails: string[] = [];

            for (const [cveId, cve] of cveData.entries()) {
                if (cve.cvssScore) {
                    maxCVSS = Math.max(maxCVSS, cve.cvssScore.baseScore);
                    cveDetails.push(`${cveId} (CVSS: ${cve.cvssScore.baseScore})`);
                    console.log(`✅ [CVSS] ${cveId}: ${cve.cvssScore.baseScore}`);
                }
            }

            console.log(`📊 [Shodan] Max CVSS score: ${maxCVSS}`);

            // Determine severity based on CVSS score
            let severity: string;
            if (maxCVSS >= 9.0) severity = 'critical';
            else if (maxCVSS >= 7.0) severity = 'high';
            else if (maxCVSS >= 4.0) severity = 'medium';
            else if (vulns.length > 3) severity = 'high';
            else if (vulns.length > 1) severity = 'medium';
            else severity = 'low';

            const description = cveDetails.length > 0
                ? `Shodan: ${vulns.length} vulnerabilities found. Top CVEs: ${cveDetails.slice(0, 3).join(', ')}${vulns.length > 3 ? '...' : ''}`
                : `Shodan: ${vulns.length} known vulnerabilities found (${vulns.slice(0, 3).join(', ')}${vulns.length > 3 ? '...' : ''})`;

            threats.push({
                source: 'shodan',
                threatType: 'Known Vulnerabilities',
                severity,
                description,
                cvssScore: maxCVSS > 0 ? maxCVSS : undefined,
                cveIds: vulns,
                rawData: { vulns: data.vulns, ports: data.ports, org: data.org, cveData: Array.from(cveData.values()) },
            });

            console.log(`✅ [Shodan] Created threat with CVSS: ${maxCVSS > 0 ? maxCVSS : 'N/A'}`);
        } else {
            console.log(`✅ [Shodan] No CVE vulnerabilities found for ${ip} (${Object.keys(vulnsObj).length} total entries, but no CVE IDs)`);
        }

        if (data?.ports?.length > 10) {
            threats.push({
                source: 'shodan',
                threatType: 'Excessive Open Ports',
                severity: 'medium',
                description: `Shodan: ${data.ports.length} open ports detected on this host`,
                rawData: { ports: data.ports },
            });
        }

        return threats;
    } catch (err: any) {
        console.warn(`⚠️ [ThreatIntel] Shodan failed for ${ip}:`, err.message);
        throw err;
    }
}

/**
 * Generate AI threat insights using OpenRouter with structured JSON output
 */
async function fetchAIThreatInsights(asset: any, apiKey: string): Promise<any[]> {
    try {
        const { OpenRouter } = await import('@openrouter/sdk');
        const openRouter = new OpenRouter({ apiKey });

        const prompt = `You are a cybersecurity threat intelligence analyst.
Analyze this network asset and identify potential threats:

IP: ${asset.ip}
Hostname: ${asset.hostname || 'Unknown'}
Open Ports: ${asset.openPorts?.join(', ') || 'None detected'}
OS: ${asset.os || 'Unknown'}
Device Type: ${asset.deviceType || 'Unknown'}
Company: ${asset.company}

Respond with a JSON object in this EXACT format:
{
  "threatType": "string (e.g., 'Exposed Services', 'Vulnerable Software')",
  "severity": "critical|high|medium|low",
  "description": "string (brief threat description)",
  "recommendation": "string (actionable recommendation)"
}

Only respond with valid JSON, no other text.`;

        const completion: any = await openRouter.chat.send({
            model: 'openai/gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            maxTokens: 300,
        });

        const text = completion?.choices?.[0]?.message?.content || '';

        // Try to parse JSON response
        let parsed: any;
        try {
            // Remove markdown code blocks if present
            const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch (parseErr) {
            console.warn('⚠️ [ThreatIntel] AI returned invalid JSON, falling back to text parsing');
            // Fallback to old text parsing
            const lines = text.split('\n');
            parsed = {
                threatType: lines.find((l: string) => l.includes('threatType'))?.split(':')[1]?.trim().replace(/[",]/g, '') || 'General Threat',
                severity: lines.find((l: string) => l.includes('severity'))?.split(':')[1]?.trim().replace(/[",]/g, '').toLowerCase() || 'medium',
                description: lines.find((l: string) => l.includes('description'))?.split(':')[1]?.trim().replace(/[",]/g, '') || 'AI-identified potential threat',
                recommendation: lines.find((l: string) => l.includes('recommendation'))?.split(':')[1]?.trim().replace(/[",]/g, '') || '',
            };
        }

        const severity = ['critical', 'high', 'medium', 'low', 'info'].includes(parsed.severity?.toLowerCase())
            ? parsed.severity.toLowerCase()
            : 'medium';

        return [{
            source: 'ai',
            threatType: parsed.threatType || 'General Threat',
            severity,
            description: `${parsed.description || 'AI-identified potential threat'}${parsed.recommendation ? ` | Recommendation: ${parsed.recommendation}` : ''}`,
            rawData: { aiResponse: text, parsed },
        }];
    } catch (err: any) {
        console.warn('⚠️ [ThreatIntel] AI insights failed:', err.message);
        throw err; // Throw to be caught by caller
    }
}

/**
 * Main function: fetch threats for all assets of a questionnaire
 */
export async function fetchAndSaveThreats(params: {
    questionnaireId: string;
    company: string;
    originalRiskScore?: number;
    forceRefresh?: boolean;
}): Promise<{ success: boolean; threatsFound: number; errors: string[] }> {
    const { questionnaireId, company, originalRiskScore = 0, forceRefresh = false } = params;

    const vtApiKey = process.env.VIRUSTOTAL_API_KEY;
    const shodanApiKey = process.env.SHODAN_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    const errors: string[] = [];

    try {
        await dbConnect();

        // Check for existing threats (duplicate prevention)
        if (!forceRefresh) {
            const existingThreats = await ThreatIntelligence.countDocuments({ questionnaireId });
            if (existingThreats > 0) {
                console.log(`✅ [ThreatIntel] ${existingThreats} threats already exist for ${company}. Use forceRefresh=true to update.`);
                return { success: true, threatsFound: existingThreats, errors: [] };
            }
        } else {
            // Delete old threats if force refresh
            const deleted = await ThreatIntelligence.deleteMany({ questionnaireId });
            console.log(`🔄 [ThreatIntel] Deleted ${deleted.deletedCount} old threats for ${company}`);
        }

        // Validate API keys
        if (!vtApiKey && !shodanApiKey && !openRouterKey) {
            const error = 'No threat intelligence API keys configured';
            console.warn(`⚠️ [ThreatIntel] ${error}`);
            errors.push(error);
            return { success: false, threatsFound: 0, errors };
        }

        // Get all assets for this questionnaire
        const assets = await Asset.find({ questionnaireId }).lean();

        if (assets.length === 0) {
            console.log('ℹ️ [ThreatIntel] No assets found for questionnaire:', questionnaireId);
            return { success: true, threatsFound: 0, errors: [] };
        }

        console.log(`🔍 [ThreatIntel] Scanning ${assets.length} assets for ${company}...`);

        let totalThreats = 0;
        const threatsByAsset = new Map<string, any[]>();

        for (const asset of assets) {
            const allThreats: any[] = [];

            // Fetch from VirusTotal
            if (vtApiKey) {
                try {
                    const vtThreats = await fetchVirusTotal(asset.ip, vtApiKey);
                    allThreats.push(...vtThreats);
                    if (vtThreats.length > 0) {
                        console.log(`  ✅ VirusTotal: ${vtThreats.length} threats for ${asset.ip}`);
                    }
                } catch (err: any) {
                    const error = `VirusTotal failed for ${asset.ip}: ${err.message}`;
                    console.error(`  ❌ ${error}`);
                    errors.push(error);
                }
            }

            // Fetch from Shodan
            if (shodanApiKey) {
                try {
                    const shodanThreats = await fetchShodan(asset.ip, shodanApiKey);
                    allThreats.push(...shodanThreats);
                    if (shodanThreats.length > 0) {
                        console.log(`  ✅ Shodan: ${shodanThreats.length} threats for ${asset.ip}`);
                    }
                } catch (err: any) {
                    const error = `Shodan failed for ${asset.ip}: ${err.message}`;
                    console.error(`  ❌ ${error}`);
                    errors.push(error);
                }
            }

            // AI insights (always run if OpenRouter key exists)
            if (openRouterKey) {
                try {
                    const aiThreats = await fetchAIThreatInsights({ ...asset, company }, openRouterKey);
                    allThreats.push(...aiThreats);
                    if (aiThreats.length > 0) {
                        console.log(`  ✅ AI: ${aiThreats.length} threats for ${asset.ip}`);
                    }
                } catch (err: any) {
                    const error = `AI analysis failed for ${asset.ip}: ${err.message}`;
                    console.error(`  ❌ ${error}`);
                    errors.push(error);
                }
            }

            // Deduplicate threats by threatType + severity
            const uniqueThreats = new Map<string, any>();
            for (const threat of allThreats) {
                const key = `${threat.threatType}-${threat.severity}`;
                if (!uniqueThreats.has(key)) {
                    uniqueThreats.set(key, threat);
                } else {
                    // Merge descriptions if duplicate
                    const existing = uniqueThreats.get(key);
                    existing.description += ` | ${threat.description}`;
                }
            }

            threatsByAsset.set(String(asset._id), Array.from(uniqueThreats.values()));
        }

        // Calculate enhanced score ONCE per asset (aggregate all threats)
        for (const [assetId, threats] of threatsByAsset.entries()) {
            if (threats.length === 0) continue;

            // Aggregate threat weights (max weight per severity level)
            const maxWeightBySeverity = new Map<string, number>();
            for (const threat of threats) {
                const weight = THREAT_WEIGHTS[threat.severity as keyof typeof THREAT_WEIGHTS] || 0;
                const currentMax = maxWeightBySeverity.get(threat.severity) || 0;
                maxWeightBySeverity.set(threat.severity, Math.max(currentMax, weight));
            }

            // Sum up max weights
            const totalWeight = Array.from(maxWeightBySeverity.values()).reduce((sum, w) => sum + w, 0);
            const enhancedScore = Math.min(25, originalRiskScore + totalWeight);

            // Save each threat with the SAME enhanced score
            for (const threat of threats) {
                const weight = THREAT_WEIGHTS[threat.severity as keyof typeof THREAT_WEIGHTS] || 0;

                await ThreatIntelligence.create({
                    assetId,
                    questionnaireId,
                    company,
                    source: threat.source,
                    threatType: threat.threatType,
                    severity: threat.severity,
                    description: threat.description,
                    originalRiskScore,
                    enhancedScore, // Same for all threats from this asset
                    threatWeight: weight,

                    // CVSS Integration (SRS Requirement)
                    cvssScore: threat.cvssScore,
                    cvssSeverity: threat.cvssScore ? getCVSSSeverity(threat.cvssScore) : undefined,
                    cveIds: threat.cveIds,

                    rawData: threat.rawData,
                    fetchedAt: new Date(),
                });

                totalThreats++;
            }
        }

        console.log(`✅ [ThreatIntel] Saved ${totalThreats} unique threats for ${company}`);
        if (errors.length > 0) {
            console.warn(`⚠️ [ThreatIntel] ${errors.length} errors occurred during scan`);
        }

        // Notify if threats found
        if (totalThreats > 0) {
            try {
                const { notifyThreatFound } = await import('@/lib/services/notificationService');
                // Find actual max severity from saved threats
                const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
                const savedThreats = await ThreatIntelligence.find({ questionnaireId }).lean();
                let maxSeverity = 'info';
                for (const sev of severityOrder) {
                    if (savedThreats.some((t: any) => t.severity === sev)) {
                        maxSeverity = sev;
                        break;
                    }
                }
                await notifyThreatFound({ company, threatCount: totalThreats, maxSeverity });
            } catch (notifErr) {
                console.error('❌ [ThreatIntel] Notification failed:', notifErr);
            }

            // 🆕 AUTO-TRIGGER CVSS RECALCULATION
            // When new threats with CVEs are detected, trigger CVSS update for affected risks
            try {
                console.log('🔄 [CVSS] Auto-triggering CVSS recalculation for new threats...');
                const { recalculateCVSSForThreats } = await import('./cvssIntegrationService');
                await recalculateCVSSForThreats(questionnaireId);
            } catch (cvssErr) {
                console.error('❌ [CVSS] Auto-trigger failed:', cvssErr);
            }
        }

        return { success: true, threatsFound: totalThreats, errors };
    } catch (error: any) {
        console.error('❌ [ThreatIntel] Critical error:', error.message);
        errors.push(error.message);
        return { success: false, threatsFound: 0, errors };
    }
}
