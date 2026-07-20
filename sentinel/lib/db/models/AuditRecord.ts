import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditRecord extends Document {
  eventId: mongoose.Types.ObjectId;
  sequenceNumber: number;
  payload: {
    agent: string;
    action: string;
    evidence?: any;
  };
  previousHash: string;
  currentHash: string;
  createdAt: Date;
}

const AuditRecordSchema = new Schema<IAuditRecord>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  sequenceNumber: { type: Number, required: true },
  payload: {
    agent: { type: String, required: true },
    action: { type: String, required: true },
    evidence: { type: Schema.Types.Mixed }
  },
  previousHash: { type: String, required: true },
  currentHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Compound index to ensure sequence is unique per event
AuditRecordSchema.index({ eventId: 1, sequenceNumber: 1 }, { unique: true });

export const AuditRecord = mongoose.models.AuditRecord || mongoose.model<IAuditRecord>('AuditRecord', AuditRecordSchema);
