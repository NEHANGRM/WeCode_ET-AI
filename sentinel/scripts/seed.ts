import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/db/mongoose';
import { Event } from '../lib/db/models/Event';
import { Investigation } from '../lib/db/models/Investigation';
import { Judgment } from '../lib/db/models/Judgment';
import { Action } from '../lib/db/models/Action';
import { AuditRecord } from '../lib/db/models/AuditRecord';
import { Campaign } from '../lib/db/models/Campaign';
import { appendToChain } from '../lib/hashChain';

const SCENARIOS = [
  // ─── AIIMS Delhi Phase 1: Reconnaissance ───
  {
    signal: {
      ip: '185.150.11.23',
      protocol: 'TCP',
      payloadSummary: 'Sequential port scan targeting hospital network range 10.2.0.0/16 — 4,700 ports probed in 90 seconds',
      timestamp: new Date(Date.now() - 70 * 60000),
      reasonCode: 'PORT_SCAN',
      event_type: 'port_scan',
      target_asset: { id: 'WEB-DMZ-01', name: 'Patient Portal Web Server', type: 'web_server', asset_class: 'dmz' }
    },
    source: 'replay',
    status: 'closed',
    investigation: {
      abuseIpdbResult: { score: 100, categories: [14], lastReportedAt: new Date() },
      virusTotalResult: { maliciousCount: 8, totalEngines: 94, tags: ['scanner', 'botnet'] },
      greyNoiseResult: { classification: 'malicious', isTargeted: true },
      aiSummary: 'Known malicious IP (AbuseIPDB: 100%) conducting systematic reconnaissance of hospital network. Port enumeration pattern consistent with MITRE T1046 Network Service Scanning — the first phase of the AIIMS Delhi 2022 kill chain.',
      attackCategoryGuess: 'unknown',
      summary: 'Systematic port scan from confirmed malicious actor — likely pre-attack reconnaissance.',
      likely_attack_type: 'unknown',
      evidence: ['AbuseIPDB: 100% abuse confidence — multiple report categories', 'VirusTotal: 8/94 engines flagged as malicious', 'GreyNoise: confirmed targeted malicious — not background noise', 'Watcher Rule: PORT_SCAN — 4,700 ports probed in 90 seconds'],
      severity_hint: 'high',
      mitre_technique: 'T1046 - Network Service Scanning',
      mitre_tactic: 'TA0007 - Discovery',
      retryCount: 0
    },
    judgment: {
      confidence: 18,
      confidenceScore: 18,
      verdict: 'normal',
      reasoning: 'Port scan detected from known bad IP but no active exploitation yet. Classified as reconnaissance noise at this stage. Low confidence without further attack signals.',
      recommended_action: 'none',
      escalatedToHuman: false,
      mitre_attribution: 'T1046 - Network Service Scanning'
    },
    action: null
  },

  // ─── AIIMS Delhi Phase 2: Credential Attack ───
  {
    signal: {
      ip: '185.150.11.23',
      protocol: 'HTTPS',
      payloadSummary: '847 failed login attempts against EHR admin panel in 60 seconds — credential stuffing with known hospital employee usernames',
      timestamp: new Date(Date.now() - 55 * 60000),
      reasonCode: 'BRUTE_FORCE_PATTERN',
      event_type: 'failed_login',
      target_asset: { id: 'EHR-SRV-01', name: 'Electronic Health Records Server', type: 'application_server', asset_class: 'general_network' }
    },
    source: 'replay',
    status: 'responded',
    investigation: {
      abuseIpdbResult: { score: 100, categories: [18, 3, 4], lastReportedAt: new Date() },
      virusTotalResult: { maliciousCount: 8, totalEngines: 94, tags: ['botnet', 'ransomware'] },
      greyNoiseResult: { classification: 'malicious', isTargeted: true },
      aiSummary: 'High-confidence brute force credential stuffing attack from confirmed APT-linked IP (AbuseIPDB 100%). Same IP performed reconnaissance 15 minutes earlier — this is a continued kill chain. Pattern matches MITRE T1110.004 Credential Stuffing targeting EHR systems, consistent with AIIMS Delhi 2022 attack signature.',
      attackCategoryGuess: 'bruteforce',
      summary: '847 failed logins in 60 seconds from a known ransomware group — active kill chain in progress.',
      likely_attack_type: 'bruteforce',
      evidence: ['AbuseIPDB: 100% abuse score (categories: 18 bruteforce, 3 fraud)', 'VirusTotal: 8/94 — tagged as ransomware botnet', 'GreyNoise: TARGETED malicious — not background', 'Same IP performed port scan 15 min ago (correlated)', 'Watcher: 847 failed logins in 60 seconds exceeds 5-attempt threshold'],
      severity_hint: 'critical',
      mitre_technique: 'T1110.004 - Credential Stuffing',
      mitre_tactic: 'TA0006 - Credential Access',
      retryCount: 0,
      aptCorrelation: {
        aptSuspicion: true,
        aptScore: 72,
        correlatedEvents: ['Port scan 15 min ago from same IP'],
        reasoning: 'PORT_SCAN followed by BRUTE_FORCE from same IP within 20 minutes — classic APT kill chain: Recon → Initial Access (MITRE TA0001)',
        mitreStage: 'TA0043 — Reconnaissance + TA0001 — Initial Access'
      }
    },
    judgment: {
      confidence: 93,
      confidenceScore: 93,
      verdict: 'confirmed_attack',
      reasoning: 'AbuseIPDB 100% + VT 8/94 malicious + GreyNoise targeted + correlated with prior port scan + 847 credential attempts in 60s. Overwhelming evidence of active attack in kill chain.',
      recommended_action: 'block_ip',
      escalatedToHuman: false,
      mitre_attribution: 'T1110.004 - Credential Stuffing',
      plainEnglishSummary: 'Our security system has detected a sophisticated hacking group making hundreds of repeated attempts to guess login credentials for the hospital\'s patient records system — the same type of attack that hit AIIMS Delhi in 2022. The source has been automatically blocked and no accounts were compromised.'
    },
    action: {
      actionType: 'block_ip',
      originalRecommendation: 'block_ip',
      approvedBy: 'system_auto',
      status: 'simulated',
      policyCheck: { passed: true, reason: 'block_ip is permitted on general_network assets', assetClass: 'general_network' },
      executionLog: [
        '[Responder] Judge recommended: "block_ip" with confidence 93/100',
        '[Policy] Asset class: "general_network" | Action "block_ip": PERMITTED — block_ip is permitted on general_network assets',
        '[EXECUTED] block_ip: Added 185.150.11.23 to blocklist. All traffic from this source is now denied at the perimeter firewall.',
        '[SIMULATED] iptables -A INPUT -s 185.150.11.23 -j DROP'
      ]
    }
  },

  // ─── AIIMS Delhi Phase 3: OT Lateral Movement (AMBIGUOUS — human review) ───
  {
    signal: {
      ip: '192.168.1.105',
      protocol: 'MODBUS/TCP',
      payloadSummary: 'Unusual MODBUS read coil request from IT workstation (192.168.1.105) to ICU ventilator controller — IT/OT boundary violation',
      timestamp: new Date(Date.now() - 35 * 60000),
      reasonCode: 'OT_PROTOCOL_VIOLATION',
      event_type: 'config_change',
      target_asset: { id: 'ICU-VENT-01', name: 'ICU Ventilator Array A', type: 'life_support', asset_class: 'life_support' }
    },
    source: 'replay',
    status: 'judged',
    investigation: {
      abuseIpdbResult: { score: 0, categories: [], lastReportedAt: null },
      virusTotalResult: { maliciousCount: 0, totalEngines: 94, tags: [] },
      greyNoiseResult: { classification: 'unknown', isTargeted: false },
      aiSummary: 'Internal IP with zero external threat intel attempting MODBUS communication with ICU ventilator controllers. Could be a compromised workstation used for lateral OT movement, or a legitimate misconfiguration. The IT/OT boundary crossing is a critical policy violation regardless of intent. Given the AIIMS context and prior attack activity from this session, lateral movement hypothesis must be treated seriously.',
      attackCategoryGuess: 'ot_intrusion',
      summary: 'IT workstation sending OT commands to ICU ventilators — critical boundary violation requiring immediate human review.',
      likely_attack_type: 'ot_intrusion',
      evidence: ['Internal IP: zero AbuseIPDB score (no external threat intel)', 'VirusTotal: 0/94 — not externally known malicious', 'GreyNoise: unknown classification', 'Watcher: OT_PROTOCOL_VIOLATION — MODBUS from IT subnet', 'Target: LIFE-SUPPORT asset (ICU ventilators) — policy restricts auto-action'],
      severity_hint: 'critical',
      mitre_technique: 'T0855 - Unauthorized Command Message',
      mitre_tactic: 'TA0105 - Inhibit Response Function',
      retryCount: 1,
      aptCorrelation: {
        aptSuspicion: true,
        aptScore: 85,
        correlatedEvents: ['185.150.11.23 port scan 35 min ago', '185.150.11.23 brute force 20 min ago'],
        reasoning: 'PORT_SCAN → BRUTE_FORCE → OT_PROTOCOL_VIOLATION within 70 minutes matches the full MITRE ICS kill chain: Recon → Initial Access → Lateral Movement to OT',
        mitreStage: 'TA0008 — Lateral Movement (T1021 Remote Services)'
      }
    },
    judgment: {
      confidence: 63,
      confidenceScore: 63,
      verdict: 'suspicious',
      reasoning: 'Internal IP with no external threat signals, but critical OT protocol violation targeting life-support systems. Policy mandates human decision for life_support asset class at any confidence level. Could be lateral movement post-compromise or misconfiguration.',
      recommended_action: 'alert_human',
      escalatedToHuman: true,
      mitre_attribution: 'T0855 - Unauthorized Command Message',
      plainEnglishSummary: 'Our security system has detected a hospital computer attempting to send control commands to the ICU\'s ventilator systems — which is not something a regular workstation should be doing. This could indicate a hacker has taken over that computer and is trying to move into the life-support network. A security specialist needs to investigate this immediately. The ventilators themselves have not been affected.'
    },
    action: null
  },

  // ─── CBSE Breach 2026: Data Exfiltration ───
  {
    signal: {
      ip: '45.133.1.50',
      protocol: 'HTTPS/TLS',
      payloadSummary: 'Large outbound TLS transfer to unknown C2 server — 4.7GB student data potentially exfiltrating over 3 hours',
      timestamp: new Date(Date.now() - 20 * 60000),
      reasonCode: 'RATE_LIMIT_EXCEEDED',
      event_type: 'exfiltration',
      target_asset: { id: 'EHR-SRV-01', name: 'Electronic Health Records Server', type: 'application_server', asset_class: 'general_network' }
    },
    source: 'replay',
    status: 'responded',
    investigation: {
      abuseIpdbResult: { score: 85, categories: [14, 15], lastReportedAt: new Date() },
      virusTotalResult: { maliciousCount: 12, totalEngines: 94, tags: ['c2', 'malware'] },
      greyNoiseResult: { classification: 'malicious', isTargeted: true },
      aiSummary: 'High-confidence data exfiltration to confirmed C2 infrastructure. Destination IP has 85% AbuseIPDB abuse score, 12/94 VT engines flag as C2 malware node. Traffic volume (4.7GB) and TLS behavior consistent with MITRE T1041 exfiltration over command-and-control channel. Similar to CBSE 2026 breach pattern.',
      attackCategoryGuess: 'exfiltration',
      summary: '4.7GB outbound to C2 server — active data exfiltration in progress.',
      likely_attack_type: 'exfiltration',
      evidence: ['AbuseIPDB: 85% abuse score (categories: exfiltration, C2)', 'VirusTotal: 12/94 flagged as C2 malware node', 'GreyNoise: targeted malicious', 'Traffic: 4.7GB over 3 hours — anomalous baseline', 'TLS fingerprint matches known Cobalt Strike C2 pattern'],
      severity_hint: 'critical',
      mitre_technique: 'T1041 - Exfiltration Over C2 Channel',
      mitre_tactic: 'TA0010 - Exfiltration',
      retryCount: 0
    },
    judgment: {
      confidence: 89,
      confidenceScore: 89,
      verdict: 'confirmed_attack',
      reasoning: 'AbuseIPDB 85% + VT 12/94 C2 node + GreyNoise targeted + 4.7GB anomalous outbound. Active exfiltration confirmed — block immediately.',
      recommended_action: 'block_ip',
      escalatedToHuman: false,
      mitre_attribution: 'T1041 - Exfiltration Over C2 Channel',
      plainEnglishSummary: 'Our security system detected data being secretly copied out of our servers to an external hacker-controlled server — similar to the CBSE 2026 student data breach. The connection has been blocked immediately. Security staff are investigating how much data may have been copied before the breach was caught.'
    },
    action: {
      actionType: 'block_ip',
      originalRecommendation: 'block_ip',
      approvedBy: 'system_auto',
      status: 'simulated',
      policyCheck: { passed: true, reason: 'block_ip is permitted on general_network assets', assetClass: 'general_network' },
      executionLog: [
        '[Responder] Judge recommended: "block_ip" with confidence 89/100',
        '[Policy] Asset class: "general_network" | Action "block_ip": PERMITTED',
        '[EXECUTED] block_ip: Added 45.133.1.50 to blocklist. Exfiltration channel severed.',
        '[SIMULATED] iptables -A OUTPUT -d 45.133.1.50 -j DROP'
      ]
    }
  },

  // ─── Background noise — Shodan scan (correctly dismissed) ───
  {
    signal: {
      ip: '104.28.19.4',
      protocol: 'TCP',
      payloadSummary: 'Sequential port scan — standard Shodan internet census activity',
      timestamp: new Date(Date.now() - 10 * 60000),
      reasonCode: 'PORT_SCAN',
      event_type: 'port_scan',
      target_asset: null
    },
    source: 'watcher',
    status: 'closed',
    investigation: {
      abuseIpdbResult: { score: 20, categories: [14], lastReportedAt: new Date() },
      virusTotalResult: { maliciousCount: 0, totalEngines: 94, tags: [] },
      greyNoiseResult: { classification: 'benign', isTargeted: false },
      aiSummary: 'Known benign internet census scanner (Shodan/Censys type). AbuseIPDB: 20% — low score consistent with known scanners. GreyNoise confirms benign classification. This is normal background internet noise, not a targeted attack.',
      attackCategoryGuess: 'unknown',
      summary: 'Known benign internet scanner — background noise.',
      likely_attack_type: 'unknown',
      evidence: ['AbuseIPDB: 20% — low, consistent with known scanners', 'VirusTotal: 0/94 — not flagged', 'GreyNoise: BENIGN — confirmed internet scanner'],
      severity_hint: 'low',
      mitre_technique: '',
      mitre_tactic: '',
      retryCount: 0
    },
    judgment: {
      confidence: 12,
      confidenceScore: 12,
      verdict: 'normal',
      reasoning: 'GreyNoise confirms benign scanner. AbuseIPDB 20% is within normal range for Shodan/Censys. No targeted indicators. Background noise.',
      recommended_action: 'none',
      escalatedToHuman: false,
      mitre_attribution: ''
    },
    action: null
  },

  // ─── Power Grid: OT Config Change (high confidence auto-block) ───
  {
    signal: {
      ip: '91.219.236.0',
      protocol: 'DNP3',
      payloadSummary: 'Unauthorized DNP3 configuration write to power substation RTU — could alter protection relay settings',
      timestamp: new Date(Date.now() - 5 * 60000),
      reasonCode: 'OT_PROTOCOL_VIOLATION',
      event_type: 'config_change',
      target_asset: { id: 'OT-RTU-BETA', name: 'Water Treatment RTU', type: 'ot_control', asset_class: 'ot_control' }
    },
    source: 'watcher',
    status: 'responded',
    investigation: {
      abuseIpdbResult: { score: 95, categories: [14, 15, 18], lastReportedAt: new Date() },
      virusTotalResult: { maliciousCount: 15, totalEngines: 94, tags: ['apt', 'c2', 'ics-attack'] },
      greyNoiseResult: { classification: 'malicious', isTargeted: true },
      aiSummary: 'Critical ICS attack: external IP with 95% AbuseIPDB score (APT-tagged, 15/94 VT detections) sending unauthorized configuration commands to OT infrastructure. DNP3 protocol configuration writes could alter protection relay settings, potentially causing physical damage. Matches MITRE ICS T0855.',
      attackCategoryGuess: 'ot_intrusion',
      summary: 'APT-linked IP sending unauthorized OT commands — potential physical infrastructure sabotage.',
      likely_attack_type: 'ot_intrusion',
      evidence: ['AbuseIPDB: 95% — APT-linked infrastructure', 'VirusTotal: 15/94 — tagged as APT C2, ICS attack', 'GreyNoise: TARGETED malicious', 'DNP3 write command to OT RTU — unauthorized configuration change'],
      severity_hint: 'critical',
      mitre_technique: 'T0855 - Unauthorized Command Message',
      mitre_tactic: 'TA0105 - Inhibit Response Function',
      retryCount: 0
    },
    judgment: {
      confidence: 96,
      confidenceScore: 96,
      verdict: 'confirmed_attack',
      reasoning: 'AbuseIPDB 95% + VT 15/94 APT/ICS tags + GreyNoise targeted + unauthorized DNP3 config write. Extremely high confidence OT infrastructure attack. Block IP immediately — policy permits block_ip on ot_control assets.',
      recommended_action: 'block_ip',
      escalatedToHuman: false,
      mitre_attribution: 'T0855 - Unauthorized Command Message',
      plainEnglishSummary: 'Our security system detected a sophisticated cyberattack attempting to remotely reprogram the control systems managing water treatment operations. This type of attack, if successful, could affect water safety for thousands of people. The attack has been blocked automatically and water treatment operations continue normally.'
    },
    action: {
      actionType: 'block_ip',
      originalRecommendation: 'block_ip',
      approvedBy: 'system_auto',
      status: 'simulated',
      policyCheck: { passed: true, reason: 'block_ip is permitted on ot_control assets', assetClass: 'ot_control' },
      executionLog: [
        '[Responder] Judge recommended: "block_ip" with confidence 96/100',
        '[Policy] Asset class: "ot_control" | Action "block_ip": PERMITTED — block_ip is permitted on ot_control assets',
        '[Policy] NOTE: isolate_segment is FORBIDDEN on ot_control assets — would have disrupted physical operations',
        '[EXECUTED] block_ip: Added 91.219.236.0 to blocklist. OT network protected.',
        '[SIMULATED] iptables -A INPUT -s 91.219.236.0 -j DROP'
      ]
    }
  }
];

