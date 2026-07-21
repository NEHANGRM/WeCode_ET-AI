import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  source: 'watcher' | 'manual' | 'replay' | 'correlator';
  rawSignal: {
    ip: string;
    protocol: string;
    payloadSummary: string;
    timestamp: Date;
    reasonCode?: string;
    severity?: string;
    target_asset?: {
      id: string;
      name: string;
      type: string;
      asset_class: string;
    };
    payload_size?: number;
    event_type?: string;
  };
  status: 'flagged' | 'investigating' | 'judged' | 'responded' | 'closed';
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>({
  source: { type: String, enum: ['watcher', 'manual', 'replay', 'correlator'], required: true },
  rawSignal: {
    ip: { type: String, required: true },
    protocol: { type: String, required: true },
    payloadSummary: { type: String, required: true },
    timestamp: { type: Date, required: true },
    reasonCode: { type: String },
    severity: { type: String },
    target_asset: { type: Schema.Types.Mixed },
    payload_size: { type: Number },
    event_type: { type: String }
  },
  status: {
    type: String,
    enum: ['flagged', 'investigating', 'judged', 'responded', 'closed'],
    default: 'flagged'
  },
  createdAt: { type: Date, default: Date.now }
});

export const Event = mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
