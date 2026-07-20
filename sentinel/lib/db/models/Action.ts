import mongoose, { Schema, Document } from 'mongoose';

export interface IAction extends Document {
  eventId: mongoose.Types.ObjectId;
  judgmentId: mongoose.Types.ObjectId;
  actionType: 'block_ip' | 'isolate_segment' | 'alert_oncall' | 'open_ticket' | 'trigger_failover';
  approvedBy: 'system_auto' | 'human_operator';
  status: 'executed' | 'simulated' | 'rejected';
  createdAt: Date;
}

const ActionSchema = new Schema<IAction>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  judgmentId: { type: Schema.Types.ObjectId, ref: 'Judgment', required: true },
  actionType: { 
    type: String, 
    enum: ['block_ip', 'isolate_segment', 'alert_oncall', 'open_ticket', 'trigger_failover'],
    required: true
  },
  approvedBy: { type: String, enum: ['system_auto', 'human_operator'], required: true },
  status: { type: String, enum: ['executed', 'simulated', 'rejected'], default: 'simulated' },
  createdAt: { type: Date, default: Date.now }
});

export const Action = mongoose.models.Action || mongoose.model<IAction>('Action', ActionSchema);
