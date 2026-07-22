import { GoogleGenerativeAI } from '@google/generative-ai';
import { connectToDatabase } from '../db/mongoose';
import { Event } from '../db/models/Event';
import { Investigation } from '../db/models/Investigation';
import { Judgment } from '../db/models/Judgment';
import { Campaign } from '../db/models/Campaign';
import { randomUUID } from 'crypto';

const genAI = new GoogleGenerativeAI(process.env.LLM_API_KEY || '');

export interface CampaignCorrelatorResult {
  campaigns_detected: number;
  campaigns: any[];
  groups_analyzed: number;
  message: string;
}

interface CaseGroup {
  groupKey: string;    // e.g. "ip:185.150.11.23" or "subnet:192.168.1.0"
  cases: any[];
}

/**
 * Campaign Correlator Agent (standalone — runs independently of per-event pipeline)
 *
 * Strategy:
 * 1. Fetch all cases from last 24h with their Investigations & Judgments
 * 2. Group by source_ip AND by target_asset subnet prefix
 * 3. Discard groups with only 1 case (no correlation possible)
 * 4. For each multi-case group, extract MITRE sequence and send to LLM
 * 5. Save confirmed campaigns to DB
 */
export async function runCampaignCorrelator(): Promise<CampaignCorrelatorResult> {
  try {
    await connectToDatabase();

    const window24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Fetch all events in last 24h
    const recentEvents = await Event.find({ createdAt: { $gte: window24h } })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    if (recentEvents.length === 0) {
      return {
        campaigns_detected: 0,
        campaigns: [],
        groups_analyzed: 0,
        message: 'No events in last 24h — nothing to correlate.'
      };
    }

    // Enrich each event with its Investigation and Judgment
    const enrichedCases = await Promise.all(recentEvents.map(async (event: any) => {
      const [inv, judg] = await Promise.all([
        Investigation.findOne({ eventId: event._id }).sort({ createdAt: -1 }).lean(),
        Judgment.findOne({ eventId: event._id }).sort({ createdAt: -1 }).lean()
      ]);
      return {
        id: event._id.toString(),
        ip: event.rawSignal?.ip,
        subnet: extractSubnet(event.rawSignal?.ip),
        target_asset: event.rawSignal?.target_asset?.name || null,
        target_asset_id: event.rawSignal?.target_asset?.id || null,
        reasonCode: event.rawSignal?.reasonCode,
        createdAt: event.createdAt,
        mitre_technique: (inv as any)?.mitre_technique || '',
        mitre_tactic: (inv as any)?.mitre_tactic || '',
        aiSummary: (inv as any)?.aiSummary || '',
        verdict: (judg as any)?.verdict || 'unknown',
        confidence: (judg as any)?.confidence || 0,
        status: event.status
      };
    }));

    // --- Group by source IP ---
    const ipGroups: Record<string, any[]> = {};
    for (const c of enrichedCases) {
      if (!c.ip) continue;
      if (!ipGroups[c.ip]) ipGroups[c.ip] = [];
      ipGroups[c.ip].push(c);
    }

    // --- Group by target asset subnet ---
    const subnetGroups: Record<string, any[]> = {};
    for (const c of enrichedCases) {
      if (!c.subnet) continue;
      if (!subnetGroups[c.subnet]) subnetGroups[c.subnet] = [];
      subnetGroups[c.subnet].push(c);
    }

    // Build candidate groups — discard singletons
    const candidateGroups: CaseGroup[] = [];

    for (const [ip, cases] of Object.entries(ipGroups)) {
      if (cases.length >= 2) {
        candidateGroups.push({ groupKey: `ip:${ip}`, cases: cases.sort(byTime) });
      }
    }
    for (const [subnet, cases] of Object.entries(subnetGroups)) {
      if (cases.length >= 2) {
        // For subnet groups, require:
        // 1. Cases come from at LEAST 2 different IPs (otherwise it's already covered by ipGroups)
        // 2. Cases show at LEAST 2 distinct reason codes / MITRE stages (diversity requirement)
        //    — prevents 3 unrelated "same-type" events from forming a false campaign
        const uniqueIps = new Set(cases.map((c: any) => c.ip)).size;
        const uniqueReasonCodes = new Set(cases.map((c: any) => c.reasonCode).filter(Boolean)).size;
        const uniqueMitre = new Set(cases.map((c: any) => c.mitre_technique?.match(/T\d{4}/)?.[0]).filter(Boolean)).size;
        const hasDiversity = (uniqueReasonCodes >= 2 || uniqueMitre >= 2);

        if (uniqueIps >= 2 && hasDiversity) {
          // Only add if it doesn't completely overlap an IP group already added
          const alreadyCovered = candidateGroups.some(g =>
            g.cases.every((c: any) => cases.some((s: any) => s.id === c.id))
          );
          if (!alreadyCovered) {
            candidateGroups.push({ groupKey: `subnet:${subnet}`, cases: cases.sort(byTime) });
          }
        }
      }
    }

    if (candidateGroups.length === 0) {
      return {
        campaigns_detected: 0,
        campaigns: [],
        groups_analyzed: 0,
        message: 'All events are singletons — no correlated groups detected.'
      };
    }

    // Analyze each candidate group with LLM
    const detectedCampaigns: any[] = [];

    for (const group of candidateGroups) {
      const result = await analyzeGroupWithLLM(group);

      if (result && result.campaign_detected) {
        // Check if we already have this exact campaign (same involved cases)
        const caseIdsSorted = result.involved_case_ids.sort().join(',');
        const existing = await Campaign.findOne({
          involved_case_ids: { $all: result.involved_case_ids }
        });

        if (!existing) {
          const campaign = await Campaign.create({
            campaign_id: `CAMP-${randomUUID().substring(0, 8).toUpperCase()}`,
            detected_at: new Date(),
            confidence: result.confidence,
            attack_chain_narrative: result.attack_chain_narrative,
            mitre_chain: result.mitre_chain || [],
            involved_case_ids: result.involved_case_ids.map((id: string) => {
              // Convert string ids back to ObjectId-compatible format
              return id;
            }),
            status: 'active',
            reasoning: result.reasoning,
            source_group: group.groupKey
          });

          detectedCampaigns.push({
            campaign_id: campaign.campaign_id,
            confidence: campaign.confidence,
            attack_chain_narrative: campaign.attack_chain_narrative,
            mitre_chain: campaign.mitre_chain,
            involved_case_ids: result.involved_case_ids,
            source_group: group.groupKey
          });

          console.log(`[Correlator] Campaign detected: ${campaign.campaign_id} (confidence: ${result.confidence}%)`);
        } else {
          console.log(`[Correlator] Campaign already exists for group ${group.groupKey} — skipping`);
        }
      }
    }

    return {
      campaigns_detected: detectedCampaigns.length,
      campaigns: detectedCampaigns,
      groups_analyzed: candidateGroups.length,
      message: detectedCampaigns.length > 0
        ? `${detectedCampaigns.length} campaign(s) detected across ${candidateGroups.length} correlated groups`
        : `${candidateGroups.length} group(s) analyzed — no coordinated campaigns confirmed`
    };

  } catch (err) {
    console.error('[CampaignCorrelator] Fatal error:', err);
    return {
      campaigns_detected: 0,
      campaigns: [],
      groups_analyzed: 0,
      message: 'Correlator error — proceeding without campaign detection.'
    };
  }
}

