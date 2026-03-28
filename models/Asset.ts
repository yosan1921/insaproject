import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAsset extends Document {
    questionnaireId: mongoose.Types.ObjectId;
    company: string;
    ip: string;
    hostname: string;
    openPorts: number[];
    os: string;
    deviceType: 'server' | 'device' | 'software' | 'unknown';
    status: 'active' | 'inactive';
    scannedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
    {
        questionnaireId: { type: Schema.Types.ObjectId, ref: 'Questionnaire', required: true },
        company: { type: String, required: true },
        ip: { type: String, required: true },
        hostname: { type: String, default: '' },
        openPorts: [{ type: Number }],
        os: { type: String, default: 'Unknown' },
        deviceType: {
            type: String,
            enum: ['server', 'device', 'software', 'unknown'],
            default: 'unknown',
        },
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
        scannedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

AssetSchema.index({ questionnaireId: 1 });
AssetSchema.index({ ip: 1, questionnaireId: 1 }, { unique: true });

const Asset: Model<IAsset> =
    mongoose.models.Asset || mongoose.model<IAsset>('Asset', AssetSchema);

export default Asset;
