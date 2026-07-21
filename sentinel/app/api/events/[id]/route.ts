import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db/mongoose';
import { Event } from '../../../../lib/db/models/Event';
import { Investigation } from '../../../../lib/db/models/Investigation';
import { Judgment } from '../../../../lib/db/models/Judgment';
import { Action } from '../../../../lib/db/models/Action';
import { runResponder } from '../../../../lib/agents/responder';
import { appendToChain } from '../../../../lib/hashChain';

// Human approve or dismiss an escalated event
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const body = await req.json();
  const { action } = body;

  await connectToDatabase();
  const event = await Event.findById(id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  if (action === 'dismiss') {
    event.status = 'closed';
    await event.save();

    await appendToChain(event._id, 'Human', 'dismissed_incident', {
      reason: 'Operator dismissed from Review Queue'
    });

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
        executionLog: responderResult.executionLog
      });
    }
    return NextResponse.json({ success: true, action: act });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
