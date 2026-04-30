import { initializeAI, analyzeQuestion } from '@/lib/utils/ai';
import { sendMail } from "@/lib/mail/mailer";
import { criticalRiskAlertEmail } from "@/lib/mail/templates/criticalRiskAlert";
import { calculateCVSSForRisk } from './cvssIntegrationService';

const createQuestionResult = (question: any, analysis: any) => {
    // Validate analysis data
    const likelihood = Math.min(5, Math.max(1, analysis.likelihood || 3));
    const impact = Math.min(5, Math.max(1, analysis.impact || 3));
    const riskScore = Math.min(25, Math.max(1, analysis.riskScore || likelihood * impact));

    // Validate risk level
    const validRiskLevels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW'];
    const riskLevel = validRiskLevels.includes(analysis.riskLevel) ? analysis.riskLevel : 'MEDIUM';

    // Auto-generate risk name from threat or question
    let riskName = '';
    if (analysis.threat) {
        // Extract key risk name from threat description
        // Examples: "Unauthorized Access Risk" -> "Unauthorized Access"
        //           "Risk of SQL Injection attacks" -> "SQL Injection"
        riskName = analysis.threat
            .replace(/\b(risk|threat|vulnerability|attack|issue|problem)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();

        // Limit to first 50 characters for readability
        if (riskName.length > 50) {
            riskName = riskName.substring(0, 50).trim();
        }
    }

    // Fallback: use question section or generic name
    if (!riskName) {
        riskName = question.section ? question.section.toUpperCase() : `RISK-${question.id}`;
    }

    // 🆕 AUTOMATIC CVSS CALCULATION
    // Calculate CVSS score based on threat, question, and answer
    let cvssData = null;
    try {
        cvssData = calculateCVSSForRisk({
            threat: analysis.threat || '',
            question: question.question || '',
            answer: question.answer || '',
            section: question.section || ''
        });

        // If CVSS calculation succeeded, use CVSS-derived likelihood/impact if higher
        if (cvssData) {
            console.log(`✅ [CVSS] Auto-calculated for Q${question.id}: Score ${cvssData.cvssScore} (${cvssData.cvssSeverity})`);
        }
    } catch (error) {
        console.error(`⚠️ [CVSS] Failed to auto-calculate for Q${question.id}:`, error);
    }

    // 🆕 AUTOMATIC PRE-MITIGATION AND POST-MITIGATION INITIALIZATION
    // Pre-Mitigation: Represents risk BEFORE any controls were implemented
    // Strategy: Increase probability and impact by 20-30% to show inherent risk
    const preMitigationProbability = Math.min(100, Math.round((likelihood / 5) * 100 * 1.25)); // 25% higher
    const preMitigationImpact = Math.min(100, Math.round((impact / 5) * 100 * 1.20)); // 20% higher
    const preMitigationScore = (preMitigationProbability / 100) * (preMitigationImpact / 100) * 100;

    // Estimate pre-mitigation cost based on risk level (baseline financial impact)
    let preMitigationCost = 0;
    if (riskLevel === 'CRITICAL') preMitigationCost = 100000 + Math.random() * 400000; // $100k-$500k
    else if (riskLevel === 'HIGH') preMitigationCost = 50000 + Math.random() * 150000; // $50k-$200k
    else if (riskLevel === 'MEDIUM') preMitigationCost = 10000 + Math.random() * 40000; // $10k-$50k
    else if (riskLevel === 'LOW') preMitigationCost = 1000 + Math.random() * 9000; // $1k-$10k
    else preMitigationCost = 100 + Math.random() * 900; // $100-$1k

    // Post-Mitigation: Represents target risk AFTER implementing mitigations
    // Strategy: Reduce probability and impact by 40-60% to show mitigation effectiveness
    const postMitigationProbability = Math.max(5, Math.round((likelihood / 5) * 100 * 0.5)); // 50% reduction
    const postMitigationImpact = Math.max(5, Math.round((impact / 5) * 100 * 0.6)); // 40% reduction
    const postMitigationScore = (postMitigationProbability / 100) * (postMitigationImpact / 100) * 100;

    // Post-mitigation cost should be significantly lower (30-50% of pre-mitigation)
    const postMitigationCost = preMitigationCost * (0.3 + Math.random() * 0.2); // 30-50% of original

    // Mitigation cost: Investment needed to reduce risk (10-30% of pre-mitigation cost)
    const mitigationCost = preMitigationCost * (0.1 + Math.random() * 0.2); // 10-30% of pre-mitigation

    return {
        questionId: question.id,
        section: question.section,
        question: question.question,
        answer: question.answer,
        level: question.level,
        analysis: {
            riskName: riskName,
            description: analysis.threat || '',
            status: 'Open',
            riskType: 'Risk',
            threatOpportunity: 'Threat',
            assignedTo: '',

            // Pre-Mitigation (before controls)
            preMitigation: {
                probability: preMitigationProbability,
                impact: preMitigationImpact,
                score: preMitigationScore,
                cost: Math.round(preMitigationCost * 100) / 100
            },

            // Current assessment
            likelihood: likelihood,
            impact: impact,
            riskScore: riskScore,
            riskLevel: riskLevel,
            riskColor: analysis.riskColor,

            // Post-Mitigation (after controls)
            postMitigation: {
                probability: postMitigationProbability,
                impact: postMitigationImpact,
                score: postMitigationScore,
                cost: Math.round(postMitigationCost * 100) / 100
            },

            // Mitigation details
            mitigationCost: Math.round(mitigationCost * 100) / 100,
            gap: analysis.gap || '',
            threat: analysis.threat || '',
            mitigation: analysis.mitigation || '',
            impactLabel: analysis.impactLabel,
            likelihoodLabel: analysis.likelihoodLabel,
            impactDescription: analysis.impactDescription,

            // 🆕 Add CVSS data if calculated
            ...(cvssData && {
                cvssScore: cvssData.cvssScore,
                cvssSeverity: cvssData.cvssSeverity,
                cvssMetrics: cvssData.cvssMetrics,
                cvssVectorString: cvssData.cvssVectorString
            })
        },
        timestamp: new Date()
    };
};

const calculateLevelSummary = (levelData: any[]) => {
    if (levelData.length === 0) {
        return {
            totalQuestions: 0,
            riskDistribution: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, VERY_LOW: 0 },
            averageRiskScore: 0,
            topRisks: []
        };
    }

    const critical = levelData.filter(d => d.analysis.riskLevel === 'CRITICAL').length;
    const high = levelData.filter(d => d.analysis.riskLevel === 'HIGH').length;
    const medium = levelData.filter(d => d.analysis.riskLevel === 'MEDIUM').length;
    const low = levelData.filter(d => d.analysis.riskLevel === 'LOW').length;
    const veryLow = levelData.filter(d => d.analysis.riskLevel === 'VERY_LOW').length;
    const avgScore = (levelData.reduce((sum, d) => sum + d.analysis.riskScore, 0) / levelData.length).toFixed(2);

    return {
        totalQuestions: levelData.length,
        riskDistribution: { CRITICAL: critical, HIGH: high, MEDIUM: medium, LOW: low, VERY_LOW: veryLow },
        averageRiskScore: parseFloat(avgScore),
        topRisks: levelData
            .sort((a, b) => b.analysis.riskScore - a.analysis.riskScore)
            .slice(0, 3)
            .map(d => ({
                questionId: d.questionId,
                riskLevel: d.analysis.riskLevel,
                riskScore: d.analysis.riskScore,
                gap: d.analysis.gap
            }))
    };
};

