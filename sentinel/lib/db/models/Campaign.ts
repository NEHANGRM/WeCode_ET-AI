import mongoose, { Schema, Document } from 'mongoose';

export interface ICampaign extends Document {
  campaign_id: string;
  detected_at: Date;
  confidence: number;
  attack_chain_narrative: string;
  mitre_chain: string[];
  involved_case_ids: mongoose.Types.ObjectId[];
  status: 'active' | 'resolved' | 'false_positive';
  reasoning: string;
  source_group?: string; // e.g. "IP: 185.150.11.23" or "Subnet: 192.168.1.0/24"
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>({
  campaign_id: { type: String, required: true, unique: true },
  detected_at: { type: Date, default: Date.now },
  confidence: { type: Number, required: true, min: 0, max: 100 },
  attack_chain_narrative: { type: String, required: true },
  mitre_chain: [{ type: String }],
  involved_case_ids: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
  status: {
    type: String,
    enum: ['active', 'resolved', 'false_positive'],
    default: 'active'
  },
  reasoning: { type: String, required: true },
  source_group: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const Campaign = mongoose.models.Campaign || mongoose.model<ICampaign>('Campaign', CampaignSchema);
