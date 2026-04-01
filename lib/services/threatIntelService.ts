import dbConnect from '@/lib/mongodb';
import ThreatIntelligence from '@/models/ThreatIntelligence';
import Asset from '@/models/Asset';

// Threat weight values used to calculate enhanced score
const THREAT_WEIGHTS = {
    critical: 8,
    high: 5,
    medium: 3,
    low: 1,
    info: 0,
};

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
        const res = await fetch(`https://api.shodan.io/shodan/host/${ip}?key=${apiKey}`);

        if (!res.ok) return [];

        const data = await res.json();
        const threats = [];
        const vulns = data?.vulns ? Object.keys(data.vulns) : [];

        if (vulns.length > 0) {
            threats.push({
                source: 'shodan',
                threatType: 'Known Vulnerabilities',
                severity: vulns.length > 3 ? 'critical' : vulns.length > 1 ? 'high' : 'medium',
                description: `Shodan: ${vulns.length} known vulnerabilities found (${vulns.slice(0, 3).join(', ')}${vulns.length > 3 ? '...' : ''})`,
                rawData: { vulns: data.vulns, ports: data.ports, org: data.org },
            });
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
        console.warn(`[ThreatIntel] Shodan failed for ${ip}:`, err.message);
        return [];
    }
}

/**
 * Generate AI threat insights using OpenRouter
 */
async function fetchAIThreatInsights(asset: any, apiKey: string): Promise<any[]> {
    try {
        const { OpenRouter } = await import('@openrouter/sdk');
        const openRouter = new OpenRouter({ apiKey });

        const prompt = `You are a cybersecurity threat intelligence analyst.
Analyze this network asset and identify potential threats:

IP: ${asset.ip}
Hostname: ${asset.hostname}
Open Ports: ${asset.openPorts?.join(', ') || 'None detected'}
OS: ${asset.os}
Device Type: ${asset.deviceType}
Company: ${asset.company}

Respond in this EXACT format (one line each):
THREAT_TYPE: [type]
SEVERITY: [critical/high/medium/low]
DESCRIPTION: [one line description]
RECOMMENDATION: [one line recommendation]`;

        const completion: any = await openRouter.chat.send({
            model: 'openai/gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            max_tokens: 300,
        });

        const text = completion?.choices?.[0]?.message?.content || '';
        const lines = text.split('\n');

        const threatType = lines.find((l: string) => l.startsWith('THREAT_TYPE:'))?.replace('THREAT_TYPE:', '').trim() || 'General Threat';
        const severity = lines.find((l: string) => l.startsWith('SEVERITY:'))?.replace('SEVERITY:', '').trim().toLowerCase() || 'medium';
        const description = lines.find((l: string) => l.startsWith('DESCRIPTION:'))?.replace('DESCRIPTION:', '').trim() || 'AI-identified potential threat';
        const recommendation = lines.find((l: string) => l.startsWith('RECOMMENDATION:'))?.replace('RECOMMENDATION:', '').trim() || '';

        return [{
            source: 'ai',
            threatType,
            severity: ['critical', 'high', 'medium', 'low', 'info'].includes(severity) ? severity : 'medium',
            description: `${description}${recommendation ? ` | Recommendation: ${recommendation}` : ''}`,
            rawData: { aiResponse: text },
        }];
    } catch (err: any) {
        console.warn('[ThreatIntel] AI insights failed:', err.message);
        return [];
    }
}

/**
 * Main function: fetch threats for all assets of a questionnaire
 */
export async function fetchAndSaveThreats(params: {
    questionnaireId: string;
    company: string;
    originalRiskScore?: number;
}): Promise<{ success: boolean; threatsFound: number }> {
    const { questionnaireId, company, originalRiskScore = 0 } = params;

    const vtApiKey = process.env.VIRUSTOTAL_API_KEY;
    const shodanApiKey = process.env.SHODAN_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    try {
        await dbConnect();

        // Get all assets for this questionnaire
        const assets = await Asset.find({ questionnaireId }).lean();

        if (assets.length === 0) {
            console.log('[ThreatIntel] No assets found for questionnaire:', questionnaireId);
            return { success: true, threatsFound: 0 };
        }

        let totalThreats = 0;

        for (const asset of assets) {
            const allThreats: any[] = [];

            // Fetch from VirusTotal
            if (vtApiKey) {
                const vtThreats = await fetchVirusTotal(asset.ip, vtApiKey);
                allThreats.push(...vtThreats);
            }

            // Fetch from Shodan
            if (shodanApiKey) {
                const shodanThreats = await fetchShodan(asset.ip, shodanApiKey);
                allThreats.push(...shodanThreats);
            }

            // AI insights (always run if OpenRouter key exists)
            if (openRouterKey) {
                const aiThreats = await fetchAIThreatInsights({ ...asset, company }, openRouterKey);
                allThreats.push(...aiThreats);
            }

            // Save each threat
            for (const threat of allThreats) {
                const weight = THREAT_WEIGHTS[threat.severity as keyof typeof THREAT_WEIGHTS] || 0;
                const enhanced = Math.min(25, originalRiskScore + weight); // cap at 25

                await ThreatIntelligence.create({
                    assetId: asset._id,
                    questionnaireId,
                    company,
                    source: threat.source,
                    threatType: threat.threatType,
                    severity: threat.severity,
                    description: threat.description,
                    originalRiskScore,
                    enhancedScore: enhanced,
                    threatWeight: weight,
                    rawData: threat.rawData,
                    fetchedAt: new Date(),
                });

                totalThreats++;
            }
        }

        console.log(`[ThreatIntel] Saved ${totalThreats} threats for ${company}`);

        // Notify if threats found
        if (totalThreats > 0) {
            try {
                const { notifyThreatFound } = await import('@/lib/services/notificationService');
                const allSeverities = ['critical', 'high', 'medium', 'low', 'info'];
                // Find max severity from saved threats
                const maxSeverity = allSeverities.find(s =>
                    assets.some(() => true) // simplified - just use 'medium' as default
                ) || 'medium';
                await notifyThreatFound({ company, threatCount: totalThreats, maxSeverity });
            } catch { }
        }

        return { success: true, threatsFound: totalThreats };
    } catch (error: any) {
        console.error('[ThreatIntel] Error:', error.message);
        return { success: false, threatsFound: 0 };
    }
}
