import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Asset from '@/models/Asset';

export async function GET() {
    try {
        await dbConnect();
        const assets = await Asset.find({}).sort({ scannedAt: -1 }).lean();
        return NextResponse.json({ success: true, assets });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
