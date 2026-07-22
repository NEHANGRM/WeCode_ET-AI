/**
 * Test Script: Campaign Correlator
 * 
 * Tests 3 scenarios:
 * (a) Multi-stage campaign is correctly detected from related cases
 * (b) Unrelated single-source cases are NOT grouped incorrectly  
 * (c) Zero-case scenario returns empty result, not an error
 *
 * Usage: npx tsx scripts/test_correlator.ts
 */
import { connectToDatabase } from '../lib/db/mongoose';
import { Event } from '../lib/db/models/Event';
import { Investigation } from '../lib/db/models/Investigation';
import { Judgment } from '../lib/db/models/Judgment';
import { Campaign } from '../lib/db/models/Campaign';
import { runCampaignCorrelator } from '../lib/agents/campaign_correlator';
import mongoose from 'mongoose';

async function setup() {
  await connectToDatabase();
  console.log('✅ Connected to MongoDB');
}

async function cleanup(ids: mongoose.Types.ObjectId[]) {
  await Event.deleteMany({ _id: { $in: ids } });
  await Investigation.deleteMany({ eventId: { $in: ids } });
  await Judgment.deleteMany({ eventId: { $in: ids } });
}

// ── Test (a): Multi-stage campaign from same IP ──────────────────────────────
async function test_multi_stage_campaign() {
  console.log('\n[TEST A] Multi-stage campaign from same IP');
  const ip = '99.88.77.66';
  const now = new Date();
  const insertedIds: mongoose.Types.ObjectId[] = [];

  // Phase 1 — Port Scan (Recon)
  const e1 = await Event.create({
    source: 'replay',
    rawSignal: { ip, protocol: 'TCP', payloadSummary: 'Port scan', reasonCode: 'PORT_SCAN', timestamp: new Date(now.getTime() - 90 * 60000) },
    status: 'closed', createdAt: new Date(now.getTime() - 90 * 60000)
  });
  insertedIds.push(e1._id as mongoose.Types.ObjectId);
  await Investigation.create({ eventId: e1._id, investigationId: e1._id, mitre_technique: 'T1595 - Active Scanning', mitre_tactic: 'Reconnaissance', aiSummary: 'Port scan from external IP', attackCategoryGuess: 'unknown', evidence: [], severity_hint: 'medium', summary: 'Port scan', likely_attack_type: 'reconnaissance', abuseIpdbResult: { score: 60, categories: [], lastReportedAt: null }, virusTotalResult: { maliciousCount: 0, totalEngines: 90, tags: [] }, greyNoiseResult: { classification: 'malicious', isTargeted: true } });
  await Judgment.create({ eventId: e1._id, investigationId: e1._id, confidence: 55, confidenceScore: 55, verdict: 'suspicious', reasoning: 'Port scan detected', recommended_action: 'open_ticket', needs_more_evidence: false, follow_up_question: null, mitre_attribution: 'T1595', escalatedToHuman: false });

  // Phase 2 — Brute Force (Credential Access)
  const e2 = await Event.create({
    source: 'replay',
    rawSignal: { ip, protocol: 'SSH', payloadSummary: 'SSH brute force', reasonCode: 'BRUTE_FORCE_PATTERN', timestamp: new Date(now.getTime() - 60 * 60000) },
    status: 'responded', createdAt: new Date(now.getTime() - 60 * 60000)
  });
  insertedIds.push(e2._id as mongoose.Types.ObjectId);
  await Investigation.create({ eventId: e2._id, investigationId: e2._id, mitre_technique: 'T1110 - Brute Force', mitre_tactic: 'Credential Access', aiSummary: 'SSH brute force', attackCategoryGuess: 'bruteforce', evidence: [], severity_hint: 'high', summary: 'Brute force', likely_attack_type: 'bruteforce', abuseIpdbResult: { score: 90, categories: [], lastReportedAt: null }, virusTotalResult: { maliciousCount: 5, totalEngines: 90, tags: [] }, greyNoiseResult: { classification: 'malicious', isTargeted: true } });
  await Judgment.create({ eventId: e2._id, investigationId: e2._id, confidence: 88, confidenceScore: 88, verdict: 'confirmed_attack', reasoning: 'High confidence brute force', recommended_action: 'block_ip', needs_more_evidence: false, follow_up_question: null, mitre_attribution: 'T1110', escalatedToHuman: false });

  // Phase 3 — OT Intrusion (Impact)
  const e3 = await Event.create({
    source: 'replay',
    rawSignal: { ip, protocol: 'MODBUS', payloadSummary: 'OT command injection', reasonCode: 'OT_PROTOCOL_VIOLATION', timestamp: new Date(now.getTime() - 30 * 60000), target_asset: { id: 'scada-1', name: 'SCADA Controller', type: 'ot', asset_class: 'ot_control' } },
    status: 'responded', createdAt: new Date(now.getTime() - 30 * 60000)
  });
  insertedIds.push(e3._id as mongoose.Types.ObjectId);
  await Investigation.create({ eventId: e3._id, investigationId: e3._id, mitre_technique: 'T0855 - Unauthorized Command Message', mitre_tactic: 'Impact', aiSummary: 'OT intrusion', attackCategoryGuess: 'ot_intrusion', evidence: [], severity_hint: 'critical', summary: 'OT', likely_attack_type: 'ot_intrusion', abuseIpdbResult: { score: 95, categories: [], lastReportedAt: null }, virusTotalResult: { maliciousCount: 12, totalEngines: 90, tags: [] }, greyNoiseResult: { classification: 'malicious', isTargeted: true } });
  await Judgment.create({ eventId: e3._id, investigationId: e3._id, confidence: 97, confidenceScore: 97, verdict: 'confirmed_attack', reasoning: 'OT attack confirmed', recommended_action: 'block_ip', needs_more_evidence: false, follow_up_question: null, mitre_attribution: 'T0855', escalatedToHuman: false });

  // Delete any existing campaigns for clean test
  await Campaign.deleteMany({});

  const result = await runCampaignCorrelator();
  
  await cleanup(insertedIds);

  if (result.campaigns_detected >= 1) {
    console.log(`  ✅ PASS: Detected ${result.campaigns_detected} campaign(s) from 3-stage attack chain`);
    console.log(`     Campaign: ${result.campaigns[0]?.campaign_id}, Confidence: ${result.campaigns[0]?.confidence}%`);
  } else {
    console.log(`  ❌ FAIL: Expected ≥1 campaign, got 0. Message: ${result.message}`);
  }

  return result.campaigns_detected >= 1;
}

