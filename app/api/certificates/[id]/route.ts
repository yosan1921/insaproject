import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Registration from '@/models/Registration';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await dbConnect();
        const registration = await Registration.findOne({
            certificateNumber: params.id
        }).lean() as any;

        if (!registration) {
            return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            certificate: {
                certificateNumber: registration.certificateNumber,
                company: registration.company,
                overallRiskLevel: registration.overallRiskLevel,
                registeredAt: registration.registeredAt,
                status: registration.status,
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
