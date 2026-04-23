import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import HumanAwarenessReport from '@/models/HumanAwarenessReport';
import Notification from '@/models/Notification';
import { initializeAI } from '@/lib/utils/ai';

// ─── System prompt ────────────────────────────────────────────────────────────
const HA_SYSTEM_PROMPT = `You are a Cyber-Psychology Expert and Corporate Security Trainer producing a HUMAN AWARENESS SECURITY REPORT.
Your audience varies by report type:
- SPECIFIC report: HR Managers, Department Heads, and Team Leads of a named company.
- GENERAL report: All staff members across the organization.

GOLDEN RULES — NEVER BREAK THESE:
1. NEVER shame or name individual employees. Focus on departments, roles, or behavioral patterns only.
2. PRIORITIZE the Reporting Rate over the Click Rate. A team that reports phishing is more valuable than one that never clicks.
3. Use ACTIONABLE PSYCHOLOGY — explain WHY people fell for attacks (e.g., "The 'Urgent Payroll' hook exploited financial anxiety").
4. JARGON-FREE — write for HR and Department Heads, not security engineers.
5. ENCOURAGING YET FIRM — celebrate progress, but be clear about risks.
6. Identify which psychological HOOKS are working on employees: Urgency, Authority, Fear, Greed, Curiosity.

MANDATORY SECTIONS — OUTPUT EXACTLY IN THIS ORDER:

━━━ I. CULTURE SNAPSHOT ━━━
Awareness Score: [Single letter grade A–F with one-sentence justification]
Participation Rate: [X%] — [What this means for the organization's security culture]
Overall Posture: [2–3 sentences describing the human firewall's current strength as a narrative, not a list]

━━━ II. PHISHING SIMULATION PERFORMANCE ━━━
Clickers vs. Reporters: [Narrative breakdown — prioritize the Reporters metric]
Psychological Hook Analysis: Identify which hooks (Urgency / Authority / Fear / Greed / Curiosity) were most effective and WHY they worked on this workforce.
High-Risk Groups: [Which departments or roles are most targeted or most vulnerable — never name individuals]
Resilience Score: [How quickly does the average employee recognize a threat? Fast / Moderate / Slow with explanation]

━━━ III. TRAINING PROGRESS ━━━
Completion Status: [Who is behind — by department/role, never by name]
Knowledge Gaps: [What topics employees are still confused about — e.g., "Password hygiene shows 40% quiz failure rate"]
Positive Highlights: [What the organization is doing well — always include at least one win]

━━━ IV. BEHAVIORAL RECOMMENDATIONS ━━━
Targeted Interventions: [Specific 15–30 minute training recommendations per high-risk department]
Nudge Strategies: [3–5 short tips suitable for a company Slack/Teams channel — practical, non-scary]
The Safety Net: [Describe a clear, non-scary process for employees to report their own mistakes — make it feel safe]
30-Day Action Plan: [3 specific, measurable actions the security team should take in the next 30 days]

FORMAT: Use the section headers exactly as shown. Write in paragraphs for narrative sections. Use bullet points only for lists. Encouraging tone throughout — this report should motivate, not demoralize.`;

function buildHAPrompt(data: {
  company: string;
  period: string;
  periodLabel: string;
  reportType: string;
  participationRate: number;
  phishingClickRate: number;
  phishingReportRate: number;
  trainingCompletion: number;
  highRiskDepartments: string[];
  additionalContext?: string;
}): string {
  const {
    company, period, periodLabel, reportType,
    participationRate, phishingClickRate, phishingReportRate,
    trainingCompletion, highRiskDepartments, additionalContext,
  } = data;

  const grade =
    phishingReportRate >= 70 && trainingCompletion >= 85 ? 'A' :
    phishingReportRate >= 55 && trainingCompletion >= 70 ? 'B' :
    phishingReportRate >= 40 && trainingCompletion >= 55 ? 'C' :
    phishingReportRate >= 25 && trainingCompletion >= 40 ? 'D' : 'F';

  return `Generate a ${reportType.toUpperCase()} HUMAN AWARENESS SECURITY REPORT.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ORGANIZATION PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Company: ${company}
Report Type: ${reportType === 'specific' ? 'Specific (Company-Focused)' : 'General (All Staff)'}
Period: ${periodLabel} (${period})
Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BEHAVIORAL METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Staff Participation Rate:       ${participationRate}%
Phishing Simulation Click Rate: ${phishingClickRate}%
Phishing Reporting Rate:        ${phishingReportRate}%  ← PRIORITIZE THIS METRIC
Training Completion Rate:       ${trainingCompletion}%
Calculated Culture Grade:       ${grade}
High-Risk Departments:          ${highRiskDepartments.length > 0 ? highRiskDepartments.join(', ') : 'None identified'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADDITIONAL CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${additionalContext || 'No additional context provided. Use industry benchmarks for the ' + company + ' sector.'}

Now generate the complete HUMAN AWARENESS REPORT following your system instructions exactly.
Remember: encouraging tone, no individual shaming, prioritize the Reporting Rate.`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      company, reportType, period, periodLabel,
      participationRate = 0, phishingClickRate = 0,
      phishingReportRate = 0, trainingCompletion = 0,
      highRiskDepartments = [], additionalContext = '',
    } = body;

    if (!company || !reportType || !period || !periodLabel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'AI API key not configured' }, { status: 500 });

    await dbConnect();

    // Generate AI content
    const openRouter = initializeAI(apiKey);
    const userPrompt = buildHAPrompt({
      company, period, periodLabel, reportType,
      participationRate, phishingClickRate, phishingReportRate,
      trainingCompletion, highRiskDepartments, additionalContext,
    });

    const completion = await (openRouter.chat as any).send({
      model: 'openai/gpt-4o',
      messages: [
        { role: 'system', content: HA_SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 3000,
    });

    const anyC: any = completion;
    const raw = anyC?.choices?.[0]?.message?.content ?? anyC?.choice?.message?.content ?? '';
    const content = typeof raw === 'string' ? raw : String(raw || '');

    // Calculate grade
    const grade =
      phishingReportRate >= 70 && trainingCompletion >= 85 ? 'A' :
      phishingReportRate >= 55 && trainingCompletion >= 70 ? 'B' :
      phishingReportRate >= 40 && trainingCompletion >= 55 ? 'C' :
      phishingReportRate >= 25 && trainingCompletion >= 40 ? 'D' : 'F';

    // Save report
    const report = await HumanAwarenessReport.create({
      company, reportType, period, periodLabel, content,
      cultureScore: grade,
      participationRate, phishingClickRate, phishingReportRate,
      trainingCompletion, highRiskDepartments,
      generatedAt: new Date(),
      notificationSent: false,
    });

    // Broadcast notification to ALL users (role-unbiased)
    const periodName = period === 'monthly' ? 'Monthly' : period === '6-month' ? '6-Month' : 'Annual';
    await Notification.create({
      type: 'analysis',
      severity: grade === 'A' || grade === 'B' ? 'info' : grade === 'C' ? 'medium' : 'high',
      title: `${periodName} Human Awareness Report — ${company}`,
      message: `The ${periodLabel} Human Awareness Report for ${company} has been published. Culture Score: ${grade}. Participation: ${participationRate}%. Click to review behavioral insights and recommendations.`,
      link: `/human-awareness?id=${report._id}`,
      readBy: [],
    });

    // Mark notification sent
    await HumanAwarenessReport.findByIdAndUpdate(report._id, { notificationSent: true });

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error('[HA Generate]', error);
    return NextResponse.json({ error: error.message || 'Failed to generate report' }, { status: 500 });
  }
}
