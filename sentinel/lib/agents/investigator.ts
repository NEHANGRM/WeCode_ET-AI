import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkAbuseIPDB } from '../integrations/abuseipdb';
import { checkVirusTotal } from '../integrations/virustotal';
import { checkGreyNoise } from '../integrations/greynoise';

const genAI = new GoogleGenerativeAI(process.env.LLM_API_KEY || '');

export interface InvestigatorResult {
  // Raw API responses — displayed as-is to judges (credibility anchor)
  abuseIpdbResult: {
    score: number;
    categories: number[];
    lastReportedAt: Date | null;
    raw?: any;
  };
  virusTotalResult: {
    maliciousCount: number;
    totalEngines: number;
    tags: string[];
    raw?: any;
  };
  greyNoiseResult: {
    classification: string;
    isTargeted: boolean;
    raw?: any;
  };
  // LLM synthesis
  aiSummary: string;
  attackCategoryGuess: 'ddos' | 'bruteforce' | 'exfiltration' | 'ransomware_staging' | 'apt_campaign' | 'ot_intrusion' | 'unknown';
  // Extended fields per spec
  summary: string;
  likely_attack_type: string;
  evidence: string[];
  severity_hint: 'critical' | 'high' | 'medium' | 'low';
  mitre_technique: string;   // e.g. "T1110 - Brute Force"
  mitre_tactic: string;      // e.g. "TA0006 - Credential Access"
}

// MITRE ATT&CK mapping for attack categories
const MITRE_MAP: Record<string, { technique: string; tactic: string }> = {
  'ddos':               { technique: 'T1498 - Network Denial of Service', tactic: 'TA0040 - Impact' },
  'bruteforce':         { technique: 'T1110 - Brute Force', tactic: 'TA0006 - Credential Access' },
  'exfiltration':       { technique: 'T1041 - Exfiltration Over C2 Channel', tactic: 'TA0010 - Exfiltration' },
  'ransomware_staging': { technique: 'T1486 - Data Encrypted for Impact', tactic: 'TA0040 - Impact' },
  'apt_campaign':       { technique: 'T1071 - Application Layer Protocol', tactic: 'TA0011 - Command and Control' },
  'ot_intrusion':       { technique: 'T0855 - Unauthorized Command Message', tactic: 'TA0105 - Inhibit Response Function' },
  'unknown':            { technique: 'T1499 - Endpoint Denial of Service', tactic: 'TA0040 - Impact' },
};

