import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db/mongoose';
import { Event } from '../../../../lib/db/models/Event';
import { Investigation } from '../../../../lib/db/models/Investigation';
import { Judgment } from '../../../../lib/db/models/Judgment';
import { Action } from '../../../../lib/db/models/Action';
import { AuditRecord } from '../../../../lib/db/models/AuditRecord';
import { runResponder } from '../../../../lib/agents/responder';
import { appendToChain } from '../../../../lib/hashChain';

// Approve an action (Review Queue Server Action equivalent in API route)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const body = await req.json();
  const { action } = body; // 'approve', 'dismiss', 'retry'
  
  await connectToDatabase();
  const event = await Event.findById(id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  if (action === 'dismiss') {
    event.status = 'closed';
    await event.save();
    
    await appendToChain(event._id, 'Human', 'dismissed_incident', { reason: 'Operator dismissed from Review Queue' });
    
    if ((global as any).io) {
      (global as any).io.emit('event:closed', { eventId: event._id });
    }
    return NextResponse.json({ success: true, status: 'closed' });
  }
  
  if (action === 'approve') {
    event.status = 'responded';
    await event.save();

    const jud = await Judgment.findOne({ eventId: event._id }).sort({ createdAt: -1 });
    const inv = await Investigation.findOne({ eventId: event._id }).sort({ createdAt: -1 });

    const actionChoice = await runResponder(jud, inv);
    
    const act = await Action.create({
      eventId: event._id,
      judgmentId: jud._id,
      actionType: actionChoice,
      approvedBy: 'human_operator',
      status: 'executed'
    });

    await appendToChain(event._id, 'Responder', 'action_taken', { actionType: act.actionType, approvedBy: 'human_operator' });
    
    if ((global as any).io) {
      (global as any).io.emit('event:responded', { eventId: event._id, action: act });
    }
    return NextResponse.json({ success: true, action: act });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
