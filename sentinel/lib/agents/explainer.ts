import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.LLM_API_KEY || '');

/**
 * Explainer Agent (Tier 2)
 * Takes the Judge's technical JSON reasoning and produces a plain-English
 * summary for a hospital administrator or plant manager.
 */
export async function runExplainer(
  judgeOutput: any,
  investigationOutput: any,
  targetAsset: string
): Promise<string> {
  if (!process.env.LLM_API_KEY) {
    return generateFallbackExplanation(judgeOutput, investigationOutput, targetAsset);
  }

  const prompt = `
You are a cybersecurity communications officer writing for a NON-TECHNICAL audience.
Your reader is a hospital administrator or power plant manager — not a security engineer.

A security incident has been analyzed. Here is the technical summary:

Target Asset: ${targetAsset}
Attack Type: ${investigationOutput.attackCategoryGuess || investigationOutput.likely_attack_type || 'Unknown'}
Threat Level: ${judgeOutput.confidenceScore}/100 confidence
Judge Decision: ${judgeOutput.verdict || judgeOutput.recommended_action}
Technical Reasoning: ${judgeOutput.reasoning}
Investigator Evidence: ${investigationOutput.aiSummary || investigationOutput.summary}

Write a SINGLE paragraph (3-4 sentences max) that:
1. Explains what is happening in plain English (no jargon)
2. States the potential real-world impact on patients/operations
3. Explains what action was taken (or why a human needs to decide)
4. Is reassuring but honest about the severity

Do NOT use: IP addresses, hash values, protocol names, or technical acronyms.
Do NOT exceed 4 sentences.
Return only the paragraph text, no JSON, no formatting.
`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('[Explainer] LLM error:', error);
    return generateFallbackExplanation(judgeOutput, investigationOutput, targetAsset);
  }
}

function generateFallbackExplanation(judgeOutput: any, investigationOutput: any, targetAsset: string): string {
  const score = judgeOutput.confidenceScore || 0;
  const category = investigationOutput.attackCategoryGuess || 'unknown';
  
  if (score > 80) {
    const actionMap: Record<string, string> = {
      'ddos': 'Our security system has detected a deliberate attempt to overwhelm the network with malicious traffic targeting hospital systems. This type of attack, if successful, could slow down or disable digital medical record access. Our automated defenses have blocked the attacking source and the hospital\'s clinical operations remain unaffected.',
      'ransomware_staging': 'Our security system has detected early signs of a ransomware attack — a type of digital extortion where attackers try to lock up computer files and demand payment. This was caught at the preparation stage before any files were encrypted. The system has automatically contained the threat and no patient data has been compromised.',
      'bruteforce': 'Our security system detected repeated unauthorized attempts to guess login credentials for hospital systems — similar to a burglar trying different keys on a lock. The attacking source has been automatically blocked. No accounts were successfully accessed.',
      'exfiltration': 'Our security system detected an attempt to copy sensitive data out of hospital systems to an external location. The connection has been blocked immediately. Security staff have been alerted to verify what, if any, data was accessed.'
    };
    return actionMap[category] || `Our security system has detected and blocked a ${score > 90 ? 'high-confidence' : 'likely'} cyber threat targeting ${targetAsset}. Automated defenses have responded and clinical operations are not impacted. Security staff have been notified for follow-up review.`;
  } else {
    return `Our security system has flagged unusual activity on ${targetAsset} that requires a security team member to review before any action is taken. This is a precautionary escalation — no automatic changes have been made and operations continue normally while the security team investigates.`;
  }
}
