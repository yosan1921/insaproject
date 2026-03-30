import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import RiskAnalysis from '@/models/RiskAnalysis';
import ExcelJS from 'exceljs';

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

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'INSA CSRARS';
        workbook.created = new Date();

        // Sheet 1: Summary
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.columns = [
            { header: 'Field', key: 'field', width: 25 },
            { header: 'Value', key: 'value', width: 40 },
        ];
        summarySheet.addRows([
            { field: 'Company', value: analysis.company },
            { field: 'Category', value: analysis.category },
            { field: 'Date', value: new Date(analysis.createdAt).toLocaleDateString() },
            { field: 'Total Questions', value: allAnalyses.length },
            { field: 'Critical', value: allAnalyses.filter((a: any) => a.analysis?.riskLevel === 'CRITICAL').length },
            { field: 'High', value: allAnalyses.filter((a: any) => a.analysis?.riskLevel === 'HIGH').length },
            { field: 'Medium', value: allAnalyses.filter((a: any) => a.analysis?.riskLevel === 'MEDIUM').length },
            { field: 'Low', value: allAnalyses.filter((a: any) => a.analysis?.riskLevel === 'LOW').length },
        ]);
        summarySheet.getRow(1).font = { bold: true };

        // Sheet 2: Risk Analysis Details
        const detailSheet = workbook.addWorksheet('Risk Analysis');
        detailSheet.columns = [
            { header: '#', key: 'num', width: 5 },
            { header: 'Level', key: 'level', width: 12 },
            { header: 'Section', key: 'section', width: 30 },
            { header: 'Question', key: 'question', width: 50 },
            { header: 'Answer', key: 'answer', width: 20 },
            { header: 'Likelihood', key: 'likelihood', width: 12 },
            { header: 'Impact', key: 'impact', width: 10 },
            { header: 'Risk Score', key: 'riskScore', width: 12 },
            { header: 'Risk Level', key: 'riskLevel', width: 12 },
            { header: 'Gap', key: 'gap', width: 40 },
            { header: 'Threat', key: 'threat', width: 40 },
            { header: 'Mitigation', key: 'mitigation', width: 40 },
        ];

        // Style header row
        detailSheet.getRow(1).font = { bold: true };
        detailSheet.getRow(1).fill = {
            type: 'pattern', pattern: 'solid',
            fgColor: { argb: 'FF1F2937' },
        };
        detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        allAnalyses.forEach((a: any, idx: number) => {
            const riskLevel = a.analysis?.riskLevel || 'UNKNOWN';
            const row = detailSheet.addRow({
                num: idx + 1,
                level: a.level || '',
                section: a.section || '',
                question: a.question || '',
                answer: a.answer || '',
                likelihood: a.analysis?.likelihood || 0,
                impact: a.analysis?.impact || 0,
                riskScore: a.analysis?.riskScore || 0,
                riskLevel,
                gap: a.analysis?.gap || '',
                threat: a.analysis?.threat || '',
                mitigation: a.analysis?.mitigation || '',
            });

            // Color risk level cell
            const riskColors: Record<string, string> = {
                CRITICAL: 'FFDC2626', HIGH: 'FFEA580C',
                MEDIUM: 'FFEAB308', LOW: 'FF16A34A',
            };
            const cell = row.getCell('riskLevel');
            if (riskColors[riskLevel]) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: riskColors[riskLevel] } };
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            }
        });

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer as Buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="risk-report-${analysisId}.xlsx"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error: any) {
        console.error('Excel export error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate Excel' }, { status: 500 });
    }
}
