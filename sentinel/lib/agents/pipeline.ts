import { runWatcher } from './watcher';
import { runInvestigator } from './investigator';
import { runJudge } from './judge';
import { runResponder } from './responder';
import { runRecord } from './record';
import { Event } from '../db/models/Event';
import { Investigation } from '../db/models/Investigation';
import { Judgment } from '../db/models/Judgment';
import { Action } from '../db/models/Action';

// The notify parameter will be hooked up to Socket.IO in Phase 5
export async function processEvent(eventDoc: any, notify?: (event: string, payload: any) => void) {
  
  // 1. WATCHER (we assume event is already flagged if it's here)
  eventDoc.status = 'investigating';
  await eventDoc.save();
  if (notify) notify('event:investigating', { eventId: eventDoc._id });
  
  await runRecord(eventDoc._id, 'Watcher', 'flagged_event', { signal: eventDoc.rawSignal });

  let specificQuestion: string | undefined;
  let finalInvestigationResult: any;
  let finalJudgmentResult: any;

  // The Retry Loop (bounded to 1 retry)
  for (let attempt = 0; attempt < 2; attempt++) {
    // 2. INVESTIGATOR
    finalInvestigationResult = await runInvestigator(eventDoc.rawSignal.ip, eventDoc.rawSignal.payloadSummary, specificQuestion);
    
    // Save Investigation
    const inv = await Investigation.create({
      eventId: eventDoc._id,
      ...finalInvestigationResult,
      retryCount: attempt
    });
    
    await runRecord(eventDoc._id, 'Investigator', 'investigation_complete', { summary: finalInvestigationResult.aiSummary, retryAttempt: attempt });

    // 3. JUDGE
    if (notify) notify('event:judged', { eventId: eventDoc._id, state: 'judging' });
    
    finalJudgmentResult = await runJudge(eventDoc.rawSignal, finalInvestigationResult);

    if (finalJudgmentResult.requiresRetry && attempt === 0) {
      console.log(`[Judge] Ambiguous confidence (${finalJudgmentResult.confidenceScore}). Requesting retry...`);
      specificQuestion = finalJudgmentResult.retryQuestion;
      continue; // Loop back to Investigator
    } else {
      break; // Happy path, no retry needed, or we exhausted retries
    }
  }

  // Save Judgment
  const jud = await Judgment.create({
    eventId: eventDoc._id,
    investigationId: (await Investigation.findOne({ eventId: eventDoc._id }).sort({ createdAt: -1 }))._id,
    confidenceScore: finalJudgmentResult.confidenceScore,
    verdict: finalJudgmentResult.verdict,
    reasoning: finalJudgmentResult.reasoning,
    escalatedToHuman: finalJudgmentResult.verdict === 'suspicious'
  });

  await runRecord(eventDoc._id, 'Judge', 'judgment_rendered', { score: jud.confidenceScore, verdict: jud.verdict, reasoning: jud.reasoning });

  if (jud.escalatedToHuman) {
    eventDoc.status = 'judged';
    await eventDoc.save();
    if (notify) notify('event:needs_review', { eventId: eventDoc._id, judgment: jud });
    return; // Wait for human approval via Review Queue
  }

  if (jud.verdict === 'confirmed_attack') {
    // 4. RESPONDER
    eventDoc.status = 'responded';
    await eventDoc.save();
    
    const actionChoice = await runResponder(jud, finalInvestigationResult);
    
    const act = await Action.create({
      eventId: eventDoc._id,
      judgmentId: jud._id,
      actionType: actionChoice,
      approvedBy: 'system_auto',
      status: 'executed'
    });

    await runRecord(eventDoc._id, 'Responder', 'action_taken', { actionType: act.actionType });
    if (notify) notify('event:responded', { eventId: eventDoc._id, action: act });
  } else {
    // Low confidence / false positive
    eventDoc.status = 'closed';
    await eventDoc.save();
    if (notify) notify('event:closed', { eventId: eventDoc._id });
  }
}
