/**
 * Asset-Risk Relationship Analysis Script
 * Analyzes existing Risk Register data to identify relationships between assets and risks
 */

import mongoose from 'mongoose';
import Asset from '../models/Asset';
import RiskAnalysis from '../models/RiskAnalysis';
import ThreatIntelligence from '../models/ThreatIntelligence';

interface AnalysisReport {
    summary: {
        totalAssets: number;
        totalRisks: number;
        totalThreats: number;
        assetsWithThreats: number;
        risksWithAssetValue: number;
    };
    assetBreakdown: {
        byType: Record<string, number>;
        byStatus: Record<string, number>;
    };
    riskBreakdown: {
        byLevel: Record<string, number>;
        bySection: Record<string, number>;
        withCVSS: number;
        withALE: number;
    };
    assetThreatMapping: Array<{
        assetId: string;
        ip: string;
        hostname: string;
        deviceType: string;
        threatCount: number;
        threats: Array<{
            source: string;
            severity: string;
            threatType: string;
            cvssScore?: number;
        }>;
    }>;
    riskAssetValueMapping: Array<{
        riskRegisterId: string;
        company: string;
        questionId: number;
        riskName: string;
        riskLevel: string;
        assetValue?: number;
        sle?: number;
        ale?: number;
        cvssScore?: number;
    }>;
    gaps: {
        assetsWithoutThreats: number;
        risksWithoutAssetValue: number;
        risksWithoutCVSS: number;
        noDirectAssetRiskLink: boolean;
    };
}

