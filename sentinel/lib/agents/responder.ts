import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.LLM_API_KEY || '');

const ALLOWED_ACTIONS = ['block_ip', 'isolate_segment', 'alert_oncall', 'open_ticket', 'trigger_failover'];

export async function runResponder(judgment: any, investigation: any) {
  const prompt = `
You are the Responder Agent in a cybersecurity pipeline.
An incident has been judged as a confirmed attack. You MUST choose exactly ONE action to take.

Incident context:
Category: ${investigation.attackCategoryGuess}
Judge Reasoning: ${judgment.reasoning}
Confidence: ${judgment.confidenceScore}

You are heavily constrained. You can ONLY choose one of the following exact string values:
- block_ip : (Use for external threats, DDoS, brute force from outside)
- isolate_segment : (Use for lateral movement, internal compromises, ransomware staging)
- alert_oncall : (Use when you are unsure but something bad is happening)
- open_ticket : (Use for low priority confirmed issues)
- trigger_failover : (Use only if a critical system is actively going down)

Return ONLY valid JSON matching this schema, no markdown formatting:
{
  "actionType": "must be exactly one of the strings listed above"
}`;

  const maxRetries = 2;
  let attempts = 0;

  while (attempts < maxRetries) {
    attempts++;
    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text);

      if (ALLOWED_ACTIONS.includes(parsed.actionType)) {
        return parsed.actionType;
      }
      console.warn(`[Responder] Invalid action choice: ${parsed.actionType}. Retrying...`);
    } catch (error) {
      console.error('LLM Responder Error:', error);
    }
  }

  // Fallback to safest action if LLM fails constraints
  return 'alert_oncall';
}
