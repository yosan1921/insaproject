import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Asset from '@/models/Asset';
import ThreatIntelligence from '@/models/ThreatIntelligence';
import Questionnaire from '@/models/Questionnaire';
import { scanAndSaveAssets } from '@/lib/services/assetScanner';
import { fetchAndSaveThreats } from '@/lib/services/threatIntelService';

export async function GET(_req: Request, { params }: { params: { questionnaireId: string } }) {
    try {
        await dbConnect();
        const assets = await Asset.find({ questionnaireId: params.questionnaireId })
            .sort({ scannedAt: -1 })
            .lean();
        return NextResponse.json({ success: true, assets });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PATCH: update domain/ip and auto-trigger scan
export async function PATCH(req: Request, { params }: { params: { questionnaireId: string } }) {
    try {
        await dbConnect();
        const { companyDomain, companyIp } = await req.json();

        const questionnaire = await Questionnaire.findById(params.questionnaireId);
        if (!questionnaire) {
            return NextResponse.json({ success: false, error: 'Questionnaire not found' }, { status: 404 });
        }

        // Save domain/ip to questionnaire
        if (companyDomain !== undefined) questionnaire.companyDomain = companyDomain;
        if (companyIp !== undefined) questionnaire.companyIp = companyIp;
        await questionnaire.save();

        const target = companyDomain || companyIp;
        if (!target) {
            return NextResponse.json({ success: false, error: 'No domain or IP provided' }, { status: 400 });
        }

        // Auto-trigger scan (non-blocking response, scan runs async)
        (async () => {
            try {
                const scanResult = await scanAndSaveAssets({
                    questionnaireId: String(questionnaire._id),
                    company: questionnaire.company,
                    target,
                });

                if (scanResult.success && scanResult.assetsFound > 0) {
                    await fetchAndSaveThreats({
                        questionnaireId: String(questionnaire._id),
                        company: questionnaire.company,
                    });
                    // Notify asset scan completion
                    try {
                        const { notifyAssetScan } = await import('@/lib/services/notificationService');
                        await notifyAssetScan({
                            company: questionnaire.company,
                            assetsFound: scanResult.assetsFound,
                        });
                    } catch { }
                }
            } catch (e) {
                console.error('[AssetScan] Background scan failed:', e);
            }
        })();

        return NextResponse.json({
            success: true,
            message: 'Domain/IP saved. Asset scan started in background.',
            companyDomain: questionnaire.companyDomain,
            companyIp: questionnaire.companyIp,
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
