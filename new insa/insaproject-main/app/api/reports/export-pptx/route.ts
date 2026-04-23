import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import RiskAnalysis from '@/models/RiskAnalysis';
import PptxGenJS from 'pptxgenjs';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const analysisId = searchParams.get('analysisId');

        if (!analysisId) {
            return NextResponse.json({ error: 'Missing analysisId' }, { status: 400 });
        }

        await dbConnect();
        const analysis = await RiskAnalysis.findById(analysisId).lean() as any;

        if (!analysis) {
            return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
        }

        const allAnalyses = [
            ...(analysis.operational || []),
            ...(analysis.tactical || []),
            ...(analysis.strategic || []),
        ];

        const overall = analysis.summary?.overall || {};
        const dist = overall.riskDistribution || {};

        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_WIDE';
        pptx.title = `Risk Assessment - ${analysis.company}`;

        // Slide 1: Title
        const slide1 = pptx.addSlide();
        slide1.background = { color: '0F172A' };
        slide1.addText('CYBER SECURITY RISK ASSESSMENT', {
            x: 0.5, y: 1.5, w: 12, h: 1,
            fontSize: 32, bold: true, color: '3B82F6', align: 'center'
        });
        slide1.addText(analysis.company || 'Unknown Company', {
            x: 0.5, y: 2.8, w: 12, h: 0.8,
            fontSize: 24, color: 'FFFFFF', align: 'center'
        });
        slide1.addText(`Generated: ${new Date(analysis.createdAt).toLocaleDateString()} | Category: ${analysis.category}`, {
            x: 0.5, y: 3.8, w: 12, h: 0.5,
            fontSize: 14, color: '94A3B8', align: 'center'
        });
        slide1.addText('INSA - Cyber Security Risk Analysis & Reporting System', {
            x: 0.5, y: 6.5, w: 12, h: 0.4,
            fontSize: 11, color: '64748B', align: 'center'
        });

        // Slide 2: Executive Summary
        const slide2 = pptx.addSlide();
        slide2.background = { color: '0F172A' };
        slide2.addText('EXECUTIVE SUMMARY', {
            x: 0.5, y: 0.3, w: 12, h: 0.6,
            fontSize: 24, bold: true, color: '3B82F6'
        });

        const summaryData = [
            { label: 'Total Questions', value: String(overall.totalQuestionsAnalyzed || allAnalyses.length), color: 'FFFFFF' },
            { label: 'Average Risk Score', value: `${overall.averageRiskScore || 0}/25`, color: 'FFFFFF' },
            { label: 'Critical Risks', value: String(dist.CRITICAL || 0), color: 'DC2626' },
            { label: 'High Risks', value: String(dist.HIGH || 0), color: 'EA580C' },
            { label: 'Medium Risks', value: String(dist.MEDIUM || 0), color: 'EAB308' },
            { label: 'Low Risks', value: String(dist.LOW || 0), color: '16A34A' },
        ];

        summaryData.forEach((item, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            slide2.addShape('rect' as any, {
                x: 0.5 + col * 4.2, y: 1.2 + row * 2.2, w: 3.8, h: 1.8,
                fill: { color: '1E293B' }, line: { color: '334155', width: 1 }
            });
            slide2.addText(item.value, {
                x: 0.5 + col * 4.2, y: 1.4 + row * 2.2, w: 3.8, h: 0.8,
                fontSize: 28, bold: true, color: item.color, align: 'center'
            });
            slide2.addText(item.label, {
                x: 0.5 + col * 4.2, y: 2.3 + row * 2.2, w: 3.8, h: 0.5,
                fontSize: 12, color: '94A3B8', align: 'center'
            });
        });

        // Slide 3: Top Critical Risks
        const criticalRisks = allAnalyses
            .filter((a: any) => a.analysis?.riskLevel === 'CRITICAL' || a.analysis?.riskLevel === 'HIGH')
            .slice(0, 5);

        if (criticalRisks.length > 0) {
            const slide3 = pptx.addSlide();
            slide3.background = { color: '0F172A' };
            slide3.addText('TOP CRITICAL & HIGH RISKS', {
                x: 0.5, y: 0.3, w: 12, h: 0.6,
                fontSize: 24, bold: true, color: 'DC2626'
            });

            const tableData = [
                [
                    { text: 'Risk Level', options: { bold: true, color: 'FFFFFF', fill: { color: '1E3A5F' } } },
                    { text: 'Score', options: { bold: true, color: 'FFFFFF', fill: { color: '1E3A5F' } } },
                    { text: 'Gap', options: { bold: true, color: 'FFFFFF', fill: { color: '1E3A5F' } } },
                    { text: 'Mitigation', options: { bold: true, color: 'FFFFFF', fill: { color: '1E3A5F' } } },
                ],
                ...criticalRisks.map((a: any) => [
                    { text: a.analysis?.riskLevel || '', options: { color: a.analysis?.riskLevel === 'CRITICAL' ? 'DC2626' : 'EA580C' } },
                    { text: `${a.analysis?.riskScore || 0}/25`, options: { color: 'FFFFFF' } },
                    { text: (a.analysis?.gap || '').substring(0, 50), options: { color: 'CBD5E1' } },
                    { text: (a.analysis?.mitigation || '').substring(0, 50), options: { color: '86EFAC' } },
                ])
            ];

            slide3.addTable(tableData as any, {
                x: 0.5, y: 1.2, w: 12,
                fontSize: 10,
                border: { type: 'solid', color: '334155', pt: 1 },
                fill: { color: '1E293B' },
                color: 'FFFFFF',
            });
        }

        // Slide 4: Recommendations
        const slide4 = pptx.addSlide();
        slide4.background = { color: '0F172A' };
        slide4.addText('RECOMMENDATIONS', {
            x: 0.5, y: 0.3, w: 12, h: 0.6,
            fontSize: 24, bold: true, color: '3B82F6'
        });

        const recommendations = allAnalyses
            .filter((a: any) => a.analysis?.riskLevel === 'CRITICAL')
            .slice(0, 4);

        recommendations.forEach((a: any, i: number) => {
            slide4.addText(`${i + 1}. ${(a.analysis?.gap || '').substring(0, 60)}`, {
                x: 0.5, y: 1.2 + i * 1.3, w: 12, h: 0.5,
                fontSize: 13, bold: true, color: 'DC2626'
            });
            slide4.addText(`→ ${(a.analysis?.mitigation || '').substring(0, 100)}`, {
                x: 0.8, y: 1.7 + i * 1.3, w: 11.5, h: 0.5,
                fontSize: 11, color: '86EFAC'
            });
        });

        if (recommendations.length === 0) {
            slide4.addText('No critical risks identified. Continue monitoring.', {
                x: 0.5, y: 2, w: 12, h: 1,
                fontSize: 16, color: '86EFAC', align: 'center'
            });
        }

        const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;

        return new NextResponse(new Uint8Array(pptxBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'Content-Disposition': `attachment; filename="risk-report-${analysisId}.pptx"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error: any) {
        console.error('PPTX export error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate PPTX' }, { status: 500 });
    }
}
