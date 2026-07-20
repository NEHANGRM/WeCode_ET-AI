import { checkAbuseIPDB } from '../integrations/abuseipdb';
import { checkVirusTotal } from '../integrations/virustotal';
import { checkGreyNoise } from '../integrations/greynoise';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.LLM_API_KEY || '');

export async function runInvestigator(ip: string, signalSummary: string, specificQuestion?: string) {
  // 1. Gather Threat Intel
  const [abuse, vt, gn] = await Promise.all([
    checkAbuseIPDB(ip),
    checkVirusTotal(ip),
    checkGreyNoise(ip)
  ]);

  // 2. Synthesize with LLM
  const prompt = `
You are a cybersecurity investigator agent. Analyze the following telemetry and threat intel.
IP: ${ip}
Signal Summary: ${signalSummary}
AbuseIPDB Score: ${abuse.score} (Categories: ${abuse.categories.join(', ')})
VirusTotal: ${vt.maliciousCount}/${vt.totalEngines} engines flagged malicious
GreyNoise Classification: ${gn.classification} (Targeted: ${gn.isTargeted})

${specificQuestion ? `ATTENTION: The Judge Agent explicitly asked this follow-up question: "${specificQuestion}"\nPlease prioritize answering it.` : ''}

Provide a JSON response strictly matching this schema, with no markdown formatting or backticks:
{
  "aiSummary": "A concise 2-3 sentence synthesis of what is likely happening based on the evidence.",
  "attackCategoryGuess": "ddos" | "bruteforce" | "exfiltration" | "ransomware_staging" | "unknown"
}`;

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    return {
      abuseIpdbResult: abuse,
      virusTotalResult: vt,
      greyNoiseResult: gn,
      aiSummary: parsed.aiSummary || 'Unable to generate summary.',
      attackCategoryGuess: parsed.attackCategoryGuess || 'unknown'
    };
  } catch (error) {
    console.error('LLM Investigation Error:', error);
    // Fallback if LLM fails (e.g. rate limit)
    return {
      abuseIpdbResult: abuse,
      virusTotalResult: vt,
      greyNoiseResult: gn,
      aiSummary: `Threat Intel gathered. Abuse score: ${abuse.score}. VT: ${vt.maliciousCount}. GN: ${gn.classification}.`,
      attackCategoryGuess: abuse.score > 50 ? 'bruteforce' : 'unknown' as any
    };
  }
}
