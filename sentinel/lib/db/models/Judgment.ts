import mongoose, { Schema, Document } from 'mongoose';

export interface IJudgment extends Document {
  eventId: mongoose.Types.ObjectId;
  investigationId: mongoose.Types.ObjectId;
  // Spec-compliant fields
  confidence: number;           // 0-100 — canonical field
  confidenceScore: number;      // alias
  verdict: 'normal' | 'suspicious' | 'confirmed_attack';
  reasoning: string;
  recommended_action: 'block_ip' | 'isolate_segment' | 'alert_human' | 'open_ticket' | 'failover' | 'none';
  needs_more_evidence: boolean;
  follow_up_question: string | null;
  mitre_attribution: string;
  escalatedToHuman: boolean;
  // Explainer output
  plainEnglishSummary?: string;
  // Responder output (stored on judgment for audit trail)
  responderResult?: {
    actionTaken: string;
    originalRecommendation: string;
    policyCheck: any;
    blastRadiusCheck: any;
    executionLog: string[];
  };
  createdAt: Date;
}

const JudgmentSchema = new Schema<IJudgment>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  investigationId: { type: Schema.Types.ObjectId, ref: 'Investigation', required: true },
  confidence: { type: Number, required: true, min: 0, max: 100 },
  confidenceScore: { type: Number, required: true, min: 0, max: 100 },
  verdict: {
    type: String,
    enum: ['normal', 'suspicious', 'confirmed_attack'],
    required: true
  },
  reasoning: { type: String, required: true },
  recommended_action: {
    type: String,
    enum: ['block_ip', 'isolate_segment', 'alert_human', 'open_ticket', 'failover', 'none'],
    default: 'alert_human'
  },
  needs_more_evidence: { type: Boolean, default: false },
  follow_up_question: { type: String, default: null },
  mitre_attribution: { type: String, default: '' },
  escalatedToHuman: { type: Boolean, default: false },
  plainEnglishSummary: { type: String },
  responderResult: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

export const Judgment = mongoose.models.Judgment || mongoose.model<IJudgment>('Judgment', JudgmentSchema);
