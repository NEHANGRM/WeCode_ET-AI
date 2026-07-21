import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.LLM_API_KEY || '');

export interface JudgeOutput {
  confidence: number;           // 0-100 — THE canonical field name per spec
  confidenceScore: number;      // alias for backward compat
  reasoning: string;
  recommended_action: 'block_ip' | 'isolate_segment' | 'alert_human' | 'open_ticket' | 'failover' | 'none';
  verdict: 'normal' | 'suspicious' | 'confirmed_attack'; // derived from confidence
  needs_more_evidence: boolean;
  follow_up_question: string | null;
  mitre_attribution: string;    // MITRE technique referenced
  escalatedToHuman: boolean;    // derived
}

export async function runJudge(signal: any, investigation: any): Promise<JudgeOutput> {
  const prompt = `
You are the Judge Agent in a multi-agent cybersecurity defense system protecting critical infrastructure (hospitals, power grids, water treatment facilities).

Your role: Review the evidence and decide whether this is a genuine threat, and if so, what action to take.

=== SIGNAL ===
Source IP: ${signal.ip || signal.source_ip || 'unknown'}
Protocol: ${signal.protocol || 'unknown'}
Watcher Rule: ${signal.reasonCode || signal.payloadSummary || 'unknown'}
Payload: ${signal.payloadSummary || signal.payload_summary || 'no details'}

=== INVESTIGATION EVIDENCE ===
AI Summary: ${investigation.aiSummary || investigation.summary}
Attack Category: ${investigation.attackCategoryGuess || investigation.likely_attack_type}
Severity Hint: ${investigation.severity_hint || 'unknown'}

Threat Intel (raw):
- AbuseIPDB Abuse Score: ${investigation.abuseIpdbResult?.score ?? 'N/A'}/100
- VirusTotal: ${investigation.virusTotalResult?.maliciousCount ?? 'N/A'}/${investigation.virusTotalResult?.totalEngines ?? 0} engines flagged
- GreyNoise: ${investigation.greyNoiseResult?.classification ?? 'unknown'} | Targeted: ${investigation.greyNoiseResult?.isTargeted ?? false}

Evidence Trail:
${(investigation.evidence || []).map((e: string, i: number) => `${i+1}. ${e}`).join('\n')}

MITRE Reference: ${investigation.mitre_technique || 'unknown'}

=== CONFIDENCE SCALE ===
> 80 → Confirmed attack — system will auto-execute action (no human needed)
40–80 → Suspicious — escalate to human review (system will NOT auto-act)
< 40 → Background noise / false positive — log quietly, no alert

=== PERMITTED ACTIONS ===
- block_ip : Block the source IP at perimeter
- isolate_segment : Isolate the network segment (HIGH IMPACT — triggers blast-radius check)
- alert_human : Page the on-call security team
- open_ticket : Create an incident ticket for follow-up
- failover : Trigger system failover (EXTREME — only for imminent service loss)
- none : No action required (use only for confidence < 40)

Return ONLY valid JSON with this exact schema, no markdown:
{
  "confidence": <number 0-100>,
  "reasoning": "<1-2 sentence technical justification citing specific evidence>",
  "recommended_action": "<one of the six actions above>",
  "needs_more_evidence": <true if confidence 40-60 and a specific question to the Investigator would meaningfully change the verdict, otherwise false>,
  "follow_up_question": "<specific investigative question for the Investigator, or null>",
  "mitre_attribution": "<MITRE technique ID and name from the investigation, or inferred>"
}`;

  try {
    if (!process.env.LLM_API_KEY) throw new Error('No LLM key');

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());

    return buildJudgeOutput(parsed);
  } catch (error) {
    console.error('[Judge] LLM error — using deterministic fallback:', error);
    return deterministicFallback(investigation);
  }
}

function buildJudgeOutput(parsed: any): JudgeOutput {
  const confidence = Math.min(100, Math.max(0, Number(parsed.confidence) || 0));
  
  // Code-enforced routing — confidence thresholds enforced HERE, not in the prompt
  let verdict: JudgeOutput['verdict'];
  let escalatedToHuman: boolean;
  
  if (confidence > 80) {
    verdict = 'confirmed_attack';
    escalatedToHuman = false;
  } else if (confidence >= 40) {
    verdict = 'suspicious';
    escalatedToHuman = true;
  } else {
    verdict = 'normal';
    escalatedToHuman = false;
  }

  // Safety override: if needs_more_evidence is true on retry, force a decision anyway
  const needs_more_evidence = Boolean(parsed.needs_more_evidence);

  return {
    confidence,
    confidenceScore: confidence,  // backward compat alias
    reasoning: parsed.reasoning || 'No reasoning provided.',
    recommended_action: parsed.recommended_action || 'alert_human',
    verdict,
    needs_more_evidence,
    follow_up_question: needs_more_evidence ? (parsed.follow_up_question || null) : null,
    mitre_attribution: parsed.mitre_attribution || investigation_mitre(parsed),
    escalatedToHuman
  };
}

function investigation_mitre(parsed: any): string {
  return parsed.mitre_attribution || 'T1499 - Endpoint Denial of Service';
}

function deterministicFallback(investigation: any): JudgeOutput {
  const abuseScore = investigation.abuseIpdbResult?.score ?? 0;
  const vtCount = investigation.virusTotalResult?.maliciousCount ?? 0;
  const gnMalicious = investigation.greyNoiseResult?.classification === 'malicious';
  const severity = investigation.severity_hint || 'medium';

  let confidence: number;
  let recommended_action: JudgeOutput['recommended_action'];

  if (abuseScore >= 80 || (vtCount >= 5 && gnMalicious) || severity === 'critical') {
    confidence = Math.max(85, Math.min(98, abuseScore + vtCount * 2));
    recommended_action = 'block_ip';
  } else if (abuseScore >= 40 || vtCount >= 2 || gnMalicious) {
    confidence = Math.min(75, 40 + abuseScore * 0.5 + vtCount * 5);
    recommended_action = 'alert_human';
  } else if (abuseScore >= 10 || vtCount >= 1) {
    confidence = Math.min(50, 20 + abuseScore * 0.3);
    recommended_action = 'open_ticket';
  } else {
    confidence = Math.max(5, 15 - vtCount);
    recommended_action = 'none';
  }

  const verdict: JudgeOutput['verdict'] = confidence > 80 ? 'confirmed_attack' : confidence >= 40 ? 'suspicious' : 'normal';

  return {
    confidence,
    confidenceScore: confidence,
    reasoning: `Deterministic fallback: AbuseIPDB ${abuseScore}/100, VirusTotal ${vtCount} detections, GreyNoise ${investigation.greyNoiseResult?.classification || 'unknown'} — verdict based on threat intel scores without LLM synthesis.`,
    recommended_action,
    verdict,
    needs_more_evidence: false,
    follow_up_question: null,
    mitre_attribution: investigation.mitre_technique || 'T1499',
    escalatedToHuman: verdict === 'suspicious'
  };
}
