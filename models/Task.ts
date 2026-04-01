// Minimal Task model for chat partner filtering
import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  assignedBy: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId;
  title: string;
}

const TaskSchema: Schema = new Schema({
  assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
});

export default mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
