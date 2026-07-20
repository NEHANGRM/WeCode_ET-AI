import mongoose, { Schema, Document } from 'mongoose';

export interface IJudgment extends Document {
  eventId: mongoose.Types.ObjectId;
  investigationId: mongoose.Types.ObjectId;
  confidenceScore: number; // 0-100
  verdict: 'normal' | 'suspicious' | 'confirmed_attack';
  reasoning: string;
  escalatedToHuman: boolean;
  createdAt: Date;
}

const JudgmentSchema = new Schema<IJudgment>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  investigationId: { type: Schema.Types.ObjectId, ref: 'Investigation', required: true },
  confidenceScore: { type: Number, required: true, min: 0, max: 100 },
  verdict: { 
    type: String, 
    enum: ['normal', 'suspicious', 'confirmed_attack'],
    required: true
  },
  reasoning: { type: String, required: true },
  escalatedToHuman: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const Judgment = mongoose.models.Judgment || mongoose.model<IJudgment>('Judgment', JudgmentSchema);