export async function runInvestigator(
  ip: string,
  signalSummary: string,
  reasonCode?: string,
  specificQuestion?: string
): Promise<InvestigatorResult> {

  // 1. Gather Threat Intel from all three sources in parallel
  const [abuse, vt, gn] = await Promise.all([
    checkAbuseIPDB(ip),
    checkVirusTotal(ip),
    checkGreyNoise(ip)
  ]);

  // 2. Build evidence array from raw results
  const evidence: string[] = [];
  if (abuse.score > 0) evidence.push(`AbuseIPDB: ${abuse.score}% abuse confidence score (${abuse.categories.length} category reports)`);
  if (vt.maliciousCount > 0) evidence.push(`VirusTotal: ${vt.maliciousCount}/${vt.totalEngines} security engines flagged as malicious`);
  if (gn.classification === 'malicious') evidence.push(`GreyNoise: IP classified as targeted malicious — not background noise`);
  if (gn.classification === 'benign') evidence.push(`GreyNoise: IP is known benign internet scanner (Shodan/Censys type)`);
  if (reasonCode) evidence.push(`Watcher Rule: ${reasonCode} — ${signalSummary}`);

  // 3. LLM synthesis (with structured JSON output)
  const prompt = `
You are a cybersecurity investigator agent analyzing a network security incident.

Incident Signal:
- Source IP: ${ip}
- Watcher Rule Triggered: ${reasonCode || 'ANOMALY_DETECTED'}
- Payload Summary: ${signalSummary}

Threat Intelligence Results:
- AbuseIPDB Abuse Confidence Score: ${abuse.score}/100 (categories: ${abuse.categories.join(', ') || 'none'})
- VirusTotal: ${vt.maliciousCount}/${vt.totalEngines} security engines flagged this IP as malicious (tags: ${vt.tags.join(', ') || 'none'})
- GreyNoise Classification: ${gn.classification} | Targeted attack: ${gn.isTargeted}

${specificQuestion ? `PRIORITY FOLLOW-UP from Judge: "${specificQuestion}" — address this specifically in your summary.` : ''}

Based on this evidence, provide a structured investigation report.

Return ONLY valid JSON with this exact schema (no markdown, no backticks):
{
  "summary": "2-3 sentence technical synthesis of what is happening",
  "likely_attack_type": "ddos" | "bruteforce" | "exfiltration" | "ransomware_staging" | "apt_campaign" | "ot_intrusion" | "unknown",
  "severity_hint": "critical" | "high" | "medium" | "low",
  "confidence_basis": "what key evidence drives the conclusion",
  "mitre_note": "specific MITRE ATT&CK technique if identifiable, or empty string"
}`;

  let aiSummary: string;
  let attackCategory: InvestigatorResult['attackCategoryGuess'] = 'unknown';
  let severity: InvestigatorResult['severity_hint'] = 'medium';

  try {
    if (!process.env.LLM_API_KEY) throw new Error('No LLM key — using fallback');

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());

    aiSummary = parsed.summary || '';
    attackCategory = (parsed.likely_attack_type || 'unknown') as InvestigatorResult['attackCategoryGuess'];
    severity = (parsed.severity_hint || 'medium') as InvestigatorResult['severity_hint'];
    if (parsed.confidence_basis) evidence.push(`AI Analysis: ${parsed.confidence_basis}`);

  } catch (error) {
    console.error('[Investigator] LLM error — using rule-based fallback:', error);

    // Deterministic fallback based on threat intel scores
    if (abuse.score >= 80 || vt.maliciousCount >= 5 || gn.classification === 'malicious') {
      severity = 'critical';
      if (signalSummary.toLowerCase().includes('flood') || signalSummary.toLowerCase().includes('syn')) {
        attackCategory = 'ddos';
        aiSummary = `High-confidence DDoS attack detected from ${ip}. AbuseIPDB score of ${abuse.score}/100 with ${vt.maliciousCount} VT engine detections confirms this is a known malicious actor. Traffic pattern matches volumetric flooding targeting network infrastructure.`;
      } else if (signalSummary.toLowerCase().includes('login') || signalSummary.toLowerCase().includes('brute')) {
        attackCategory = 'bruteforce';
        aiSummary = `Brute force credential attack from ${ip} (AbuseIPDB: ${abuse.score}/100). GreyNoise classifies this as ${gn.classification} targeted activity. Pattern consistent with MITRE T1110 credential stuffing campaign.`;
      } else if (signalSummary.toLowerCase().includes('modbus') || signalSummary.toLowerCase().includes('plc') || reasonCode === 'OT_PROTOCOL_VIOLATION') {
        attackCategory = 'ot_intrusion';
        aiSummary = `Critical OT system intrusion attempt from ${ip}. Unauthorized industrial protocol commands detected targeting ICS/SCADA infrastructure. This matches MITRE ICS T0855 pattern — could disrupt physical operations.`;
      } else if (signalSummary.toLowerCase().includes('ransom') || signalSummary.toLowerCase().includes('encrypt')) {
        attackCategory = 'ransomware_staging';
        aiSummary = `Ransomware staging activity detected from ${ip}. IP has ${abuse.score}/100 abuse score with ${vt.maliciousCount} malicious engine detections. This matches the pre-encryption reconnaissance phase seen in the AIIMS Delhi 2022 attack pattern.`;
      } else {
        aiSummary = `Confirmed malicious activity from ${ip}. AbuseIPDB: ${abuse.score}/100, VirusTotal: ${vt.maliciousCount}/${vt.totalEngines} engines, GreyNoise: ${gn.classification}. Threat intelligence strongly indicates targeted attack rather than background scanning.`;
      }
    } else if (abuse.score >= 20 || vt.maliciousCount >= 1) {
      severity = 'medium';
      aiSummary = `Suspicious activity from ${ip} with moderate threat signals. AbuseIPDB score ${abuse.score}/100, ${vt.maliciousCount} VT detections. GreyNoise shows ${gn.classification} classification. Activity warrants investigation but evidence is not conclusive.`;
    } else {
      severity = 'low';
      attackCategory = 'unknown';
      aiSummary = `Low-threat activity from ${ip}. No significant threat intelligence — AbuseIPDB: ${abuse.score}/100, VirusTotal: ${vt.maliciousCount} detections, GreyNoise: ${gn.classification}. Likely background internet noise or misconfiguration.`;
    }
  }

  const mitre = MITRE_MAP[attackCategory] || MITRE_MAP['unknown'];

  return {
    abuseIpdbResult: abuse,
    virusTotalResult: vt,
    greyNoiseResult: gn,
    aiSummary,
    attackCategoryGuess: attackCategory,
    summary: aiSummary,
    likely_attack_type: attackCategory,
    evidence,
    severity_hint: severity,
    mitre_technique: mitre.technique,
    mitre_tactic: mitre.tactic
  };
}
