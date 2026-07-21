import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/db/mongoose';
import { Event } from '../../../lib/db/models/Event';
import { Investigation } from '../../../lib/db/models/Investigation';
import { Judgment } from '../../../lib/db/models/Judgment';
import { Action } from '../../../lib/db/models/Action';
import { AuditRecord } from '../../../lib/db/models/AuditRecord';

export async function GET(req: Request) {
  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status'); // filter: all | judged | responded | closed

  const query: any = {};
  if (status && status !== 'all') {
    query.status = status;
  }

  const events = await Event.find(query).sort({ createdAt: -1 }).limit(100);

  const cases = [];

  for (const event of events) {
    const investigation = await Investigation.findOne({ eventId: event._id }).sort({ createdAt: -1 });
    const judgment = await Judgment.findOne({ eventId: event._id }).sort({ createdAt: -1 });
    const action = await Action.findOne({ eventId: event._id }).sort({ createdAt: -1 });
    const auditTrail = await AuditRecord.find({ eventId: event._id }).sort({ sequenceNumber: 1 });

    cases.push({
      id: event._id.toString(),
      ip: event.rawSignal?.ip,
      protocol: event.rawSignal?.protocol,
      payloadSummary: event.rawSignal?.payloadSummary,
      reasonCode: event.rawSignal?.reasonCode,
      target_asset: event.rawSignal?.target_asset || null,
      status: event.status,
      createdAt: event.createdAt,
      resolvedAt: event.status === 'responded' || event.status === 'closed' ? action?.createdAt || judgment?.createdAt : null,
      // Investigation
      investigation: investigation ? {
        aiSummary: investigation.aiSummary,
        attackCategoryGuess: investigation.attackCategoryGuess,
        severity_hint: investigation.severity_hint,
        mitre_technique: investigation.mitre_technique,
        mitre_tactic: investigation.mitre_tactic,
        evidence: investigation.evidence,
        // Raw API responses — shown verbatim
        abuseIpdbResult: investigation.abuseIpdbResult,
        virusTotalResult: investigation.virusTotalResult,
        greyNoiseResult: investigation.greyNoiseResult,
        aptCorrelation: investigation.aptCorrelation,
        retryCount: investigation.retryCount
      } : null,
      // Judgment
      judgment: judgment ? {
        confidence: judgment.confidence || judgment.confidenceScore,
        verdict: judgment.verdict,
        reasoning: judgment.reasoning,
        recommended_action: judgment.recommended_action,
        escalatedToHuman: judgment.escalatedToHuman,
        needs_more_evidence: judgment.needs_more_evidence,
        mitre_attribution: judgment.mitre_attribution,
        plainEnglishSummary: judgment.plainEnglishSummary
      } : null,
      // Action
      action: action ? {
        actionTaken: action.actionType,
        originalRecommendation: action.originalRecommendation,
        approvedBy: action.approvedBy,
        status: action.status,
        policyCheck: action.policyCheck,
        blastRadiusCheck: action.blastRadiusCheck,
        executionLog: action.executionLog
      } : null,
      // Audit trail
      auditTrail: auditTrail.map(r => ({
        sequenceNumber: r.sequenceNumber,
        agent: r.payload.agent,
        action: r.payload.action,
        timestamp: r.createdAt,
        hash: r.currentHash?.substring(0, 16) + '...'
      }))
    });
  }

  return NextResponse.json(cases);
}
