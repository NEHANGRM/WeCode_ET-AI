import { connectToDatabase } from '../db/mongoose';
import { Event } from '../db/models/Event';

/**
 * Correlator Agent (Tier 2)
 * Looks across a rolling 24h window for weak signals that individually look
 * benign but together suggest a low-and-slow APT campaign.
 * This is the key differentiator — most teams skip this.
 */

interface CorrelationResult {
  aptSuspicion: boolean;
  aptScore: number;        // 0-100
  correlatedEvents: string[];
  reasoning: string;
  mitreStage: string | null; // MITRE ATT&CK campaign stage if detected
}

// Weak signals that individually are noise, but together spell APT
const APT_SIGNAL_WEIGHTS: Record<string, number> = {
  'PORT_SCAN': 10,
  'BRUTE_FORCE_PATTERN': 25,
  'OT_PROTOCOL_VIOLATION': 35,
  'RATE_LIMIT_EXCEEDED': 20,
  'ANOMALY_DETECTED': 15,
  'UNUSUAL_DNS': 20,
  'CONFIG_CHANGE_ATTEMPT': 30,
};

const MITRE_STAGES: Record<number, string> = {
  0:  'None',
  30: 'TA0043 — Reconnaissance (T1046 Network Scan)',
  50: 'TA0001 — Initial Access + TA0007 — Discovery',
  70: 'TA0008 — Lateral Movement (T1021 Remote Services)',
  90: 'TA0040 — Impact (T1486 Data Encrypted / T1489 Service Stop)'
};

export async function runCorrelator(currentSignalIp: string, currentReasonCode: string): Promise<CorrelationResult> {
  try {
    await connectToDatabase();

    const window = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago
    const recentEvents = await Event.find({
      createdAt: { $gte: window }
    }).sort({ createdAt: -1 }).limit(100);

    if (recentEvents.length < 2) {
      return {
        aptSuspicion: false,
        aptScore: 0,
        correlatedEvents: [],
        reasoning: 'Insufficient historical events for correlation (fewer than 2 in 24h window).',
        mitreStage: null
      };
    }

    let aptScore = 0;
    const correlatedEvents: string[] = [];
    const seenReasonCodes = new Set<string>();
    const seenIps = new Set<string>();
    let hasOTViolation = false;
    let hasBruteForce = false;
    let hasPortScan = false;

    // Score the current signal
    aptScore += APT_SIGNAL_WEIGHTS[currentReasonCode] || 10;
    seenReasonCodes.add(currentReasonCode);
    seenIps.add(currentSignalIp);

    for (const event of recentEvents) {
      const reasonCode = (event as any).rawSignal?.reasonCode || 'ANOMALY_DETECTED';
      const ip = event.rawSignal?.ip;

      if (!seenReasonCodes.has(reasonCode)) {
        aptScore += (APT_SIGNAL_WEIGHTS[reasonCode] || 10) * 0.7; // Diminishing weight for variety
        seenReasonCodes.add(reasonCode);
        correlatedEvents.push(`${event._id.toString().substring(0, 8)} — ${reasonCode} from ${ip}`);
      }

      if (ip && !seenIps.has(ip)) seenIps.add(ip);
      if (reasonCode === 'OT_PROTOCOL_VIOLATION') hasOTViolation = true;
      if (reasonCode === 'BRUTE_FORCE_PATTERN') hasBruteForce = true;
      if (reasonCode === 'PORT_SCAN') hasPortScan = true;
    }

    // Bonus scoring for classic APT kill chain sequences
    if (hasPortScan && hasBruteForce) aptScore += 20; // Recon → Initial Access
    if (hasBruteForce && hasOTViolation) aptScore += 30; // Initial Access → OT Lateral Move
    if (hasPortScan && hasBruteForce && hasOTViolation) aptScore += 20; // Full chain bonus

    // Diversity penalty — if all events look the same, it's probably not APT
    if (seenReasonCodes.size < 2) aptScore = Math.min(aptScore, 30);

    aptScore = Math.min(Math.round(aptScore), 100);

    // Determine MITRE stage
    let mitreStage: string | null = null;
    const stageThresholds = [90, 70, 50, 30, 0];
    for (const threshold of stageThresholds) {
      if (aptScore >= threshold) {
        mitreStage = MITRE_STAGES[threshold] || null;
        break;
      }
    }

    const aptSuspicion = aptScore >= 50;

    let reasoning: string;
    if (aptScore >= 80) {
      reasoning = `HIGH APT SUSPICION: Detected ${seenReasonCodes.size} distinct signal types across ${seenIps.size} source IPs in 24h, following the classic Recon→Access→Lateral Move kill chain pattern. This matches low-and-slow APT TTPs.`;
    } else if (aptScore >= 50) {
      reasoning = `MODERATE APT SUSPICION: ${seenReasonCodes.size} different anomaly types observed in the 24h window including ${Array.from(seenReasonCodes).join(', ')}. Insufficient to confirm APT but warrants elevated scrutiny.`;
    } else {
      reasoning = `LOW APT SUSPICION: ${seenReasonCodes.size} signal type(s) in 24h — likely isolated incident or background noise rather than coordinated campaign.`;
    }

    return { aptSuspicion, aptScore, correlatedEvents, reasoning, mitreStage };

  } catch (error) {
    console.error('[Correlator] Error:', error);
    return {
      aptSuspicion: false,
      aptScore: 0,
      correlatedEvents: [],
      reasoning: 'Correlator unavailable — proceeding with single-event analysis.',
      mitreStage: null
    };
  }
}
