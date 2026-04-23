import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAssignment extends Document {
    analysisId: mongoose.Types.ObjectId;
    assignedTo: mongoose.Types.ObjectId;
    assignedBy: mongoose.Types.ObjectId;
    company: string;
    note?: string;
    createdAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>({
    analysisId: { type: Schema.Types.ObjectId, ref: 'RiskAnalysis', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: String, required: true },
    note: { type: String, default: '' },
}, { timestamps: true });

AssignmentSchema.index({ assignedTo: 1 });
AssignmentSchema.index({ analysisId: 1 });

const Assignment: Model<IAssignment> =
    mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', AssignmentSchema);

export default Assignment;