/**
 * Sends a case group to the LLM for campaign analysis.
 * Returns null on LLM error (graceful degradation).
 */
async function analyzeGroupWithLLM(group: CaseGroup): Promise<any | null> {
  const orderedCaseList = group.cases.map((c: any, i: number) => ({
    index: i + 1,
    case_id: c.id,
    timestamp: c.createdAt,
    source_ip: c.ip,
    reason_code: c.reasonCode,
    mitre_technique: c.mitre_technique,
    mitre_tactic: c.mitre_tactic,
    verdict: c.verdict,
    confidence: c.confidence,
    summary: c.aiSummary?.substring(0, 200) || ''
  }));

  const prompt = `You are a security analyst reviewing a sequence of alerts that may or may not be part of one coordinated attack campaign.

Here is the ordered sequence of alerts from the same source/subnet over the last 24 hours:
${JSON.stringify(orderedCaseList, null, 2)}

Known MITRE ATT&CK attack chain patterns to consider (non-exhaustive):
Reconnaissance (T1595) → Initial Access (T1190/T1566) → Credential Access (T1110) →
Lateral Movement (T1021) → OT/ICS Command Injection (T0855) → Impact (T1486)

Respond ONLY with JSON in this exact shape, no other text:
{
  "campaign_detected": true or false,
  "confidence": 0-100,
  "attack_chain_narrative": "one paragraph, plain English, describing the progression if detected",
  "mitre_chain": ["T1595", "T1110", ...],
  "involved_case_ids": ["...", "..."],
  "reasoning": "why these alerts do or do not form a coherent campaign"
}`;

  try {
    if (!process.env.LLM_API_KEY) {
      // No LLM key — use deterministic fallback
      return deterministicCampaignCheck(group);
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const parsed = JSON.parse(text);

    // Ensure involved_case_ids are populated if LLM skipped them
    if (!parsed.involved_case_ids || parsed.involved_case_ids.length === 0) {
      parsed.involved_case_ids = group.cases.map((c: any) => c.id);
    }

    return parsed;
  } catch (err: any) {
    const isRateLimit = err?.status === 429;
    console.warn(`[CampaignCorrelator] LLM ${isRateLimit ? 'rate-limited' : 'error'} for group ${group.groupKey} — using deterministic fallback`);
    return deterministicCampaignCheck(group);
  }
}

/**
 * Deterministic fallback — called when LLM is unavailable/rate-limited.
 * Uses the known MITRE kill chain sequence to detect campaigns.
 */
function deterministicCampaignCheck(group: CaseGroup): any {
  const techniquesPresent = new Set(
    group.cases.map((c: any) => c.mitre_technique?.match(/T\d{4}/)?.[0]).filter(Boolean)
  );
  const reasonCodes = new Set(group.cases.map((c: any) => c.reasonCode).filter(Boolean));

  const hasRecon = reasonCodes.has('PORT_SCAN') || techniquesPresent.has('T1595') || techniquesPresent.has('T1046');
  const hasBrute = reasonCodes.has('BRUTE_FORCE_PATTERN') || techniquesPresent.has('T1110');
  const hasLateral = reasonCodes.has('LATERAL_MOVEMENT') || techniquesPresent.has('T1021');
  const hasImpact = reasonCodes.has('OT_PROTOCOL_VIOLATION') || techniquesPresent.has('T1486') || techniquesPresent.has('T0855');

  const stageCount = [hasRecon, hasBrute, hasLateral, hasImpact].filter(Boolean).length;
  const campaign_detected = stageCount >= 2;
  const confidence = stageCount === 4 ? 92 : stageCount === 3 ? 75 : stageCount === 2 ? 55 : 20;

  const chain: string[] = [];
  if (hasRecon) chain.push('T1595');
  if (hasBrute) chain.push('T1110');
  if (hasLateral) chain.push('T1021');
  if (hasImpact) chain.push('T1486');

  return {
    campaign_detected,
    confidence,
    attack_chain_narrative: campaign_detected
      ? `Deterministic analysis detected a ${stageCount}-stage attack chain: ${chain.join(' → ')}. Multiple alerts from the same source/subnet form a recognizable kill-chain progression consistent with a coordinated campaign.`
      : 'Deterministic analysis: alerts share origin but do not follow a recognizable kill-chain sequence. Likely repeated isolated events rather than a coordinated campaign.',
    mitre_chain: chain,
    involved_case_ids: group.cases.map((c: any) => c.id),
    reasoning: `Deterministic fallback (LLM unavailable): ${stageCount} distinct MITRE stages identified. Stages: Recon=${hasRecon}, BruteForce=${hasBrute}, Lateral=${hasLateral}, Impact=${hasImpact}.`
  };
}

// Helpers
function byTime(a: any, b: any) {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function extractSubnet(ip: string | undefined): string | null {
  if (!ip) return null;
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  // Group by /24 subnet (first 3 octets)
  return parts.slice(0, 3).join('.');
}
