# Sentinel Demo Guide

The Sentinel dashboard comes with built-in simulations to help you test the pipeline and UI.

## 1. AIIMS Delhi Ransomware Replay
Clicking **"Replay AIIMS Delhi Attack"** on the dashboard will inject a 4-phase attack sequence into the system.

- **Phase 1 (Reconnaissance)**: Port scan on `185.150.11.23`.
- **Phase 2 (Credential Attack)**: 847 failed logins on the EHR server.
- **Phase 3 (Lateral Movement)**: MODBUS protocol violation targeting an ICU ventilator.
- **Phase 4 (Ransomware Staging)**: File encryption headers detected on the EHR server.

Because these are high-severity indicators mimicking a known catastrophic attack, the LLM Judge will naturally score these with a confidence **> 80**. 
As a result, you will see the pipeline **auto-resolve** these threats (e.g., blocking the IP immediately) without needing human intervention.

## 2. The "Ambiguous Event"
Clicking **"Ambiguous Event"** injects a simulated lateral movement attempt (repeated SMB access denied errors). 

To guarantee you can test the **Human Review Queue** UI, the `Judge` agent is hardcoded to recognize this specific demo payload (`POTENTIAL_LATERAL_MOVEMENT`) and forcefully assign it a confidence score of **65**.

Because the score falls between 40 and 80, the strict code-enforced pipeline will flag the event as `suspicious` and route it to your **Human Review Queue**, waiting for you to manually click "Approve" or "Dismiss".

## 3. Threat Intelligence Simulations
To ensure the pipeline functions seamlessly out-of-the-box without requiring 3rd-party API keys, Sentinel uses **simulated fallback data** for Threat Intelligence integrations.

When the `Investigator` agent runs, it attempts to fetch data from:
- **GreyNoise** (Internet background noise / targeted attack classification)
- **AbuseIPDB** (Malicious IP reputation scoring)
- **VirusTotal** (Malicious file/IP engine detections)

If the respective API keys (e.g., `GREYNOISE_KEY`) are not found in the `.env` file, the system automatically falls back to hardcoded mock responses. For example, in the AIIMS replay, the attacker IP `185.150.11.23` is simulated to return a `malicious` classification from GreyNoise and a high abuse score to accurately trigger the Judge's threat response.

## 4. Database Reset
If your dashboard gets too cluttered with events, you can wipe the MongoDB cluster and re-seed it with the baseline data by running:
```bash
node migrate.js
```
