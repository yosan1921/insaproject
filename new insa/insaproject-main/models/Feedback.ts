import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFeedback extends Document {
    userId: mongoose.Types.ObjectId;
    userName: string;
    name?: string;
    email?: string;
    rating: number;
    category: 'Performance' | 'User Interface (UI/UX)' | 'Security' | 'Functionality' | 'Reliability' | 'Other';
    categoryOther?: string;
    detailedFeedback: string;
    issuesEncountered?: string;
    suggestions?: string;
    wouldRecommend: 'Yes' | 'No' | 'Maybe';
    createdAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    rating: { type: Number, min: 1, max: 5, required: true },
    category: {
        type: String,
        enum: ['Performance', 'User Interface (UI/UX)', 'Security', 'Functionality', 'Reliability', 'Other'],
        required: true,
    },
    categoryOther: { type: String, default: '' },
    detailedFeedback: { type: String, required: true },
    issuesEncountered: { type: String, default: '' },
    suggestions: { type: String, default: '' },
    wouldRecommend: { type: String, enum: ['Yes', 'No', 'Maybe'], required: true },
}, { timestamps: true });

// Force recompile in dev mode to pick up schema changes
if (process.env.NODE_ENV !== 'production' && mongoose.models.Feedback) {
    delete mongoose.models.Feedback;
}

const Feedback: Model<IFeedback> =
    mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);

export default Feedback;
