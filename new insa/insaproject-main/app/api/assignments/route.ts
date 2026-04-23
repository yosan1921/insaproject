import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Assignment from '@/models/Assignment';
import RiskAnalysis from '@/models/RiskAnalysis';
import User from '@/models/User';

// GET: list assignments (for current user or all if Director/Division Head)
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const userId = (session.user as any).id;
        const role = (session.user as any).role;

        let assignments;
        if (role === 'Director' || role === 'Division Head') {
            // See all assignments
            assignments = await Assignment.find({})
                .populate('assignedTo', 'name email role')
                .populate('assignedBy', 'name email')
                .sort({ createdAt: -1 })
                .lean();
        } else {
            // Staff/Risk Analyst: only see their own assignments
            assignments = await Assignment.find({ assignedTo: userId })
                .populate('assignedBy', 'name email')
                .sort({ createdAt: -1 })
                .lean();
        }

        return NextResponse.json({ success: true, assignments });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: assign analysis to staff (Director/Division Head only)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = (session.user as any).role;
        if (role !== 'Director' && role !== 'Division Head') {
            return NextResponse.json({ error: 'Only Director or Division Head can assign analyses' }, { status: 403 });
        }

        const { analysisId, assignedTo, note } = await req.json();

        if (!analysisId || !assignedTo) {
            return NextResponse.json({ error: 'analysisId and assignedTo are required' }, { status: 400 });
        }

        await dbConnect();

        // Verify analysis exists
        const analysis = await RiskAnalysis.findById(analysisId).select('company').lean();
        if (!analysis) {
            return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
        }

        // Verify target user exists
        const targetUser = await User.findById(assignedTo).select('name email role').lean();
        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if already assigned
        const existing = await Assignment.findOne({ analysisId, assignedTo });
        if (existing) {
            return NextResponse.json({ error: 'Already assigned to this user' }, { status: 400 });
        }

        const assignment = await Assignment.create({
            analysisId,
            assignedTo,
            assignedBy: (session.user as any).id,
            company: (analysis as any).company,
            note: note || '',
        });

        return NextResponse.json({ success: true, assignment });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: remove assignment
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = (session.user as any).role;
        if (role !== 'Director' && role !== 'Division Head') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const assignmentId = searchParams.get('id');
        if (!assignmentId) {
            return NextResponse.json({ error: 'Missing assignment id' }, { status: 400 });
        }

        await dbConnect();
        await Assignment.findByIdAndDelete(assignmentId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
