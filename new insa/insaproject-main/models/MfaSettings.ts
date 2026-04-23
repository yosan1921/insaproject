import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMfaSettings extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId?: string;
  encryptedSecret: string;
  createdAt: Date;
  updatedAt: Date;
}

const MfaSettingsSchema = new Schema<IMfaSettings>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    tenantId: { type: String },
    encryptedSecret: { type: String, required: true },
  },
  { timestamps: true }
);

const MfaSettings: Model<IMfaSettings> =
  mongoose.models.MfaSettings || mongoose.model<IMfaSettings>("MfaSettings", MfaSettingsSchema);

export default MfaSettings;