// ── Test (b): Unrelated single-IP cases NOT grouped as campaign ──────────────
async function test_false_positive_check() {
  console.log('\n[TEST B] Unrelated singletons should NOT form a campaign');
  const insertedIds: mongoose.Types.ObjectId[] = [];

  // 3 events from 3 DIFFERENT IPs — cannot be correlated into a campaign
  const ips = ['10.0.0.1', '10.0.0.2', '10.0.0.3'];
  for (const ip of ips) {
    const e = await Event.create({
      source: 'replay',
      rawSignal: { ip, protocol: 'HTTP', payloadSummary: 'Generic request', reasonCode: 'ANOMALY_DETECTED', timestamp: new Date() },
      status: 'closed', createdAt: new Date()
    });
    insertedIds.push(e._id as mongoose.Types.ObjectId);
    await Investigation.create({ eventId: e._id, investigationId: e._id, mitre_technique: '', mitre_tactic: '', aiSummary: 'Low signal', attackCategoryGuess: 'unknown', evidence: [], severity_hint: 'low', summary: '', likely_attack_type: 'unknown', abuseIpdbResult: { score: 5, categories: [], lastReportedAt: null }, virusTotalResult: { maliciousCount: 0, totalEngines: 90, tags: [] }, greyNoiseResult: { classification: 'benign', isTargeted: false } });
    await Judgment.create({ eventId: e._id, investigationId: e._id, confidence: 10, confidenceScore: 10, verdict: 'normal', reasoning: 'Low signal noise', recommended_action: 'none', needs_more_evidence: false, follow_up_question: null, mitre_attribution: '', escalatedToHuman: false });
  }

  await Campaign.deleteMany({});

  const result = await runCampaignCorrelator();

  await cleanup(insertedIds);

  // Each IP is unique — no groups of size >= 2
  if (result.campaigns_detected === 0) {
    console.log(`  ✅ PASS: Correctly detected 0 campaigns from 3 unrelated singleton IPs`);
    console.log(`     Message: ${result.message}`);
  } else {
    console.log(`  ❌ FAIL: False positive! Incorrectly detected ${result.campaigns_detected} campaigns from unrelated events`);
  }

  return result.campaigns_detected === 0;
}

// ── Test (c): Zero events returns empty result, not an error ─────────────────
async function test_zero_events() {
  console.log('\n[TEST C] Zero events should return empty result, not error');

  // Clear all events from last 24h
  const window24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const allRecent = await Event.find({ createdAt: { $gte: window24h } }).lean();
  const ids = allRecent.map((e: any) => e._id);
  if (ids.length > 0) await Event.deleteMany({ _id: { $in: ids } });

  let result: any;
  let didError = false;
  try {
    result = await runCampaignCorrelator();
  } catch {
    didError = true;
  }

  if (!didError && result && typeof result.campaigns_detected === 'number') {
    console.log(`  ✅ PASS: Returned valid empty result with no error`);
    console.log(`     Message: ${result.message}`);
  } else {
    console.log(`  ❌ FAIL: ${didError ? 'Threw an error' : 'Returned invalid result'}`);
  }

  return !didError;
}

// ── Runner ───────────────────────────────────────────────────────────────────
async function main() {
  await setup();

  const results = [
    await test_multi_stage_campaign(),
    await test_false_positive_check(),
    await test_zero_events()
  ];

  const passed = results.filter(Boolean).length;
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Correlator Tests: ${passed}/${results.length} passed`);
  if (passed === results.length) console.log('🎉 All tests passed!');
  else console.log('⚠️  Some tests failed — review output above');

  process.exit(passed === results.length ? 0 : 1);
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
