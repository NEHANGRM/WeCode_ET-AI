import mongoose, { Schema, Document } from 'mongoose';

export interface IInvestigation extends Document {
  eventId: mongoose.Types.ObjectId;
  abuseIpdbResult: {
    score: number;
    categories: number[];
    lastReportedAt: Date | null;
  } | null;
  virusTotalResult: {
    maliciousCount: number;
    totalEngines: number;
    tags: string[];
  } | null;
  greyNoiseResult: {
    classification: string;
    isTargeted: boolean;
  } | null;
  aiSummary: string;
  attackCategoryGuess: 'ddos' | 'bruteforce' | 'exfiltration' | 'ransomware_staging' | 'unknown';
  retryCount: number;
  createdAt: Date;
}

const InvestigationSchema = new Schema<IInvestigation>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  abuseIpdbResult: { type: Schema.Types.Mixed, default: null },
  virusTotalResult: { type: Schema.Types.Mixed, default: null },
  greyNoiseResult: { type: Schema.Types.Mixed, default: null },
  aiSummary: { type: String, required: true },
  attackCategoryGuess: { 
    type: String, 
    enum: ['ddos', 'bruteforce', 'exfiltration', 'ransomware_staging', 'unknown'],
    required: true 
  },
  retryCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const Investigation = mongoose.models.Investigation || mongoose.model<IInvestigation>('Investigation', InvestigationSchema);
