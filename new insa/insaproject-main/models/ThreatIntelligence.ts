import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IThreatIntelligence extends Document {
    assetId: mongoose.Types.ObjectId;
    questionnaireId: mongoose.Types.ObjectId;
    company: string;
    source: 'virustotal' | 'shodan' | 'ai';
    threatType: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    description: string;
    originalRiskScore: number;
    enhancedScore: number;
    threatWeight: number;
    rawData: any;
    fetchedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ThreatIntelligenceSchema = new Schema<IThreatIntelligence>(
    {
        assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
        questionnaireId: { type: Schema.Types.ObjectId, ref: 'Questionnaire', required: true },
        company: { type: String, required: true },
        source: {
            type: String,
            enum: ['virustotal', 'shodan', 'ai'],
            required: true,
        },
        threatType: { type: String, required: true },
        severity: {
            type: String,
            enum: ['critical', 'high', 'medium', 'low', 'info'],
            default: 'medium',
        },
        description: { type: String, required: true },
        originalRiskScore: { type: Number, default: 0 },
        enhancedScore: { type: Number, default: 0 },
        threatWeight: { type: Number, default: 0 },
        rawData: { type: Schema.Types.Mixed },
        fetchedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

ThreatIntelligenceSchema.index({ questionnaireId: 1 });
ThreatIntelligenceSchema.index({ assetId: 1 });

const ThreatIntelligence: Model<IThreatIntelligence> =
    mongoose.models.ThreatIntelligence ||
    mongoose.model<IThreatIntelligence>('ThreatIntelligence', ThreatIntelligenceSchema);

export default ThreatIntelligence;
