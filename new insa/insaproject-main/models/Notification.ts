import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType = 'questionnaire' | 'analysis' | 'critical' | 'asset' | 'threat';
export type NotificationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface INotification extends Document {
    type: NotificationType;
    severity: NotificationSeverity;
    title: string;
    message: string;
    link?: string;
    readBy: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
    {
        type: {
            type: String,
            enum: ['questionnaire', 'analysis', 'critical', 'asset', 'threat'],
            required: true,
        },
        severity: {
            type: String,
            enum: ['critical', 'high', 'medium', 'low', 'info'],
            default: 'info',
        },
        title: { type: String, required: true },
        message: { type: String, required: true },
        link: { type: String },
        readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },
    { timestamps: true }
);

NotificationSchema.index({ createdAt: -1 });

const Notification: Model<INotification> =
    mongoose.models.Notification ||
    mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
