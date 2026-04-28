import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculateCVSSScore, parseCVSSVector } from '@/lib/services/cvssService';

/**
 * POST /api/analysis/cvss-calculate
 * Calculate CVSS score from metrics or parse vector string
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { metrics, vectorString } = body;

        // If vector string is provided, parse it first
        if (vectorString) {
            const parsedMetrics = parseCVSSVector(vectorString);
            if (!parsedMetrics) {
                return NextResponse.json(
                    { error: 'Invalid CVSS vector string format' },
                    { status: 400 }
                );
            }

            const result = calculateCVSSScore(parsedMetrics);
            return NextResponse.json({
                success: true,
                metrics: parsedMetrics,
                ...result
            });
        }

        // Otherwise, calculate from provided metrics
        if (!metrics) {
            return NextResponse.json(
                { error: 'Either metrics or vectorString is required' },
                { status: 400 }
            );
        }

        // Validate required metrics
        const requiredFields = [
            'attackVector',
            'attackComplexity',
            'privilegesRequired',
            'userInteraction',
            'scope',
            'confidentiality',
            'integrity',
            'availability'
        ];

        const missingFields = requiredFields.filter(field => !metrics[field]);
        if (missingFields.length > 0) {
            return NextResponse.json(
                {
                    error: 'Missing required CVSS metrics',
                    missingFields
                },
                { status: 400 }
            );
        }

        const result = calculateCVSSScore(metrics);

        return NextResponse.json({
            success: true,
            metrics,
            ...result
        });

    } catch (error: any) {
        console.error('❌ CVSS calculation error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
