import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/threats/test-shodan
 * Test Shodan API connection and CVSS integration
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const shodanKey = process.env.SHODAN_API_KEY;
        const nvdKey = process.env.NVD_API_KEY;

        if (!shodanKey) {
            return NextResponse.json({
                success: false,
                error: 'SHODAN_API_KEY not configured',
            });
        }

        console.log('🧪 [Test] Testing Shodan API...');

        // Test with a known vulnerable IP (Shodan's own server for testing)
        const testIP = '8.8.8.8'; // Google DNS (public, safe to test)

        const response = await fetch(`https://api.shodan.io/shodan/host/${testIP}?key=${shodanKey}`);

        if (!response.ok) {
            return NextResponse.json({
                success: false,
                error: `Shodan API returned ${response.status}`,
                message: response.status === 401 ? 'Invalid API key' : 'API request failed',
            });
        }

        const data = await response.json();
        const vulns = data?.vulns ? Object.keys(data.vulns) : [];

        console.log(`✅ [Test] Shodan API working! Found ${vulns.length} vulnerabilities on ${testIP}`);

        return NextResponse.json({
            success: true,
            message: 'Shodan API is working!',
            testIP,
            vulnerabilitiesFound: vulns.length,
            cveIds: vulns.slice(0, 5),
            nvdConfigured: !!nvdKey,
            ports: data.ports || [],
            org: data.org || 'Unknown',
        });
    } catch (error: any) {
        console.error('❌ [Test] Error:', error.message);
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}
