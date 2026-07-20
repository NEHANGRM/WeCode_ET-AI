import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/db/mongoose';
import { Event } from '../../../lib/db/models/Event';
import { Investigation } from '../../../lib/db/models/Investigation';
import { Judgment } from '../../../lib/db/models/Judgment';
import { processEvent } from '../../../lib/agents/pipeline';

function formatEventForClient(event: any, investigation: any, judgment: any) {
  return {
    id: event._id.toString(),
    ip: event.rawSignal?.ip,
    category: investigation?.attackCategoryGuess || 'unknown',
    status: event.status,
    score: judgment?.confidenceScore || null,
    summary: investigation?.aiSummary || null,
    time: new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}

export async function GET() {
  await connectToDatabase();
  
  const events = await Event.find().sort({ createdAt: -1 }).limit(20);
  
  const formattedEvents = [];
  const reviews = [];

  for (const event of events) {
    const investigation = await Investigation.findOne({ eventId: event._id }).sort({ createdAt: -1 });
    const judgment = await Judgment.findOne({ eventId: event._id }).sort({ createdAt: -1 });
    
    formattedEvents.push(formatEventForClient(event, investigation, judgment));
    
    if (judgment?.escalatedToHuman && event.status === 'judged') {
      reviews.push({
        id: event._id.toString(),
        ip: event.rawSignal.ip,
        score: judgment.confidenceScore,
        reason: judgment.reasoning,
        time: new Date(judgment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
  }

  return NextResponse.json({ events: formattedEvents, reviews });
}

export async function POST(req: Request) {
  const body = await req.json();
  await connectToDatabase();
  
  const event = await Event.create({
    source: 'manual',
    rawSignal: {
      ip: body.ip || '192.168.1.50',
      protocol: body.protocol || 'TCP',
      payloadSummary: body.payloadSummary || 'Manual test injection',
      timestamp: new Date()
    },
    status: 'flagged'
  });

  const notify = (eventName: string, payload: any) => {
    if ((global as any).io) {
      // Enhance payload with IP/category etc for the client
      const fullPayload = {
        ...payload,
        eventId: event._id,
        ip: event.rawSignal.ip,
        category: 'unknown' // could be fetched from DB here, simplified for demo
      };
      (global as any).io.emit(eventName, fullPayload);
    }
  };
  
  // Fire and forget pipeline execution
  processEvent(event, notify).catch(console.error);

  return NextResponse.json({ success: true, eventId: event._id });
}
