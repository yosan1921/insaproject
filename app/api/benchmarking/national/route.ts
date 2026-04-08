import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getNationalOverview } from '@/lib/services/benchmarkingService';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const overview = await getNationalOverview();

        return NextResponse.json({
            success: true,
            data: overview
        });
    } catch (error: any) {
        console.error('[Benchmarking API] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch national overview' },
            { status: 500 }
        );
    }
}
