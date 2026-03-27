import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRegistration extends Document {
    questionnaireId: mongoose.Types.ObjectId;
    analysisId: mongoose.Types.ObjectId;
    company: string;
    certificateNumber: string;
    overallRiskLevel: string;
    registeredAt: Date;
    status: 'registered';
}

const RegistrationSchema = new Schema<IRegistration>({
    questionnaireId: { type: Schema.Types.ObjectId, ref: 'Questionnaire', required: true },
    analysisId: { type: Schema.Types.ObjectId, ref: 'RiskAnalysis', required: true, unique: true },
    company: { type: String, required: true },
    certificateNumber: { type: String, required: true, unique: true },
    overallRiskLevel: { type: String, required: true },
    registeredAt: { type: Date, default: Date.now },
    status: { type: String, default: 'registered' },
}, { timestamps: true });

const Registration: Model<IRegistration> =
    mongoose.models.Registration ||
    mongoose.model<IRegistration>('Registration', RegistrationSchema);

export default Registration;
