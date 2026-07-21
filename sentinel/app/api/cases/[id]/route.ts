import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import { Event } from '@/lib/db/models/Event';
import { Investigation } from '@/lib/db/models/Investigation';
import { Judgment } from '@/lib/db/models/Judgment';
import { Action } from '@/lib/db/models/Action';
import { AuditRecord } from '@/lib/db/models/AuditRecord';
import { runResponder } from '@/lib/agents/responder';
import { appendToChain } from '@/lib/hashChain';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectToDatabase();

  const event = await Event.findById(id);
  if (!event) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  const investigation = await Investigation.findOne({ eventId: event._id }).sort({ createdAt: -1 });
  const judgment = await Judgment.findOne({ eventId: event._id }).sort({ createdAt: -1 });
  const action = await Action.findOne({ eventId: event._id }).sort({ createdAt: -1 });
  const auditTrail = await AuditRecord.find({ eventId: event._id }).sort({ sequenceNumber: 1 });

  return NextResponse.json({
    id: event._id.toString(),
    ip: event.rawSignal?.ip,
    protocol: event.rawSignal?.protocol,
    payloadSummary: event.rawSignal?.payloadSummary,
    reasonCode: event.rawSignal?.reasonCode,
    target_asset: event.rawSignal?.target_asset || null,
    status: event.status,
    createdAt: event.createdAt,
    investigation: investigation ? {
      aiSummary: investigation.aiSummary,
      attackCategoryGuess: investigation.attackCategoryGuess,
      severity_hint: investigation.severity_hint,
      mitre_technique: investigation.mitre_technique,
      mitre_tactic: investigation.mitre_tactic,
      evidence: investigation.evidence,
      abuseIpdbResult: investigation.abuseIpdbResult,
      virusTotalResult: investigation.virusTotalResult,
      greyNoiseResult: investigation.greyNoiseResult,
      aptCorrelation: investigation.aptCorrelation,
      retryCount: investigation.retryCount
    } : null,
    judgment: judgment ? {
      confidence: judgment.confidence || judgment.confidenceScore,
      verdict: judgment.verdict,
      reasoning: judgment.reasoning,
      recommended_action: judgment.recommended_action,
      escalatedToHuman: judgment.escalatedToHuman,
      mitre_attribution: judgment.mitre_attribution,
      plainEnglishSummary: judgment.plainEnglishSummary,
      responderResult: judgment.responderResult
    } : null,
    action: action ? {
      actionTaken: action.actionType,
      originalRecommendation: action.originalRecommendation,
      approvedBy: action.approvedBy,
      policyCheck: action.policyCheck,
      blastRadiusCheck: action.blastRadiusCheck,
      executionLog: action.executionLog
    } : null,
    auditTrail: auditTrail.map((r: any) => ({
      sequenceNumber: r.sequenceNumber,
      agent: r.payload.agent,
      action: r.payload.action,
      evidence: r.payload.evidence,
      timestamp: r.createdAt,
      previousHash: r.previousHash,
      currentHash: r.currentHash
    }))
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { action } = body;

  await connectToDatabase();
  const event = await Event.findById(id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  if (action === 'dismiss') {
    event.status = 'closed';
    await event.save();
    await appendToChain(event._id, 'Human', 'dismissed_incident', { reason: 'Operator dismissed from Case Review screen' });

    if ((global as any).io) {
      (global as any).io.emit('event:closed', { eventId: event._id, reason: 'human_dismissed' });
    }
    return NextResponse.json({ success: true, status: 'closed' });
  }

  if (action === 'approve') {
    event.status = 'responded';
    await event.save();

    const jud = await Judgment.findOne({ eventId: event._id }).sort({ createdAt: -1 });
    const inv = await Investigation.findOne({ eventId: event._id }).sort({ createdAt: -1 });

    const responderResult = await runResponder(jud, inv, event.rawSignal.ip);

    const act = await Action.create({
      eventId: event._id,
      judgmentId: jud._id,
      actionType: responderResult.actionTaken,
      originalRecommendation: responderResult.originalRecommendation,
      approvedBy: 'human_operator',
      status: 'simulated',
      policyCheck: responderResult.policyCheck,
      blastRadiusCheck: responderResult.blastRadiusCheck?.result || null,
      executionLog: responderResult.executionLog
    });

    await appendToChain(event._id, 'Responder', 'action_taken', {
      actionType: act.actionType,
      approvedBy: 'human_operator',
      policyCheck: responderResult.policyCheck,
      executionLog: responderResult.executionLog
    });

    if ((global as any).io) {
      (global as any).io.emit('event:responded', {
        eventId: event._id,
        action: act.actionType,
        approvedBy: 'human_operator',
        policyCheck: responderResult.policyCheck,
        executionLog: responderResult.executionLog
      });
    }
    return NextResponse.json({ success: true, action: act });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
