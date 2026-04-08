import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { compareSectors } from '@/lib/services/benchmarkingService';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sectors } = await req.json();

        if (!Array.isArray(sectors) || sectors.length < 2) {
            return NextResponse.json(
                { error: 'Please provide at least 2 sectors to compare' },
                { status: 400 }
            );
        }

        const comparison = await compareSectors(sectors);

        return NextResponse.json({
            success: true,
            data: comparison
        });
    } catch (error: any) {
        console.error('[Benchmarking API] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to compare sectors' },
            { status: 500 }
        );
    }
}
