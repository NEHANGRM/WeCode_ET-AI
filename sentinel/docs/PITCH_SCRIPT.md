# WatchDog - Hackathon Pitch Script

## 1. The Hook (The Problem)
**"Good morning/afternoon everyone. We are the WeCode Team, and today we’re presenting WatchDog."**

"In 2022, the AIIMS Delhi network was brought to a standstill by a massive ransomware attack. Fast forward to early 2026, and a coordinated cyberattack targeted CBSE's digital infrastructure, forcing emergency shutdowns across multiple states. According to CERT-In, they handled over 1.59 million cybersecurity incidents in 2023 alone, and that number is climbing.

The core problem is **detection speed**. By the time a known malware signature is detected, the attacker has already won. Advanced Persistent Threats (APTs) operate low and slow, evading traditional tools. Public sector organizations discover breaches weeks or months after the initial infiltration."

## 2. The Solution (What is WatchDog?)
"To solve this, we built **WatchDog**: an AI-powered Cyber Resilience platform for critical national infrastructure. 

WatchDog doesn't rely on known signatures. Instead, it is a **Behavioural Anomaly Detection Engine**. It uses specialized LLM agents to continuously correlate weak signals across heterogeneous IT and OT environments, autonomously orchestrating containment and compressing Mean Time To Detect (MTTD) and Mean Time To Respond (MTTR) from weeks down to hours, or even seconds."

## 3. How It Works (The Technical Architecture)
"Let me explain the technical architecture. When a suspicious event occurs, it triggers a strict, code-enforced pipeline made of four distinct agents:

1. **The Watcher:** Ingests raw network telemetry across IT/OT environments, acting as our behavioural anomaly detection layer to filter out benign noise.
2. **The Investigator:** Acting as our APT Campaign Attribution Agent, it enriches the anomaly by querying external Threat Intelligence APIs. It synthesizes this context and maps the attack progression directly to MITRE ATT&CK techniques.
3. **The Judge:** This agent evaluates all the enriched evidence and assigns a strict 0 to 100 confidence score to the threat.
4. **The Responder:** Acting as an Autonomous Incident Response Orchestrator, it formulates containment actions, like isolating a server or blocking an IP."

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
