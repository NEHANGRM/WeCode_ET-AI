import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  source: 'watcher' | 'manual';
  rawSignal: {
    ip: string;
    protocol: string;
    payloadSummary: string;
    timestamp: Date;
  };
  status: 'flagged' | 'investigating' | 'judged' | 'responded' | 'closed';
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>({
  source: { type: String, enum: ['watcher', 'manual'], required: true },
  rawSignal: {
    ip: { type: String, required: true },
    protocol: { type: String, required: true },
    payloadSummary: { type: String, required: true },
    timestamp: { type: Date, required: true }
  },
  status: { 
    type: String, 
    enum: ['flagged', 'investigating', 'judged', 'responded', 'closed'],
    default: 'flagged'
  },
  createdAt: { type: Date, default: Date.now }
});

export const Event = mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
