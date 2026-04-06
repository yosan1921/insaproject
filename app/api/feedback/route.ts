import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Feedback from '@/models/Feedback';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const {
            name, email, rating, category, categoryOther,
            detailedFeedback, issuesEncountered, suggestions, wouldRecommend
        } = body;

        if (!rating || !category || !detailedFeedback || !wouldRecommend) {
            return NextResponse.json({ error: 'Rating, category, feedback and recommendation are required' }, { status: 400 });
        }

        await dbConnect();

        const feedback = await Feedback.create({
            userId: (session.user as any).id,
            userName: session.user.name || session.user.email || 'Anonymous',
            name: name || '',
            email: email || '',
            rating,
            category,
            categoryOther: categoryOther || '',
            detailedFeedback,
            issuesEncountered: issuesEncountered || '',
            suggestions: suggestions || '',
            wouldRecommend,
        });

        return NextResponse.json({ success: true, feedback });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const feedbacks = await Feedback.find({}).sort({ createdAt: -1 }).limit(50).lean();
        return NextResponse.json({ success: true, feedbacks });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
