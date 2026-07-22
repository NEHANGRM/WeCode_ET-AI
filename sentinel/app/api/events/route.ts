import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/db/mongoose';
import { Event } from '../../../lib/db/models/Event';
import { Investigation } from '../../../lib/db/models/Investigation';
import { Judgment } from '../../../lib/db/models/Judgment';
import { Action } from '../../../lib/db/models/Action';
import { processEvent } from '../../../lib/agents/pipeline';

// AIIMS Delhi 2022 Ransomware replay scenarios
const AIIMS_SCENARIOS = [
  {
    name: 'AIIMS Phase 1: Reconnaissance',
    ip: '185.150.11.23',
    protocol: 'TCP',
    payloadSummary: 'Sequential port scan targeting hospital network range 10.2.0.0/16',
    event_type: 'port_scan',
    reasonCode: 'PORT_SCAN',
    target_asset: { id: 'WEB-DMZ-01', name: 'Patient Portal Web Server', type: 'web_server', asset_class: 'dmz' },
    delayMs: 0
  },
  {
    name: 'AIIMS Phase 2: Credential Attack',
    ip: '185.150.11.23',
    protocol: 'HTTPS',
    payloadSummary: '847 failed login attempts against EHR admin panel in 60 seconds — credential stuffing attack',
    event_type: 'failed_login',
    reasonCode: 'BRUTE_FORCE_PATTERN',
    target_asset: { id: 'EHR-SRV-01', name: 'Electronic Health Records Server', type: 'application_server', asset_class: 'general_network' },
    delayMs: 3000
  },
  {
    name: 'AIIMS Phase 3: OT Lateral Movement',
    ip: '192.168.1.105',
    protocol: 'MODBUS/TCP',
    payloadSummary: 'Unusual MODBUS write coil request from compromised IT workstation to ICU ventilator controller',
    event_type: 'config_change',
    reasonCode: 'OT_PROTOCOL_VIOLATION',
    target_asset: { id: 'ICU-VENT-01', name: 'ICU Ventilator Array A', type: 'life_support', asset_class: 'life_support' },
    delayMs: 6000
  },
  {
    name: 'AIIMS Phase 4: Ransomware Staging',
    ip: '91.219.236.0',
    protocol: 'SMB',
    payloadSummary: 'Ransomware staging detected — file encryption headers observed on EHR server file shares',
    event_type: 'ransomware_staging',
    reasonCode: 'KNOWN_BAD_IP',
    target_asset: { id: 'EHR-SRV-01', name: 'Electronic Health Records Server', type: 'application_server', asset_class: 'general_network' },
    delayMs: 9000
  }
];

function formatEventForClient(event: any, investigation: any, judgment: any, action: any) {
  return {
    id: event._id.toString(),
    ip: event.rawSignal?.ip,
    protocol: event.rawSignal?.protocol,
    payloadSummary: event.rawSignal?.payloadSummary,
    reasonCode: event.rawSignal?.reasonCode,
    category: investigation?.attackCategoryGuess || 'unknown',
    status: event.status,
    score: judgment?.confidence || judgment?.confidenceScore || null,
    summary: investigation?.aiSummary || investigation?.summary || null,
    time: new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: event.createdAt,
    severity: investigation?.severity_hint || 'unknown',
    mitre_technique: investigation?.mitre_technique || '',
    abuseIpdbResult: investigation?.abuseIpdbResult || null,
    virusTotalResult: investigation?.virusTotalResult || null,
    greyNoiseResult: investigation?.greyNoiseResult || null,
    evidence: investigation?.evidence || [],
    aptCorrelation: investigation?.aptCorrelation || null,
    recommended_action: judgment?.recommended_action || null,
    reasoning: judgment?.reasoning || null,
    plainEnglishSummary: judgment?.plainEnglishSummary || null,
    actionTaken: action?.actionType || null,
    target_asset: event.rawSignal?.target_asset || null
  };
}

export async function GET() {
  try {
    await connectToDatabase();
  } catch {
    // DB unavailable — return valid empty JSON so the UI never crashes
    return NextResponse.json({ events: [], reviews: [] });
  }

  try {
    const events = await Event.find().sort({ createdAt: -1 }).limit(50);
    const formattedEvents = [];
    const reviews = [];

    for (const event of events) {
      const investigation = await Investigation.findOne({ eventId: event._id }).sort({ createdAt: -1 });
      const judgment = await Judgment.findOne({ eventId: event._id }).sort({ createdAt: -1 });
      const action = await Action.findOne({ eventId: event._id }).sort({ createdAt: -1 });

      const formatted = formatEventForClient(event, investigation, judgment, action);
      formattedEvents.push(formatted);

      if (judgment?.escalatedToHuman && event.status === 'judged') {
        reviews.push({
          id: event._id.toString(),
          ip: event.rawSignal.ip,
          score: judgment.confidence || judgment.confidenceScore,
          reason: judgment.reasoning,
          recommended_action: judgment.recommended_action,
          time: new Date(judgment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          abuseIpdbResult: investigation?.abuseIpdbResult || null,
          virusTotalResult: investigation?.virusTotalResult || null,
          greyNoiseResult: investigation?.greyNoiseResult || null,
          evidence: investigation?.evidence || [],
          mitre_technique: investigation?.mitre_technique || '',
          plainEnglishSummary: judgment?.plainEnglishSummary || null
        });
      }
    }

    return NextResponse.json({ events: formattedEvents, reviews });
  } catch (err) {
    console.error('[GET /api/events] Query error:', err);
    return NextResponse.json({ events: [], reviews: [] });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  await connectToDatabase();

  // AIIMS Scenario replay
  if (body.scenario === 'aiims_replay') {
    const results: any[] = [];
    
    for (const scenario of AIIMS_SCENARIOS) {
      const event = await Event.create({
        source: 'replay',
        rawSignal: {
          ip: scenario.ip,
          protocol: scenario.protocol,
          payloadSummary: scenario.payloadSummary,
          timestamp: new Date(),
          reasonCode: scenario.reasonCode,
          event_type: scenario.event_type,
          target_asset: scenario.target_asset
        },
        status: 'flagged'
      });

      const notify = (eventName: string, payload: any) => {
        if ((global as any).io) {
          (global as any).io.emit(eventName, { ...payload, scenario_name: scenario.name });
        }
      };

      // Stagger events for visual effect
      setTimeout(() => {
        processEvent(event, notify).catch(console.error);
      }, scenario.delayMs);

      results.push({ eventId: event._id, scenario: scenario.name, delay: scenario.delayMs });
    }

    return NextResponse.json({ success: true, scenario: 'aiims_replay', events: results });
  }

  // Single manual event
  const event = await Event.create({
    source: 'manual',
    rawSignal: {
      ip: body.ip || '185.150.11.23',
      protocol: body.protocol || 'TCP',
      payloadSummary: body.payloadSummary || 'Manual test injection',
      timestamp: new Date(),
      reasonCode: body.reasonCode || 'ANOMALY_DETECTED',
      event_type: body.event_type || 'manual',
      target_asset: body.target_asset || null
    },
    status: 'flagged'
  });

  const notify = (eventName: string, payload: any) => {
    if ((global as any).io) {
      (global as any).io.emit(eventName, { ...payload, eventId: event._id, ip: event.rawSignal.ip });
    }
  };

  processEvent(event, notify).catch(console.error);

  return NextResponse.json({ success: true, eventId: event._id });
}
