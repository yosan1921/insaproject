import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuestionAnalysis {
  questionId: number;
  section: string;
  question: string;
  answer: string;
  level: string;
  analysis: {
    // Basic fields
    riskName?: string;
    description?: string;
    status?: 'Open' | 'Closed';
    riskType?: 'Risk' | 'Issue';
    threatOpportunity?: 'Threat' | 'Opportunity';
    assignedTo?: string;

    // Pre-Mitigation
    preMitigation?: {
      probability: number; // percentage (0-100)
      impact: number; // percentage (0-100)
      score: number; // calculated
      cost: number; // financial cost
    };

    // Current/Post-Mitigation
    likelihood: number;
    impact: number;
    riskScore: number;
    riskLevel: string;
    riskColor: string;

    // CVSS Integration (SRS Requirement: Quantitative Scoring)
    cvssScore?: number; // CVSS Base Score (0.0 - 10.0)
    cvssSeverity?: string; // NONE, LOW, MEDIUM, HIGH, CRITICAL
    cvssMetrics?: {
      attackVector?: 'N' | 'A' | 'L' | 'P'; // Network, Adjacent, Local, Physical
      attackComplexity?: 'L' | 'H'; // Low, High
      privilegesRequired?: 'N' | 'L' | 'H'; // None, Low, High
      userInteraction?: 'N' | 'R'; // None, Required
      scope?: 'U' | 'C'; // Unchanged, Changed
      confidentiality?: 'N' | 'L' | 'H'; // None, Low, High
      integrity?: 'N' | 'L' | 'H'; // None, Low, High
      availability?: 'N' | 'L' | 'H'; // None, Low, High
    };
    cvssVectorString?: string; // e.g., "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"

    // Post-Mitigation (percentage based)
    postMitigation?: {
      probability: number; // percentage (0-100)
      impact: number; // percentage (0-100)
      score: number; // calculated
      cost: number; // financial cost
    };

    // Risk Treatment (SRS Requirement: Inherent vs Residual Risk)
    treatmentOption?: 'mitigate' | 'transfer' | 'avoid' | 'accept';
    treatmentNote?: string;
    inherentRisk?: number; // Original risk score before treatment (1-25)
    residualRisk?: number; // Risk score after treatment (0-25)
    riskReduction?: number; // Inherent - Residual
    riskReductionPercent?: number; // Percentage reduction

    // Financial Risk Quantification (SRS Requirement: ALE/SLE)
    assetValue?: number; // Value of asset at risk (in currency)
    exposureFactor?: number; // Percentage of asset value at risk (0.0-1.0)
    sle?: number; // Single Loss Expectancy = Asset Value × Exposure Factor
    aro?: number; // Annual Rate of Occurrence (times per year)
    ale?: number; // Annual Loss Expectancy = SLE × ARO
    currency?: string; // Currency code (USD, EUR, etc.)

    // Mitigation details
    mitigationCost?: number;
    gap: string;
    threat: string;
    mitigation: string;

    // Additional fields
    impactLabel?: string;
    likelihoodLabel?: string;
    impactDescription?: string;
  };
  timestamp: Date;
}

