import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { connectToDatabase } from '../../../lib/db/mongoose';
import { Event } from '../../../lib/db/models/Event';
import { Investigation } from '../../../lib/db/models/Investigation';
import { Judgment } from '../../../lib/db/models/Judgment';
import { Action } from '../../../lib/db/models/Action';
import { Campaign } from '../../../lib/db/models/Campaign';

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.LLM_API_KEY || '');

const UNABLE_TO_PROCESS = {
  answer: "I'm unable to process your question right now — the AI service is temporarily unavailable. Please try again in a moment.",
  sources: []
};

// ─── Step 2: DB Query Functions ───────────────────────────────────────────────

async function get_case_by_ip(params: { ip: string }) {
  const events = await Event.find({ 'rawSignal.ip': { $regex: params.ip, $options: 'i' } })
    .sort({ createdAt: -1 }).limit(10).lean();

  const results = await Promise.all(events.map(async (e: any) => {
    const [inv, judg, action] = await Promise.all([
      Investigation.findOne({ eventId: e._id }).sort({ createdAt: -1 }).lean(),
      Judgment.findOne({ eventId: e._id }).sort({ createdAt: -1 }).lean(),
      Action.findOne({ eventId: e._id }).sort({ createdAt: -1 }).lean()
    ]);
    return {
      case_id: e._id.toString(),
      ip: e.rawSignal?.ip,
      status: e.status,
      reasonCode: e.rawSignal?.reasonCode,
      target_asset: e.rawSignal?.target_asset?.name,
      createdAt: e.createdAt,
      verdict: (judg as any)?.verdict,
      confidence: (judg as any)?.confidence,
      reasoning: (judg as any)?.reasoning,
      mitre_technique: (inv as any)?.mitre_technique,
      aiSummary: (inv as any)?.aiSummary,
      actionTaken: (action as any)?.actionType
    };
  }));

  return { type: 'cases_by_ip', ip: params.ip, count: results.length, cases: results };
}

async function get_cases_by_asset(params: { asset_name: string }) {
  const events = await Event.find({
    'rawSignal.target_asset.name': { $regex: params.asset_name, $options: 'i' }
  }).sort({ createdAt: -1 }).limit(15).lean();

  const results = await Promise.all(events.map(async (e: any) => {
    const [inv, judg] = await Promise.all([
      Investigation.findOne({ eventId: e._id }).sort({ createdAt: -1 }).lean(),
      Judgment.findOne({ eventId: e._id }).sort({ createdAt: -1 }).lean()
    ]);
    return {
      case_id: e._id.toString(),
      ip: e.rawSignal?.ip,
      status: e.status,
      target_asset: e.rawSignal?.target_asset?.name,
      createdAt: e.createdAt,
      verdict: (judg as any)?.verdict,
      confidence: (judg as any)?.confidence,
      mitre_technique: (inv as any)?.mitre_technique
    };
  }));

  return { type: 'cases_by_asset', asset: params.asset_name, count: results.length, cases: results };
}

async function get_metrics() {
  const [totalEvents, allJudgments, allActions] = await Promise.all([
    Event.countDocuments(),
    Judgment.find().lean(),
    Action.find().lean()
  ]);
  const autoResolved = allActions.filter((a: any) => a.approvedBy === 'system_auto').length;
  const humanEscalated = allJudgments.filter((j: any) => j.escalatedToHuman).length;
  const highConf = allJudgments.filter((j: any) => (j.confidence || 0) > 80).length;
  return {
    type: 'metrics',
    total_events: totalEvents,
    auto_resolved: autoResolved,
    human_escalated: humanEscalated,
    high_confidence_decisions: highConf,
    auto_resolve_rate: totalEvents > 0 ? `${Math.round((autoResolved / totalEvents) * 100)}%` : '0%'
  };
}

async function get_campaigns() {
  const campaigns = await Campaign.find().sort({ detected_at: -1 }).limit(20).lean();
  return {
    type: 'campaigns',
    count: campaigns.length,
    campaigns: campaigns.map((c: any) => ({
      campaign_id: c.campaign_id,
      confidence: c.confidence,
      status: c.status,
      detected_at: c.detected_at,
      mitre_chain: c.mitre_chain,
      narrative_preview: c.attack_chain_narrative?.substring(0, 200)
    }))
  };
}

