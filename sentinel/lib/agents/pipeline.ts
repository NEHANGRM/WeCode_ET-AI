import { runWatcher } from './watcher';
import { runInvestigator } from './investigator';
import { runJudge } from './judge';
import { runResponder } from './responder';
import { runRecord } from './record';
import { runExplainer } from './explainer';
import { runCorrelator } from './correlator';
import { Event } from '../db/models/Event';
import { Investigation } from '../db/models/Investigation';
import { Judgment } from '../db/models/Judgment';
import { Action } from '../db/models/Action';

type NotifyFn = (event: string, payload: any) => void;

/**
 * Main pipeline orchestrator.
 * 
 * Safety guarantees enforced IN CODE (not just in prompts):
 * 1. confidence > 80  → auto-execute (Responder)
 * 2. 40 ≤ confidence ≤ 80 → escalate to human, NO auto-action
 * 3. confidence < 40  → log quietly, no alert
 * 4. needs_more_evidence: max 1 retry, then force decision
 * 5. Responder enforces policy + blast-radius before any action
 */
export async function processEvent(eventDoc: any, notify?: NotifyFn) {
  const ip = eventDoc.rawSignal.ip;
  const payloadSummary = eventDoc.rawSignal.payloadSummary;
  const reasonCode = eventDoc.rawSignal.reasonCode || 'ANOMALY_DETECTED';

  // ─── STAGE 0: Correlator (Tier 2 — slow APT detection) ───
  const correlatorResult = await runCorrelator(ip, reasonCode);
  if (notify) notify('pipeline:stage', { stage: 'correlator', eventId: eventDoc._id, data: correlatorResult });

  // ─── STAGE 1: Watcher ───
  eventDoc.status = 'investigating';
  await eventDoc.save();
  if (notify) notify('pipeline:stage', { stage: 'watcher', eventId: eventDoc._id, ip, reasonCode });

  await runRecord(eventDoc._id, 'Watcher', 'flagged_event', {
    signal: eventDoc.rawSignal,
    correlatorResult
  });

  // ─── STAGES 2-3: Investigator → Judge (with max 1 retry loop) ───
  let specificQuestion: string | undefined;
  let finalInvestigation: any;
  let finalJudgment: any;
  const MAX_RETRIES = 1; // Hard-coded limit — spec requirement

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // ─── STAGE 2: Investigator ───
    if (notify) notify('pipeline:stage', { stage: 'investigator', eventId: eventDoc._id, attempt });

    finalInvestigation = await runInvestigator(ip, payloadSummary, reasonCode, specificQuestion);
    
    // Attach correlator result to investigation
    finalInvestigation.aptCorrelation = correlatorResult;

    const inv = await Investigation.create({
      eventId: eventDoc._id,
      ...finalInvestigation,
      retryCount: attempt
    });

    await runRecord(eventDoc._id, 'Investigator', 'investigation_complete', {
      summary: finalInvestigation.aiSummary,
      severity: finalInvestigation.severity_hint,
      mitre: finalInvestigation.mitre_technique,
      aptSuspicion: correlatorResult.aptSuspicion,
      retryAttempt: attempt
    });

    if (notify) notify('pipeline:stage', {
      stage: 'investigator_done',
      eventId: eventDoc._id,
      investigation: {
        aiSummary: finalInvestigation.aiSummary,
        attackCategory: finalInvestigation.attackCategoryGuess,
        mitre_technique: finalInvestigation.mitre_technique,
        severity_hint: finalInvestigation.severity_hint,
        abuseIpdbResult: finalInvestigation.abuseIpdbResult,
        virusTotalResult: finalInvestigation.virusTotalResult,
        greyNoiseResult: finalInvestigation.greyNoiseResult,
        evidence: finalInvestigation.evidence,
        aptCorrelation: correlatorResult
      }
    });

    // ─── STAGE 3: Judge ───
    if (notify) notify('pipeline:stage', { stage: 'judge', eventId: eventDoc._id });

    finalJudgment = await runJudge(eventDoc.rawSignal, finalInvestigation);

    // ─── SAFETY CHECK: Enforce max 1 retry, then force decision ───
    if (finalJudgment.needs_more_evidence && attempt < MAX_RETRIES) {
      specificQuestion = finalJudgment.follow_up_question || undefined;
      console.log(`[Judge] Requesting Investigator retry (attempt ${attempt + 1}/${MAX_RETRIES}): "${specificQuestion}"`);
      await runRecord(eventDoc._id, 'Judge', 'retry_requested', {
        question: specificQuestion,
        confidenceAtRetry: finalJudgment.confidence
      });
      continue;
    }

    // Force decision on last attempt regardless of needs_more_evidence
    if (attempt === MAX_RETRIES && finalJudgment.needs_more_evidence) {
      finalJudgment.needs_more_evidence = false;
      finalJudgment.follow_up_question = null;
      console.log(`[Judge] Max retries reached — forcing final decision with confidence ${finalJudgment.confidence}`);
    }

    break;
  }

  // ─── Save Judgment ───
  const latestInv = await Investigation.findOne({ eventId: eventDoc._id }).sort({ createdAt: -1 });

  const jud = await Judgment.create({
    eventId: eventDoc._id,
    investigationId: latestInv._id,
    confidence: finalJudgment.confidence,
    confidenceScore: finalJudgment.confidence,
    verdict: finalJudgment.verdict,
    reasoning: finalJudgment.reasoning,
    recommended_action: finalJudgment.recommended_action,
    needs_more_evidence: finalJudgment.needs_more_evidence,
    follow_up_question: finalJudgment.follow_up_question,
    mitre_attribution: finalJudgment.mitre_attribution,
    escalatedToHuman: finalJudgment.escalatedToHuman
  });

  await runRecord(eventDoc._id, 'Judge', 'judgment_rendered', {
    confidence: jud.confidence,
    verdict: jud.verdict,
    recommended_action: jud.recommended_action,
    mitre: jud.mitre_attribution,
    reasoning: jud.reasoning
  });

  if (notify) notify('pipeline:stage', {
    stage: 'judge_done',
    eventId: eventDoc._id,
    judgment: {
      confidence: jud.confidence,
      verdict: jud.verdict,
      recommended_action: jud.recommended_action,
      reasoning: jud.reasoning,
      escalatedToHuman: jud.escalatedToHuman
    }
  });

  // ─── CODE-ENFORCED ROUTING (not left to LLM) ───

  // Path A: Low confidence — quiet log
  if (finalJudgment.confidence < 40) {
    eventDoc.status = 'closed';
    await eventDoc.save();
    if (notify) notify('event:closed', { eventId: eventDoc._id, confidence: jud.confidence, reason: 'below_threshold' });
    console.log(`[Pipeline] Event ${eventDoc._id} closed — confidence ${jud.confidence} < 40 (background noise)`);
    return;
  }

  // Path B: Medium confidence — escalate to human (NO auto-action)
  if (finalJudgment.escalatedToHuman) {
    // Run Explainer for human-review cases (helps the operator understand)
    const plainEnglish = await runExplainer(finalJudgment, finalInvestigation, ip);
    await Judgment.findByIdAndUpdate(jud._id, { plainEnglishSummary: plainEnglish });

    eventDoc.status = 'judged';
    await eventDoc.save();

    if (notify) notify('event:needs_review', {
      eventId: eventDoc._id,
      ip,
      confidence: jud.confidence,
      verdict: jud.verdict,
      judgment: {
        confidenceScore: jud.confidence,
        reasoning: jud.reasoning,
        recommended_action: jud.recommended_action
      },
      investigation: {
        aiSummary: finalInvestigation.aiSummary,
        attackCategoryGuess: finalInvestigation.attackCategoryGuess,
        abuseIpdbResult: finalInvestigation.abuseIpdbResult,
        virusTotalResult: finalInvestigation.virusTotalResult,
        greyNoiseResult: finalInvestigation.greyNoiseResult,
        evidence: finalInvestigation.evidence,
        mitre_technique: finalInvestigation.mitre_technique
      },
      plainEnglishSummary: plainEnglish
    });

    await runRecord(eventDoc._id, 'System', 'escalated_to_human', {
      confidence: jud.confidence,
      reason: 'Medium confidence (40-80) — requires human decision per safety policy'
    });

    console.log(`[Pipeline] Event ${eventDoc._id} escalated to human — confidence ${jud.confidence} (40-80 band)`);
    return;
  }

  // Path C: High confidence — Responder auto-executes
  if (notify) notify('pipeline:stage', { stage: 'responder', eventId: eventDoc._id });

  eventDoc.status = 'responded';
  await eventDoc.save();

  const responderResult = await runResponder(finalJudgment, finalInvestigation, ip);

  // Run Explainer for responded cases too
  const plainEnglish = await runExplainer(finalJudgment, finalInvestigation, ip);
  await Judgment.findByIdAndUpdate(jud._id, { 
    plainEnglishSummary: plainEnglish,
    responderResult 
  });

  const act = await Action.create({
    eventId: eventDoc._id,
    judgmentId: jud._id,
    actionType: responderResult.actionTaken,
    originalRecommendation: responderResult.originalRecommendation,
    approvedBy: 'system_auto',
    status: 'simulated',
    policyCheck: responderResult.policyCheck,
    blastRadiusCheck: responderResult.blastRadiusCheck?.result || null,
    executionLog: responderResult.executionLog
  });

  await runRecord(eventDoc._id, 'Responder', 'action_taken', {
    actionTaken: act.actionType,
    originalRecommendation: act.originalRecommendation,
    policyPassed: responderResult.policyCheck.passed,
    blastRadiusOverride: responderResult.blastRadiusCheck.overrideTriggered,
    executionLog: responderResult.executionLog
  });

  if (notify) notify('event:responded', {
    eventId: eventDoc._id,
    ip,
    action: act.actionType,
    originalRecommendation: act.originalRecommendation,
    confidence: jud.confidence,
    policyCheck: responderResult.policyCheck,
    blastRadiusCheck: responderResult.blastRadiusCheck,
    executionLog: responderResult.executionLog,
    plainEnglishSummary: plainEnglish
  });

  if (notify) notify('pipeline:stage', { stage: 'record', eventId: eventDoc._id });

  console.log(`[Pipeline] Event ${eventDoc._id} resolved — action: ${act.actionType}, confidence: ${jud.confidence}`);
}
