import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: Date;
  status: 'sent' | 'delivered' | 'read';
  fileUrl?: string;
}

const MessageSchema: Schema = new Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  content: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  fileUrl: { type: String },
});

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);