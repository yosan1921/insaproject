import { exec } from 'child_process';
import { promisify } from 'util';
import dbConnect from '@/lib/mongodb';
import Asset from '@/models/Asset';

const execAsync = promisify(exec);

export interface ScannedAsset {
    ip: string;
    hostname: string;
    openPorts: number[];
    os: string;
    deviceType: 'server' | 'device' | 'software' | 'unknown';
    status: 'active' | 'inactive';
}

function parseNmapOutput(output: string): ScannedAsset[] {
    const assets: ScannedAsset[] = [];
    const hostBlocks = output.split('Nmap scan report for').filter(b => b.trim());

    for (const block of hostBlocks) {
        const lines = block.trim().split('\n');
        const firstLine = lines[0]?.trim() || '';

        const ipMatch = firstLine.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
        const hostnameMatch = firstLine.match(/^([^\s(]+)/);

        const ip = ipMatch?.[1] || '';
        const hostname = hostnameMatch?.[1]?.replace(/[()]/g, '') || ip;

        if (!ip) continue;

        const isUp = block.includes('Host is up') || block.includes('open');
        if (!isUp) continue;

        const openPorts: number[] = [];
        const portLines = block.match(/(\d+)\/tcp\s+open/g) || [];
        for (const pl of portLines) {
            const portNum = parseInt(pl.split('/')[0]);
            if (!isNaN(portNum)) openPorts.push(portNum);
        }

        let os = 'Unknown';
        if (block.includes('Linux')) os = 'Linux';
        else if (block.includes('Windows')) os = 'Windows';
        else if (block.includes('macOS') || block.includes('Darwin')) os = 'macOS';
        else if (block.includes('FreeBSD')) os = 'FreeBSD';

        let deviceType: ScannedAsset['deviceType'] = 'unknown';
        if (openPorts.includes(80) || openPorts.includes(443) || openPorts.includes(8080)) {
            deviceType = 'server';
        } else if (openPorts.includes(22) || openPorts.includes(3389)) {
            deviceType = 'server';
        } else if (openPorts.length > 0) {
            deviceType = 'device';
        }

        assets.push({ ip, hostname, openPorts, os, deviceType, status: 'active' });
    }

    return assets;
}

async function runNmapScan(target: string): Promise<ScannedAsset[]> {
    // Try full Windows path first, then fallback to command name
    const nmapPaths = [
        'C:\\Program Files (x86)\\Nmap\\nmap.exe',
        'C:\\Program Files\\Nmap\\nmap.exe',
        'nmap',
    ];

    for (const nmapCmd of nmapPaths) {
        try {
            const cmd = nmapCmd.includes(' ') ? `"${nmapCmd}"` : nmapCmd;
            const { stdout } = await execAsync(
                `${cmd} -T4 --top-ports 100 -O --osscan-guess ${target}`,
                { timeout: 60000 }
            );
            console.log(`[AssetScanner] nmap succeeded with: ${nmapCmd}`);
            return parseNmapOutput(stdout);
        } catch (err: any) {
            console.warn(`[AssetScanner] Failed with ${nmapCmd}:`, err.message?.substring(0, 80));
            if (nmapCmd === 'nmap') {
                // All paths failed
                return [{
                    ip: target,
                    hostname: target,
                    openPorts: [],
                    os: 'Unknown',
                    deviceType: 'unknown',
                    status: 'active',
                }];
            }
        }
    }

    return [{
        ip: target,
        hostname: target,
        openPorts: [],
        os: 'Unknown',
        deviceType: 'unknown',
        status: 'active',
    }];
}

export async function scanAndSaveAssets(params: {
    questionnaireId: string;
    company: string;
    target: string;
}): Promise<{ success: boolean; assetsFound: number; assets: any[] }> {
    const { questionnaireId, company, target } = params;

    if (!target || !target.trim()) {
        return { success: false, assetsFound: 0, assets: [] };
    }

    try {
        await dbConnect();

        console.log(`[AssetScanner] Starting scan for ${company} → target: ${target}`);
        const scanned = await runNmapScan(target.trim());

        const savedAssets = [];

        for (const asset of scanned) {
            try {
                const saved = await Asset.findOneAndUpdate(
                    { ip: asset.ip, questionnaireId },
                    {
                        questionnaireId,
                        company,
                        ip: asset.ip,
                        hostname: asset.hostname,
                        openPorts: asset.openPorts,
                        os: asset.os,
                        deviceType: asset.deviceType,
                        status: asset.status,
                        scannedAt: new Date(),
                    },
                    { upsert: true, new: true }
                );
                savedAssets.push(saved);
            } catch (e) {
                console.warn(`[AssetScanner] Failed to save asset ${asset.ip}:`, e);
            }
        }

        console.log(`[AssetScanner] Scan complete. Found ${savedAssets.length} assets for ${company}`);
        return { success: true, assetsFound: savedAssets.length, assets: savedAssets };
    } catch (error: any) {
        console.error('[AssetScanner] Scan error:', error.message);
        return { success: false, assetsFound: 0, assets: [] };
    }
}
