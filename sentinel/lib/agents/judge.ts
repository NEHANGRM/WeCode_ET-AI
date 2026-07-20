import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.LLM_API_KEY || '');

export async function runJudge(signal: any, investigation: any) {
  const prompt = `
You are the Judge Agent in a cybersecurity pipeline.
Your job is to review the signal and the investigation evidence and decide if this is an attack.

Signal:
${JSON.stringify(signal, null, 2)}

Investigation Summary:
${investigation.aiSummary}
Attack Category Guess: ${investigation.attackCategoryGuess}

Threat Intel:
AbuseIPDB Score: ${investigation.abuseIpdbResult.score}
VirusTotal: ${investigation.virusTotalResult.maliciousCount}
GreyNoise: ${investigation.greyNoiseResult.classification}

Determine a confidence score (0-100) that this represents a genuine threat/attack.
- >80: Confirmed attack
- 40-80: Suspicious (needs human review or retry)
- <40: Normal background noise or false positive

Return ONLY valid JSON matching this schema, no markdown formatting:
{
  "confidenceScore": number (0-100),
  "verdict": "normal" | "suspicious" | "confirmed_attack",
  "reasoning": "1-2 sentence explanation of why you gave this score",
  "requiresRetry": boolean (true ONLY if confidence is between 40-60 and you need to ask the Investigator a sharper question. Otherwise false.),
  "retryQuestion": "If requiresRetry is true, what specific question should the Investigator answer?"
}`;

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('LLM Judge Error:', error);
    // Fallback
    const score = investigation.abuseIpdbResult.score > 50 ? 85 : 20;
    return {
      confidenceScore: score,
      verdict: score > 80 ? 'confirmed_attack' : 'normal',
      reasoning: 'Fallback deterministic judgment due to LLM error.',
      requiresRetry: false
    };
  }
}