async function seed() {
  await connectToDatabase();
  console.log('Connected to DB. Clearing old data...');

  await Promise.all([
    Event.deleteMany({}),
    Investigation.deleteMany({}),
    Judgment.deleteMany({}),
    Action.deleteMany({}),
    AuditRecord.deleteMany({}),
    Campaign.deleteMany({})
  ]);

  console.log(`Seeding ${SCENARIOS.length} scenarios...`);

  for (const s of SCENARIOS) {
    const event = await Event.create({
      source: s.source,
      rawSignal: s.signal,
      status: s.status,
      createdAt: s.signal.timestamp
    });

    await appendToChain(event._id, 'Watcher', 'flagged_event', { signal: s.signal });

    const inv = await Investigation.create({
      eventId: event._id,
      ...s.investigation,
      createdAt: new Date(event.createdAt.getTime() + 2000)
    });

    await appendToChain(event._id, 'Investigator', 'investigation_complete', {
      summary: inv.aiSummary,
      severity: inv.severity_hint,
      mitre: inv.mitre_technique
    });

    const jud = await Judgment.create({
      eventId: event._id,
      investigationId: inv._id,
      ...s.judgment,
      createdAt: new Date(inv.createdAt.getTime() + 3000)
    });

    await appendToChain(event._id, 'Judge', 'judgment_rendered', {
      confidence: jud.confidence,
      verdict: jud.verdict,
      recommended_action: jud.recommended_action
    });

    if (jud.escalatedToHuman) {
      await appendToChain(event._id, 'System', 'escalated_to_human', {
        confidence: jud.confidence,
        reason: 'Medium confidence (40-80) — requires human decision'
      });
    }

    if (s.action) {
      const act = await Action.create({
        eventId: event._id,
        judgmentId: jud._id,
        ...s.action,
        createdAt: new Date(jud.createdAt.getTime() + 1000)
      });
      await appendToChain(event._id, 'Responder', 'action_taken', {
        actionType: act.actionType,
        approvedBy: act.approvedBy,
        policyCheck: s.action.policyCheck
      });
      console.log(`  ✓ ${s.signal.ip} → ${s.status} → ${act.actionType}`);
    } else {
      console.log(`  ✓ ${s.signal.ip} → ${s.status} (no action taken)`);
    }
  }

  console.log('\n✅ Seeding complete! Database ready for demo.');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
