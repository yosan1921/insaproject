import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSectorDetails } from '@/lib/services/benchmarkingService';

export async function GET(
    _req: Request,
    { params }: { params: { name: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user has permission to see real organization names
        // Only Directors and Division Heads can see real names
        const userRole = (session.user as any)?.role;
        const showRealNames = userRole === 'Director' || userRole === 'Division Head';

        const sectorName = decodeURIComponent(params.name);
        const details = await getSectorDetails(sectorName, showRealNames);

        return NextResponse.json({
            success: true,
            data: details
        });
    } catch (error: any) {
        console.error('[Benchmarking API] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch sector details' },
            { status: 500 }
        );
    }
}