async function analyzeAssetRiskMapping(): Promise<AnalysisReport> {
    try {
        // Connect to MongoDB
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found in environment');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Fetch all data
        const assets = await Asset.find({}).lean();
        const riskAnalyses = await RiskAnalysis.find({}).lean();
        const threats = await ThreatIntelligence.find({}).lean();

        console.log(`\n📊 Data Summary:`);
        console.log(`   Assets: ${assets.length}`);
        console.log(`   Risk Analyses: ${riskAnalyses.length}`);
        console.log(`   Threats: ${threats.length}`);

        // Asset breakdown
        const assetsByType: Record<string, number> = {};
        const assetsByStatus: Record<string, number> = {};
        assets.forEach(asset => {
            assetsByType[asset.deviceType] = (assetsByType[asset.deviceType] || 0) + 1;
            assetsByStatus[asset.status] = (assetsByStatus[asset.status] || 0) + 1;
        });

        // Risk breakdown
        const risksByLevel: Record<string, number> = {};
        const risksBySection: Record<string, number> = {};
        let risksWithCVSS = 0;
        let risksWithALE = 0;
        let risksWithAssetValue = 0;

        const allRisks: any[] = [];
        riskAnalyses.forEach(analysis => {
            ['operational', 'tactical', 'strategic'].forEach(section => {
                const questions = (analysis as any)[section] || [];
                questions.forEach((q: any) => {
                    allRisks.push({
                        riskRegisterId: analysis.riskRegisterId,
                        company: analysis.company,
                        section,
                        ...q
                    });

                    const level = q.analysis?.riskLevel || 'UNKNOWN';
                    risksByLevel[level] = (risksByLevel[level] || 0) + 1;
                    risksBySection[section] = (risksBySection[section] || 0) + 1;

                    if (q.analysis?.cvssScore) risksWithCVSS++;
                    if (q.analysis?.ale) risksWithALE++;
                    if (q.analysis?.assetValue) risksWithAssetValue++;
                });
            });
        });

        // Asset-Threat mapping
        const assetThreatMap = new Map<string, any[]>();
        threats.forEach(threat => {
            const assetId = threat.assetId.toString();
            if (!assetThreatMap.has(assetId)) {
                assetThreatMap.set(assetId, []);
            }
            assetThreatMap.get(assetId)!.push(threat);
        });

        const assetThreatMapping = assets
            .filter(asset => assetThreatMap.has(asset._id.toString()))
            .map(asset => {
                const assetThreats = assetThreatMap.get(asset._id.toString()) || [];
                return {
                    assetId: asset._id.toString(),
                    ip: asset.ip,
                    hostname: asset.hostname,
                    deviceType: asset.deviceType,
                    threatCount: assetThreats.length,
                    threats: assetThreats.map(t => ({
                        source: t.source,
                        severity: t.severity,
                        threatType: t.threatType,
                        cvssScore: t.cvssScore
                    }))
                };
            });

        // Risk-AssetValue mapping
        const riskAssetValueMapping = allRisks
            .filter(r => r.analysis?.assetValue || r.analysis?.cvssScore)
            .map(r => ({
                riskRegisterId: r.riskRegisterId,
                company: r.company,
                questionId: r.questionId,
                riskName: r.analysis?.riskName || r.question?.substring(0, 50),
                riskLevel: r.analysis?.riskLevel,
                assetValue: r.analysis?.assetValue,
                sle: r.analysis?.sle,
                ale: r.analysis?.ale,
                cvssScore: r.analysis?.cvssScore
            }));

        // Calculate gaps
        const assetsWithoutThreats = assets.length - assetThreatMapping.length;
        const risksWithoutAssetValue = allRisks.length - risksWithAssetValue;
        const risksWithoutCVSS = allRisks.length - risksWithCVSS;

        const report: AnalysisReport = {
            summary: {
                totalAssets: assets.length,
                totalRisks: allRisks.length,
                totalThreats: threats.length,
                assetsWithThreats: assetThreatMapping.length,
                risksWithAssetValue
            },
            assetBreakdown: {
                byType: assetsByType,
                byStatus: assetsByStatus
            },
            riskBreakdown: {
                byLevel: risksByLevel,
                bySection: risksBySection,
                withCVSS: risksWithCVSS,
                withALE: risksWithALE
            },
            assetThreatMapping,
            riskAssetValueMapping,
            gaps: {
                assetsWithoutThreats,
                risksWithoutAssetValue,
                risksWithoutCVSS,
                noDirectAssetRiskLink: true // Architectural finding
            }
        };

        return report;
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

// Run analysis
analyzeAssetRiskMapping()
    .then(report => {
        console.log('\n' + '='.repeat(80));
        console.log('ASSET-RISK RELATIONSHIP ANALYSIS REPORT');
        console.log('='.repeat(80));

        console.log('\n📊 SUMMARY');
        console.log(`   Total Assets: ${report.summary.totalAssets}`);
        console.log(`   Total Risks: ${report.summary.totalRisks}`);
        console.log(`   Total Threats: ${report.summary.totalThreats}`);
        console.log(`   Assets with Threats: ${report.summary.assetsWithThreats}`);
        console.log(`   Risks with Asset Value: ${report.summary.risksWithAssetValue}`);

        console.log('\n🏢 ASSET BREAKDOWN');
        console.log('   By Type:');
        Object.entries(report.assetBreakdown.byType).forEach(([type, count]) => {
            console.log(`      ${type}: ${count}`);
        });
        console.log('   By Status:');
        Object.entries(report.assetBreakdown.byStatus).forEach(([status, count]) => {
            console.log(`      ${status}: ${count}`);
        });

        console.log('\n⚠️  RISK BREAKDOWN');
        console.log('   By Level:');
        Object.entries(report.riskBreakdown.byLevel).forEach(([level, count]) => {
            console.log(`      ${level}: ${count}`);
        });
        console.log('   By Section:');
        Object.entries(report.riskBreakdown.bySection).forEach(([section, count]) => {
            console.log(`      ${section}: ${count}`);
        });
        console.log(`   With CVSS: ${report.riskBreakdown.withCVSS}`);
        console.log(`   With ALE: ${report.riskBreakdown.withALE}`);

        console.log('\n🔗 ASSET-THREAT LINKAGE');
        if (report.assetThreatMapping.length > 0) {
            console.log(`   Found ${report.assetThreatMapping.length} assets with threats:`);
            report.assetThreatMapping.slice(0, 5).forEach(mapping => {
                console.log(`      ${mapping.ip} (${mapping.deviceType}): ${mapping.threatCount} threats`);
                mapping.threats.slice(0, 2).forEach(t => {
                    console.log(`         - ${t.source}: ${t.severity} - ${t.threatType}`);
                });
            });
            if (report.assetThreatMapping.length > 5) {
                console.log(`      ... and ${report.assetThreatMapping.length - 5} more`);
            }
        } else {
            console.log('   ❌ No asset-threat linkages found');
        }

        console.log('\n💰 RISK-ASSET VALUE LINKAGE');
        if (report.riskAssetValueMapping.length > 0) {
            console.log(`   Found ${report.riskAssetValueMapping.length} risks with financial data:`);
            report.riskAssetValueMapping.slice(0, 5).forEach(mapping => {
                console.log(`      ${mapping.riskRegisterId} - ${mapping.riskName}`);
                console.log(`         Level: ${mapping.riskLevel}, Asset Value: $${mapping.assetValue || 0}, ALE: $${mapping.ale || 0}`);
            });
            if (report.riskAssetValueMapping.length > 5) {
                console.log(`      ... and ${report.riskAssetValueMapping.length - 5} more`);
            }
        } else {
            console.log('   ❌ No risks with asset values found');
        }

        console.log('\n🚨 GAPS & ISSUES');
        console.log(`   Assets without threats: ${report.gaps.assetsWithoutThreats}`);
        console.log(`   Risks without asset value: ${report.gaps.risksWithoutAssetValue}`);
        console.log(`   Risks without CVSS: ${report.gaps.risksWithoutCVSS}`);
        console.log(`   Direct Asset-Risk Link: ${report.gaps.noDirectAssetRiskLink ? '❌ MISSING' : '✅ EXISTS'}`);

        console.log('\n📋 ARCHITECTURAL FINDINGS');
        console.log('   1. Risks are QUESTION-BASED, not asset-based');
        console.log('   2. Assets link to Threats via ThreatIntelligence.assetId');
        console.log('   3. Risks link to financial impact via assetValue field (not specific assets)');
        console.log('   4. NO direct RiskAnalysis.assetId field exists');
        console.log('   5. Asset-Risk relationship is INDIRECT via:');
        console.log('      - Questionnaire → Assets (via questionnaireId)');
        console.log('      - Questionnaire → RiskAnalysis (via questionnaireId)');
        console.log('      - Assets → Threats (via assetId)');
        console.log('      - Threats can influence risk scores (via threatIntelService)');

        console.log('\n💡 RECOMMENDATIONS');
        console.log('   1. Current architecture is CORRECT for questionnaire-based risk assessment');
        console.log('   2. Asset-Risk linkage exists at QUESTIONNAIRE level (shared questionnaireId)');
        console.log('   3. For asset-specific risks, use ThreatIntelligence data');
        console.log('   4. Consider adding assetId to RiskAnalysis IF you need direct asset-risk tracking');
        console.log('   5. Current assetValue field represents FINANCIAL impact, not specific asset reference');

        console.log('\n' + '='.repeat(80));
        console.log('END OF REPORT');
        console.log('='.repeat(80) + '\n');

        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Analysis failed:', error);
        process.exit(1);
    });