export interface IRiskAnalysis extends Document {
  riskRegisterId?: string; // Unique Risk Register ID (e.g., RR-2026-0001) - auto-generated
  questionnaireId: mongoose.Types.ObjectId;
  company: string;
  category: string;
  tenantId?: string;
  metadata: {
    timestamp: Date;
    totalQuestions: number;
    levels: {
      operational: number;
      tactical: number;
      strategic: number;
    };
  };
  operational: IQuestionAnalysis[];
  tactical: IQuestionAnalysis[];
  strategic: IQuestionAnalysis[];
  summary: {
    operational: any;
    tactical: any;
    strategic: any;
    overall: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const QuestionAnalysisSchema = new Schema({
  questionId: Number,
  section: String,
  question: String,
  answer: String,
  level: String,
  analysis: {
    // Basic fields
    riskName: String,
    description: String,
    status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
    riskType: { type: String, enum: ['Risk', 'Issue'], default: 'Risk' },
    threatOpportunity: { type: String, enum: ['Threat', 'Opportunity'], default: 'Threat' },
    assignedTo: String,

    // Pre-Mitigation
    preMitigation: {
      probability: { type: Number, min: 0, max: 100 }, // percentage (0-100)
      impact: { type: Number, min: 0, max: 100 }, // percentage (0-100)
      score: { type: Number, min: 0 }, // calculated
      cost: { type: Number, min: 0 } // financial cost
    },

    // Current/Post-Mitigation - with validation
    likelihood: { type: Number, required: true, min: 1, max: 5 },
    impact: { type: Number, required: true, min: 1, max: 5 },
    riskScore: { type: Number, required: true, min: 1, max: 25 },
    riskLevel: { type: String, required: true, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW'] },
    riskColor: String,

    // CVSS Integration (SRS Requirement: Quantitative Scoring)
    cvssScore: { type: Number, min: 0, max: 10 },
    cvssSeverity: { type: String, enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    cvssMetrics: {
      attackVector: { type: String, enum: ['N', 'A', 'L', 'P'] },
      attackComplexity: { type: String, enum: ['L', 'H'] },
      privilegesRequired: { type: String, enum: ['N', 'L', 'H'] },
      userInteraction: { type: String, enum: ['N', 'R'] },
      scope: { type: String, enum: ['U', 'C'] },
      confidentiality: { type: String, enum: ['N', 'L', 'H'] },
      integrity: { type: String, enum: ['N', 'L', 'H'] },
      availability: { type: String, enum: ['N', 'L', 'H'] }
    },
    cvssVectorString: String,

    // Post-Mitigation (percentage based)
    postMitigation: {
      probability: { type: Number, min: 0, max: 100 }, // percentage (0-100)
      impact: { type: Number, min: 0, max: 100 }, // percentage (0-100)
      score: { type: Number, min: 0 }, // calculated
      cost: { type: Number, min: 0 } // financial cost
    },

    // Risk Treatment (SRS Requirement: Inherent vs Residual Risk)
    treatmentOption: { type: String, enum: ['mitigate', 'transfer', 'avoid', 'accept'] },
    treatmentNote: String,
    inherentRisk: { type: Number, min: 0, max: 25 },
    residualRisk: { type: Number, min: 0, max: 25 },
    riskReduction: { type: Number, min: 0 },
    riskReductionPercent: { type: Number, min: 0, max: 100 },

    // Financial Risk Quantification (SRS Requirement: ALE/SLE)
    assetValue: { type: Number, min: 0 },
    exposureFactor: { type: Number, min: 0, max: 1 },
    sle: { type: Number, min: 0 },
    aro: { type: Number, min: 0 },
    ale: { type: Number, min: 0 },
    currency: { type: String, default: 'USD' },

    // Mitigation details
    mitigationCost: { type: Number, min: 0 },
    gap: String,
    threat: String,
    mitigation: String,

    // Additional fields
    impactLabel: String,
    likelihoodLabel: String,
    impactDescription: String
  },
  timestamp: Date
});

const RiskAnalysisSchema = new Schema<IRiskAnalysis>(
  {
    riskRegisterId: {
      type: String,
      unique: true,
      sparse: true // Allow null/undefined temporarily before pre-save hook runs
    },
    questionnaireId: {
      type: Schema.Types.ObjectId,
      ref: 'Questionnaire',
      required: true,
      unique: true // Prevent duplicate analyses
    },
    company: { type: String, required: true },
    category: { type: String, required: true },
    tenantId: { type: String },
    metadata: {
      timestamp: Date,
      totalQuestions: Number,
      levels: {
        operational: Number,
        tactical: Number,
        strategic: Number
      }
    },
    operational: [QuestionAnalysisSchema],
    tactical: [QuestionAnalysisSchema],
    strategic: [QuestionAnalysisSchema],
    summary: Schema.Types.Mixed
  },
  { timestamps: true }
);

// Auto-generate Risk Register ID before saving
RiskAnalysisSchema.pre('save', async function (next) {
  if (!this.riskRegisterId) {
    try {
      const year = new Date().getFullYear();

      // Find the highest existing sequence number for this year
      const latestRisk = await mongoose.model('RiskAnalysis')
        .findOne({ riskRegisterId: new RegExp(`^RR-${year}-`) })
        .sort({ riskRegisterId: -1 })
        .select('riskRegisterId')
        .lean() as { riskRegisterId?: string } | null;

      let nextNumber = 1;
      if (latestRisk?.riskRegisterId) {
        const match = latestRisk.riskRegisterId.match(/RR-\d{4}-(\d{4})/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      const sequenceNumber = String(nextNumber).padStart(4, '0');
      this.riskRegisterId = `RR-${year}-${sequenceNumber}`;

      console.log(`✅ Generated Risk Register ID: ${this.riskRegisterId}`);
    } catch (error) {
      console.error('❌ Error generating Risk Register ID:', error);
      // Improved fallback: use timestamp + random to ensure uniqueness
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      this.riskRegisterId = `RR-${new Date().getFullYear()}-${timestamp}${random}`;
      console.log(`⚠️ Using fallback Risk Register ID: ${this.riskRegisterId}`);
    }
  }
  next();
});

// Create index for faster queries
// Note: questionnaireId and riskRegisterId indexes are automatically created by unique: true
RiskAnalysisSchema.index({ company: 1, createdAt: -1 });

const RiskAnalysis: Model<IRiskAnalysis> =
  mongoose.models.RiskAnalysis ||
  mongoose.model<IRiskAnalysis>('RiskAnalysis', RiskAnalysisSchema);

export default RiskAnalysis;
