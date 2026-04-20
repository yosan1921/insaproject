import mongoose, { Schema, Document, Model } from 'mongoose';

export type HAPeriod = 'monthly' | '6-month' | 'yearly';
export type HAReportType = 'specific' | 'general';

export interface IHumanAwarenessReport extends Document {
  company: string;
  reportType: HAReportType;
  period: HAPeriod;
  periodLabel: string;       // e.g. "January 2026", "H1 2026", "2025 Annual"
  content: string;           // AI-generated report text
  cultureScore: string;      // A–F grade
  participationRate: number; // 0–100
  phishingClickRate: number;
  phishingReportRate: number;
  trainingCompletion: number;
  highRiskDepartments: string[];
  generatedAt: Date;
  notificationSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HumanAwarenessReportSchema = new Schema<IHumanAwarenessReport>(
  {
    company:            { type: String, required: true },
    reportType:         { type: String, enum: ['specific', 'general'], required: true },
    period:             { type: String, enum: ['monthly', '6-month', 'yearly'], required: true },
    periodLabel:        { type: String, required: true },
    content:            { type: String, required: true },
    cultureScore:       { type: String, default: 'N/A' },
    participationRate:  { type: Number, default: 0 },
    phishingClickRate:  { type: Number, default: 0 },
    phishingReportRate: { type: Number, default: 0 },
    trainingCompletion: { type: Number, default: 0 },
    highRiskDepartments:{ type: [String], default: [] },
    generatedAt:        { type: Date, default: Date.now },
    notificationSent:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

HumanAwarenessReportSchema.index({ company: 1, period: 1, createdAt: -1 });

const HumanAwarenessReport: Model<IHumanAwarenessReport> =
  mongoose.models.HumanAwarenessReport ||
  mongoose.model<IHumanAwarenessReport>('HumanAwarenessReport', HumanAwarenessReportSchema);

export default HumanAwarenessReport;
