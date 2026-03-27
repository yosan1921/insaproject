import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Questionnaire from '@/models/Questionnaire';

export async function POST(req: NextRequest) {
    try {
        // Verify webhook secret
        const secret = req.headers.get('x-webhook-secret');
        if (secret !== process.env.WEBHOOK_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        await dbConnect();

        // Handle both single submission and batch
        const submissions = body.submissions ? body.submissions : [body];

        const results = [];

        for (const sub of submissions) {
            const externalId = String(sub.submissionId);

            // Skip if already received
            const existing = await Questionnaire.findOne({ externalId });
            if (existing) {
                results.push({ externalId, status: 'skipped', reason: 'already exists' });
                continue;
            }

            // Map Platform 1 data to Platform 2 Questionnaire model
            const questions = (sub.assessmentData || []).map((item: any, idx: number) => ({
                id: idx + 1,
                question: item.questionText || '',
                answer: item.response || '',
                section: item.section || 'General',
                level: inferLevel(item.section || ''),
            }));

            const inferCategory = (qs: { level: string }[]) => {
                const counts: Record<string, number> = { operational: 0, tactical: 0, strategic: 0 };
                for (const q of qs) counts[q.level] = (counts[q.level] || 0) + 1;
                return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'operational';
            };

            // Parse DD/MM/YYYY format from Platform 1
            const parseDate = (dateStr: string): Date => {
                if (!dateStr) return new Date();
                // Handle DD/MM/YYYY format
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    const [day, month, year] = parts;
                    const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                    if (!isNaN(parsed.getTime())) return parsed;
                }
                // Fallback
                const fallback = new Date(dateStr);
                return isNaN(fallback.getTime()) ? new Date() : fallback;
            };

            const questionnaire = await Questionnaire.create({
                externalId,
                title: `Cyber Security Assessment - ${sub.organization}`,
                company: sub.organization || 'Unknown',
                filledBy: sub.interviewer || 'Unknown',
                role: sub.personnel?.[0]?.role || 'Not Specified',
                filledDate: parseDate(sub.evaluationDate),
                category: inferCategory(questions),
                status: 'pending',
                questions,
            });

            results.push({ externalId, status: 'created', id: questionnaire._id });
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error('Webhook receive error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function inferLevel(section: string): 'operational' | 'tactical' | 'strategic' {
    const s = section.toLowerCase();
    if (s.includes('strateg') || s.includes('governance') || s.includes('policy')) return 'strategic';
    if (s.includes('tactic') || s.includes('management') || s.includes('risk')) return 'tactical';
    return 'operational';
}
