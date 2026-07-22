# WatchDog - Hackathon Pitch Script

## 1. The Hook (The Problem)
**"Good morning/afternoon everyone. We are the WeCode Team, and today we’re presenting WatchDog."**

"In 2022, the AIIMS Delhi network was brought to a standstill by a massive ransomware attack. The breach wasn't necessarily because they lacked security tools, but because human analysts simply cannot triage, investigate, and respond to thousands of alerts fast enough. The industry is suffering from severe **alert fatigue**. When an attack moves laterally in seconds, humans cannot keep up."

## 2. The Solution (What is WatchDog?)
"To solve this, we built **WatchDog**: an autonomous, multi-agent Incident Response pipeline. 

WatchDog doesn't just surface alerts; it actively investigates them using specialized LLM agents and autonomously physically neutralizes high-confidence threats in real-time, all while leaving a cryptographically auditable trail."

## 3. How It Works (The Technical Architecture)
"Let me explain the technical architecture. When a suspicious event occurs, it triggers a strict, code-enforced pipeline made of four distinct agents:

1. **The Watcher:** Ingests raw network telemetry, filtering out benign noise.
2. **The Investigator:** It takes the anomaly and enriches it by querying external Threat Intelligence APIs like AbuseIPDB, VirusTotal, and GreyNoise. It synthesizes this context and maps it to MITRE ATT&CK techniques.
3. **The Judge:** This agent evaluates all the enriched evidence and assigns a strict 0 to 100 confidence score to the threat.
4. **The Responder:** If a threat is confirmed, the Responder formulates an action, like isolating a server or blocking an IP."

## 4. The Enterprise Trust Factor (Business Viability)
"Now, you might be thinking: *'You’re letting an LLM execute destructive commands on a network?'* 

**Absolutely not.** 

We designed WatchDog with strict **Zero-Trust Guardrails** to solve the enterprise trust barrier. The LLMs provide intelligence, but the execution path is strictly hardcoded:
- If the Judge's confidence is **over 80**, the threat is auto-remediated.
- If it's **between 40 and 80**, the execution is paused, and it is routed to a Human-in-the-Loop review queue. 
- Furthermore, the Responder must validate any action against a predefined `policy.json` and a dependency graph (`assets.json`). If the system tries to isolate a critical 'Life Support' network segment, the code physically intercepts it, blocks the AI's action, and flags a human."

## 5. The Demo (Walking through the UI)
*(Start on the Landing Page)*
"Here on our landing page, you can see our 4-agent flow. Let's launch the platform."
*(Click Launch Platform - wait for the smooth transition)*

"We are now in the WatchDog SOC Dashboard. To demonstrate the system's power, we are going to run a live simulation of the AIIMS Delhi ransomware attack."
*(Click Replay AIIMS Delhi Attack)*

"Watch the pipeline in real-time. The system has detected a port scan, followed by credential brute-forcing, and lateral movement via the MODBUS protocol. 
Because the telemetry maps perfectly to a catastrophic ransomware chain, the Investigator gathers the threat intel, and the Judge instantly scores it at **over 80 confidence**. 
Without waiting for a human, the Responder validates the action against the blast radius policy, and autonomously drops the malicious connection—neutralizing the attack in seconds."

*(Click Ambiguous Event)*
"However, if we trigger an Ambiguous Event—like a developer repeatedly failing an SMB login—the Judge scores it at **65**. Because it falls in the gray area, the strict routing pauses the AI. The event is escalated to the Human Review Queue, where an analyst can review the Explainer's plain-English summary and manually approve or dismiss the action."

## 6. Conclusion (Impact)
"With WatchDog, we are not replacing human analysts. We are multiplying their effectiveness. By autonomously handling the noise and auto-resolving clear threats, humans are only called in for highly ambiguous, complex decisions. 

Thank you, and we'd love to answer any questions."