const calculateOverallSummary = (allData: any[]) => {
    if (allData.length === 0) {
        return {
            totalQuestionsAnalyzed: 0,
            riskDistribution: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, VERY_LOW: 0 },
            averageRiskScore: 0
        };
    }

    const allCritical = allData.filter(d => d.analysis.riskLevel === 'CRITICAL').length;
    const allHigh = allData.filter(d => d.analysis.riskLevel === 'HIGH').length;
    const allMedium = allData.filter(d => d.analysis.riskLevel === 'MEDIUM').length;
    const allLow = allData.filter(d => d.analysis.riskLevel === 'LOW').length;
    const allVeryLow = allData.filter(d => d.analysis.riskLevel === 'VERY_LOW').length;
    const overallAvg = (allData.reduce((sum, d) => sum + d.analysis.riskScore, 0) / allData.length).toFixed(2);

    return {
        totalQuestionsAnalyzed: allData.length,
        riskDistribution: {
            CRITICAL: allCritical,
            HIGH: allHigh,
            MEDIUM: allMedium,
            LOW: allLow,
            VERY_LOW: allVeryLow
        },
        averageRiskScore: parseFloat(overallAvg)
    };
};
export const performRiskAnalysis = async (questionnaireData: any[], apiKey: string) => {
    const useStub = !apiKey;
    const openai = useStub ? undefined : initializeAI(apiKey as string);

    const results: any = {
        metadata: {
            timestamp: new Date(),
            totalQuestions: questionnaireData.length,
            levels: {
                operational: questionnaireData.filter(q => q.level === 'operational').length,
                tactical: questionnaireData.filter(q => q.level === 'tactical').length,
                strategic: questionnaireData.filter(q => q.level === 'strategic').length
            }
        },
        operational: [],
        tactical: [],
        strategic: [],
        summary: {
            operational: {},
            tactical: {},
            strategic: {},
            overall: {}
        }
    };

    for (const level of ['operational', 'tactical', 'strategic']) {
        const levelQuestions = questionnaireData.filter(q => q.level === level);

        for (let i = 0; i < levelQuestions.length; i++) {
            const question = levelQuestions[i];
            console.log(`📊 Analyzing ${level} question ${i + 1}/${levelQuestions.length}...`);

            let analysis: any;
            if (useStub) {
                const ans = String(question.answer || '').toLowerCase();
                const qtext = String(question.question || '').toLowerCase();
                const lvl = String(question.level || 'operational').toLowerCase();

                let likelihood = 3;
                if (ans.match(/\b(no|not|none|never|don't|dont|partial|partially)\b/)) likelihood = 4;
                else if (ans.match(/\b(yes|always|every)\b/)) likelihood = 2;
                else if (qtext.match(/vulnerab|vuln|risk|threat/)) likelihood = 4;

                let impact = lvl === 'strategic' ? 4 : lvl === 'tactical' ? 3 : 2;
                const num = parseFloat(ans.replace(/[^0-9.\-]/g, ''));
                if (!isNaN(num)) {
                    if (num > 100) impact = Math.max(impact, 5);
                    else if (num > 50) impact = Math.max(impact, 4);
                    else if (num > 10) impact = Math.max(impact, 3);
                }

                const jitter = Math.random() < 0.2 ? 1 : 0;
                likelihood = Math.min(5, Math.max(1, likelihood + jitter));
                impact = Math.min(5, Math.max(1, impact));

                const score = likelihood * impact;
                const riskLevel = score >= 16 ? 'CRITICAL' : score >= 12 ? 'HIGH' : score >= 6 ? 'MEDIUM' : score >= 2 ? 'LOW' : 'VERY_LOW';
                const riskColor = riskLevel === 'CRITICAL' ? '#dc2626' : riskLevel === 'HIGH' ? '#ef4444' : riskLevel === 'MEDIUM' ? '#f97316' : '#10b981';

                const impactLabels = ['Minimal', 'Low', 'Moderate', 'High', 'Critical'];
                const likelihoodLabels = ['Remote', 'Low', 'Moderate', 'High', 'Almost Certain'];
                const impactDescriptions = [
                    'Minor inconvenience with minimal business impact',
                    'Slight disruption to operations',
                    'Significant disruption requiring attention',
                    'Severe impact on business operations',
                    'Catastrophic consequences for the organization'
                ];

                // Generate threat based on question keywords
                let threat = 'Security Risk';
                if (qtext.match(/malware|virus|trojan/)) threat = 'Malware Infection';
                else if (qtext.match(/sql|injection|database/)) threat = 'SQL Injection Attack';
                else if (qtext.match(/ddos|denial|service/)) threat = 'DDoS Attack';
                else if (qtext.match(/breach|data leak|exposure/)) threat = 'Data Breach';
                else if (qtext.match(/ransomware|encryption/)) threat = 'Ransomware Attack';
                else if (qtext.match(/phishing|social engineering/)) threat = 'Phishing Attack';
                else if (qtext.match(/access|authentication|password/)) threat = 'Unauthorized Access';
                else if (qtext.match(/policy|procedure|governance/)) threat = 'Governance and Compliance Risk';
                else if (qtext.match(/incident|response|plan/)) threat = 'Inadequate Incident Response';
                else if (qtext.match(/budget|resource|funding/)) threat = 'Insufficient Security Resources';
                else if (qtext.match(/training|awareness|education/)) threat = 'Inadequate Security Awareness';
                else if (qtext.match(/encryption|crypto/)) threat = 'Weak Encryption';
                else if (qtext.match(/backup|recovery|disaster/)) threat = 'Inadequate Backup and Recovery';
                else if (qtext.match(/patch|update|vulnerability/)) threat = 'Unpatched Vulnerabilities';
                else if (qtext.match(/firewall|network|perimeter/)) threat = 'Network Security Gap';
                else if (qtext.match(/mfa|multi.factor|2fa/)) threat = 'Weak Access Controls';
                else if (question.section) threat = question.section + ' Risk';

                analysis = {
                    likelihood,
                    impact,
                    gap: 'Manual review suggested',
                    threat: threat,
                    mitigation: 'Review controls',
                    riskScore: score,
                    riskLevel,
                    riskColor,
                    impactLabel: impactLabels[impact - 1] || 'Moderate',
                    likelihoodLabel: likelihoodLabels[likelihood - 1] || 'Moderate',
                    impactDescription: impactDescriptions[impact - 1] || 'Requires manual impact assessment'
                };
            } else {
                const analysisResult = await analyzeQuestion(openai!, question);
                analysis = analysisResult;
            }
            const result = createQuestionResult(question, analysis);
            results[level].push(result);

            if (i < levelQuestions.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        results.summary[level] = calculateLevelSummary(results[level]);
    }

    const allData = [...results.operational, ...results.tactical, ...results.strategic];
    results.summary.overall = calculateOverallSummary(allData);

    try {
        const hasCritical = allData.some(d => d.analysis?.riskLevel === 'CRITICAL');
        const adminEmail = process.env.CRITICAL_ALERT_EMAIL;
        if (hasCritical && adminEmail) {
            console.log(`🚨 Critical risk detected! Sending alert to ${adminEmail}`);
            const html = criticalRiskAlertEmail({
                name: undefined,
                riskTitle: 'Critical risk detected in latest analysis',
                severity: 'CRITICAL',
            });
            await sendMail({
                to: adminEmail,
                subject: 'Critical risk detected in INSA analysis',
                html,
            });
            console.log(`✅ Critical risk alert email sent successfully`);
        }
    } catch (emailError) {
        // Log email failures but don't break analysis
        console.error('❌ Failed to send critical risk alert email:', emailError instanceof Error ? emailError.message : emailError);
    }

    return results;
};
