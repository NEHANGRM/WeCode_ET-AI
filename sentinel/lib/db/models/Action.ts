import mongoose, { Schema, Document } from 'mongoose';

export interface IAction extends Document {
  eventId: mongoose.Types.ObjectId;
  judgmentId: mongoose.Types.ObjectId;
  // Spec action names
  actionType: 'block_ip' | 'isolate_segment' | 'alert_human' | 'open_ticket' | 'failover' | 'none' | 'alert_oncall' | 'trigger_failover';
  originalRecommendation?: string;
  approvedBy: 'system_auto' | 'human_operator';
  status: 'executed' | 'simulated' | 'rejected';
  // Policy enforcement result
  policyCheck?: {
    passed: boolean;
    reason: string;
    assetClass: string;
  };
  // Blast radius result
  blastRadiusCheck?: any;
  // Execution log from Responder
  executionLog?: string[];
  createdAt: Date;
}

const ActionSchema = new Schema<IAction>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  judgmentId: { type: Schema.Types.ObjectId, ref: 'Judgment', required: true },
  actionType: {
    type: String,
    enum: ['block_ip', 'isolate_segment', 'alert_human', 'open_ticket', 'failover', 'none', 'alert_oncall', 'trigger_failover'],
    required: true
  },
  originalRecommendation: { type: String },
  approvedBy: { type: String, enum: ['system_auto', 'human_operator'], required: true },
  status: { type: String, enum: ['executed', 'simulated', 'rejected'], default: 'simulated' },
  policyCheck: { type: Schema.Types.Mixed },
  blastRadiusCheck: { type: Schema.Types.Mixed },
  executionLog: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

export const Action = mongoose.models.Action || mongoose.model<IAction>('Action', ActionSchema);
