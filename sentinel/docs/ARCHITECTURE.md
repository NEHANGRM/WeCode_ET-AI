# WatchDog Architecture Guide

WatchDog uses a multi-agent orchestration pipeline to investigate network anomalies and respond to threats.

## 1. Pipeline Overview

The pipeline strictly routes events through a series of specialized LLM Agents:
1. **Correlator (Tier 2)**: Checks for slow, long-term APT patterns across historical events.
2. **Watcher**: The initial trigger/monitoring layer that flags anomalies (e.g., failed logins, port scans).
3. **Investigator**: Gathers context. It queries Threat Intel APIs (AbuseIPDB, VirusTotal, GreyNoise) and uses an LLM to synthesize a technical summary, guess the attack category, and map it to MITRE ATT&CK techniques.
4. **Judge**: Evaluates the evidence and assigns a 0-100 `confidence` score.
5. **Responder**: If an action is required, the Responder validates the Judge's recommended action against the security `policy.json` and evaluates the blast radius using the dependency graph (`assets.json`).
6. **Explainer**: Translates the technical pipeline decisions into a plain-English summary for human analysts.
7. **Record**: Logs every state transition to the database for auditing and reporting.

## 2. Code-Enforced Routing

While the LLMs provide analysis and confidence scoring, the actual execution path is strictly hardcoded for safety:
- **Confidence > 80**: Confirmed attack. The system bypasses human review and automatically executes the Responder agent to mitigate the threat.
- **Confidence 40-80**: Suspicious activity. The system pauses and escalates the event to the **Human Review Queue**. The system will *not* auto-act.
- **Confidence < 40**: Background noise. The event is quietly closed and logged without triggering an alert.

## 3. Policy Enforcement (`policy.json`)

To prevent the LLM from hallucinating destructive commands (e.g., shutting down a life-support system because of a false positive), the Responder must check `policy.json`.
If the Judge recommends `isolate_segment` on an asset classed as `life_support`, the code intercepts this and downgrades the action to the safest permitted alternative (like `alert_human`).

## 4. Blast Radius Validation (`assets.json`)

When an action like `isolate_segment` is approved, the system traverses `assets.json` to find all dependent systems. If the number of affected systems exceeds the `blast_radius_threshold` for that asset class, the action is blocked and flagged for human review.

## 5. UI/UX Aesthetic

The dashboard is built entirely with a dark, translucent "glassmorphism" aesthetic (`bg-white/5` with `backdrop-blur`). This creates a cohesive, premium Security Operations Center (SOC) feel without blinding white artifacts.