async function get_recent_actions() {
  const actions = await Action.find()
    .sort({ createdAt: -1 }).limit(20).lean();
  return {
    type: 'recent_actions',
    count: actions.length,
    actions: actions.map((a: any) => ({
      case_id: a.eventId?.toString(),
      actionType: a.actionType,
      approvedBy: a.approvedBy,
      status: a.status,
      createdAt: a.createdAt,
      passed_policy: a.policyCheck?.passed
    }))
  };
}

// ─── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { message } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ answer: 'Please enter a question.', sources: [] });
  }

  // DB check
  try {
    await connectToDatabase();
  } catch {
    return NextResponse.json({
      answer: 'I cannot access the database right now. Please make sure MongoDB is running.',
      sources: []
    });
  }

  // If no LLM key, use keyword-based intent extraction
  let intent: { function: string; parameters: Record<string, any> };

  if (!process.env.LLM_API_KEY) {
    intent = extractIntentWithKeywords(message);
  } else {
    // Step 1: Intent extraction
    try {
      const intentPrompt = `You are WatchDog's query router. Given a user's question, decide which function to call and with what parameters. Respond ONLY with JSON:

{
  "function": "get_case_by_ip | get_cases_by_asset | get_metrics | get_campaigns | get_recent_actions | unknown",
  "parameters": {}
}

For get_case_by_ip: parameters = { "ip": "the IP address" }
For get_cases_by_asset: parameters = { "asset_name": "name of asset or system" }
For get_metrics: parameters = {}
For get_campaigns: parameters = {}
For get_recent_actions: parameters = {}
For unknown: parameters = {}

User question: "${message}"`;

      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' }
      });

      const r = await model.generateContent(intentPrompt);
      intent = JSON.parse(r.response.text().trim());
    } catch (err: any) {
      const isRateLimit = err?.status === 429;
      console.warn(`[Chat] Step1 ${isRateLimit ? 'rate-limited' : 'error'} — using keyword fallback`);
      intent = extractIntentWithKeywords(message);
    }
  }

  // Step 2: Execute DB query
  let dbData: any = null;
  const sources: string[] = [];

  try {
    switch (intent.function) {
      case 'get_case_by_ip':
        dbData = await get_case_by_ip(intent.parameters as { ip: string });
        dbData.cases?.forEach((c: any) => sources.push(c.case_id));
        break;
      case 'get_cases_by_asset':
        dbData = await get_cases_by_asset(intent.parameters as { asset_name: string });
        dbData.cases?.forEach((c: any) => sources.push(c.case_id));
        break;
      case 'get_metrics':
        dbData = await get_metrics();
        break;
      case 'get_campaigns':
        dbData = await get_campaigns();
        dbData.campaigns?.forEach((c: any) => sources.push(c.campaign_id));
        break;
      case 'get_recent_actions':
        dbData = await get_recent_actions();
        dbData.actions?.forEach((a: any) => { if (a.case_id) sources.push(a.case_id); });
        break;
      default:
        dbData = { type: 'unknown', message: 'No matching data function for this question.' };
    }
  } catch (err) {
    console.error('[Chat] DB query error:', err);
    return NextResponse.json({
      answer: "I encountered a database error while looking up your question. Please try again.",
      sources: []
    });
  }

  // Step 3: Grounded answer composition
  if (!process.env.LLM_API_KEY) {
    // Simple text answer without LLM
    const answer = buildFallbackAnswer(message, dbData);
    return NextResponse.json({ answer, sources });
  }

  try {
    const answerPrompt = `You are WatchDog's assistant. Answer the user's question using ONLY the data below. If the data doesn't contain enough information to answer, say so clearly. Always cite case_id or campaign_id where relevant. Do not speculate beyond the provided data.

User question: "${message}"
Retrieved data: ${JSON.stringify(dbData, null, 2)}

Return JSON in this exact shape:
{
  "answer": "your answer in plain English",
  "sources": ["case_id_1", "campaign_id_1", ...]
}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const r = await model.generateContent(answerPrompt);
    const parsed = JSON.parse(r.response.text().trim());
    return NextResponse.json({
      answer: parsed.answer || 'No answer generated.',
      sources: parsed.sources || sources
    });
  } catch (err: any) {
    const isRateLimit = err?.status === 429;
    console.warn(`[Chat] Step3 ${isRateLimit ? 'rate-limited' : 'error'} — using text fallback`);
    const answer = buildFallbackAnswer(message, dbData);
    return NextResponse.json({ answer, sources });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractIntentWithKeywords(message: string): { function: string; parameters: Record<string, any> } {
  const lower = message.toLowerCase();

  // IP address pattern
  const ipMatch = message.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
  if (ipMatch) return { function: 'get_case_by_ip', parameters: { ip: ipMatch[1] } };

  if (lower.includes('metric') || lower.includes('stat') || lower.includes('how many') || lower.includes('total')) {
    return { function: 'get_metrics', parameters: {} };
  }
  if (lower.includes('campaign') || lower.includes('apt') || lower.includes('coordinated')) {
    return { function: 'get_campaigns', parameters: {} };
  }
  if (lower.includes('action') || lower.includes('block') || lower.includes('respond') || lower.includes('recent')) {
    return { function: 'get_recent_actions', parameters: {} };
  }
  if (lower.includes('icu') || lower.includes('hospital') || lower.includes('server') || lower.includes('asset') || lower.includes('database')) {
    const assetKeywords = ['icu', 'server', 'database', 'ventilator', 'pacs', 'his', 'ehr'];
    const found = assetKeywords.find(k => lower.includes(k));
    return { function: 'get_cases_by_asset', parameters: { asset_name: found || 'server' } };
  }
  return { function: 'unknown', parameters: {} };
}

function buildFallbackAnswer(question: string, data: any): string {
  if (!data || data.type === 'unknown') {
    return "I don't have enough information to answer that question. Try asking about a specific IP address, asset name, metrics, campaigns, or recent actions.";
  }
  if (data.type === 'metrics') {
    return `Current WatchDog metrics: ${data.total_events} total events, ${data.auto_resolved} auto-resolved (${data.auto_resolve_rate} auto-resolve rate), ${data.human_escalated} escalated to human review, ${data.high_confidence_decisions} high-confidence decisions.`;
  }
  if (data.type === 'campaigns') {
    if (data.count === 0) return 'No campaigns have been detected yet. Run the AIIMS replay and then trigger a correlation pass to detect campaigns.';
    return `${data.count} campaign(s) detected. Latest: ${data.campaigns[0]?.campaign_id} (confidence: ${data.campaigns[0]?.confidence}%, status: ${data.campaigns[0]?.status}).`;
  }
  if (data.type === 'cases_by_ip') {
    if (data.count === 0) return `No cases found for IP ${data.ip}. This IP has not generated any alerts in the system.`;
    const c = data.cases[0];
    return `Found ${data.count} case(s) for IP ${data.ip}. Most recent: case ${c.case_id}, status: ${c.status}, verdict: ${c.verdict || 'pending'}, confidence: ${c.confidence || 'N/A'}. Reason: ${c.reasonCode || 'unknown'}.`;
  }
  if (data.type === 'cases_by_asset') {
    if (data.count === 0) return `No cases found involving asset "${data.asset}".`;
    return `Found ${data.count} case(s) targeting "${data.asset}". ${data.cases.map((c: any) => `Case ${c.case_id}: ${c.verdict || 'pending'}`).join(', ')}.`;
  }
  if (data.type === 'recent_actions') {
    if (data.count === 0) return 'No actions have been taken yet. Run the AIIMS replay to see the system in action.';
    return `${data.count} actions taken recently. Latest actions: ${data.actions.slice(0, 3).map((a: any) => `${a.actionType} on case ${a.case_id}`).join(', ')}.`;
  }
  return 'Data retrieved but I could not generate a clear answer. Please try rephrasing your question.';
}
