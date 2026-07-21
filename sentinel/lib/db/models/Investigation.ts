import mongoose, { Schema, Document } from 'mongoose';

export interface IInvestigation extends Document {
  eventId: mongoose.Types.ObjectId;
  // Raw threat intel API responses (shown verbatim to judges)
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
  // LLM synthesis
  aiSummary: string;
  attackCategoryGuess: 'ddos' | 'bruteforce' | 'exfiltration' | 'ransomware_staging' | 'apt_campaign' | 'ot_intrusion' | 'unknown';
  // Extended spec fields
  summary: string;
  likely_attack_type: string;
  evidence: string[];
  severity_hint: 'critical' | 'high' | 'medium' | 'low';
  mitre_technique: string;
  mitre_tactic: string;
  // Correlator output
  aptCorrelation?: {
    aptSuspicion: boolean;
    aptScore: number;
    correlatedEvents: string[];
    reasoning: string;
    mitreStage: string | null;
  };
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
    enum: ['ddos', 'bruteforce', 'exfiltration', 'ransomware_staging', 'apt_campaign', 'ot_intrusion', 'unknown'],
    required: true
  },
  summary: { type: String },
  likely_attack_type: { type: String },
  evidence: [{ type: String }],
  severity_hint: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
  mitre_technique: { type: String, default: '' },
  mitre_tactic: { type: String, default: '' },
  aptCorrelation: { type: Schema.Types.Mixed },
  retryCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const Investigation = mongoose.models.Investigation || mongoose.model<IInvestigation>('Investigation', InvestigationSchema);
