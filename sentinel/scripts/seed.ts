import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/db/mongoose';
import { Event } from '../lib/db/models/Event';
import { Investigation } from '../lib/db/models/Investigation';
import { Judgment } from '../lib/db/models/Judgment';
import { Action } from '../lib/db/models/Action';
import { AuditRecord } from '../lib/db/models/AuditRecord';
import { appendToChain } from '../lib/hashChain';

async function seed() {
  await connectToDatabase();
  console.log('Connected to DB. Clearing old data...');

  await Promise.all([
    Event.deleteMany({}),
    Investigation.deleteMany({}),
    Judgment.deleteMany({}),
    Action.deleteMany({}),
    AuditRecord.deleteMany({})
  ]);

  console.log('Seeding new data...');

  const scenarios = [
    // 1. High Confidence: DDoS Attack
    {
      signal: { ip: '185.150.11.23', protocol: 'TCP/SYN', payloadSummary: 'High frequency SYN flood targeting OT Gateway', timestamp: new Date() },
      status: 'responded',
      investigation: {
        abuseIpdbResult: { score: 100, categories: [3, 4], lastReportedAt: new Date() },
        virusTotalResult: { maliciousCount: 0, totalEngines: 90, tags: [] },
        greyNoiseResult: { classification: 'malicious', isTargeted: true },
        aiSummary: 'Rapid SYN flood observed. IP is a known malicious actor specializing in targeted OT disruptions.',
        attackCategoryGuess: 'ddos'
      },
      judgment: {
        confidenceScore: 95,
        verdict: 'confirmed_attack',
        reasoning: '100% AbuseIPDB score and GreyNoise confirms targeted malicious intent matching the traffic pattern.',
        escalatedToHuman: false
      },
      action: {
        actionType: 'block_ip',
        approvedBy: 'system_auto',
        status: 'executed'
      }
    },
    // 2. Medium Confidence: Lateral Movement / Ambiguous
    {
      signal: { ip: '192.168.1.105', protocol: 'MODBUS/TCP', payloadSummary: 'Unusual read coils request from IT subnet', timestamp: new Date(Date.now() - 5 * 60000) },
      status: 'judged',
      investigation: {
        abuseIpdbResult: { score: 0, categories: [], lastReportedAt: null },
        virusTotalResult: { maliciousCount: 0, totalEngines: 90, tags: [] },
        greyNoiseResult: { classification: 'unknown', isTargeted: false },
        aiSummary: 'Internal IP making unusual MODBUS requests. Could be misconfiguration or compromised IT machine pivoting to OT.',
        attackCategoryGuess: 'unknown'
      },
      judgment: {
        confidenceScore: 65,
        verdict: 'suspicious',
        reasoning: 'Internal IP with no external threat intel, but traffic pattern violates segmentation policy. Requires human review.',
        escalatedToHuman: true
      },
      action: null
    },
    // 3. Low Confidence: Background Noise
    {
      signal: { ip: '104.28.19.4', protocol: 'TCP', payloadSummary: 'Sequential port scan', timestamp: new Date(Date.now() - 30 * 60000) },
      status: 'closed',
      investigation: {
        abuseIpdbResult: { score: 20, categories: [14], lastReportedAt: new Date() },
        virusTotalResult: null,
        greyNoiseResult: { classification: 'benign', isTargeted: false },
        aiSummary: 'Known internet scanner (Shodan/Censys). Normal background noise.',
        attackCategoryGuess: 'unknown'
      },
      judgment: {
        confidenceScore: 15,
        verdict: 'normal',
        reasoning: 'Identified as benign internet scanning activity.',
        escalatedToHuman: false
      },
      action: null
    }
  ];

  for (const s of scenarios) {
    const event = await Event.create({
      source: 'watcher',
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

    await appendToChain(event._id, 'Investigator', 'investigation_complete', { summary: inv.aiSummary });

    const jud = await Judgment.create({
      eventId: event._id,
      investigationId: inv._id,
      ...s.judgment,
      createdAt: new Date(inv.createdAt.getTime() + 3000)
    });

    await appendToChain(event._id, 'Judge', 'judgment_rendered', { score: jud.confidenceScore, verdict: jud.verdict });

    if (s.action) {
      const act = await Action.create({
        eventId: event._id,
        judgmentId: jud._id,
        ...s.action,
        createdAt: new Date(jud.createdAt.getTime() + 1000)
      });
      await appendToChain(event._id, 'Responder', 'action_taken', { actionType: act.actionType });
    }
  }

  console.log('Seeding complete.');
  process.exit(0);
}

seed().catch(console.error);
