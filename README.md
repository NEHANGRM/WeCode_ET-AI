# WatchDog

WatchDog is an AI-powered Cyber Resilience platform for critical national infrastructure. It autonomously detects behavioural anomalies, correlates weak signals across heterogeneous IT and OT environments, maps attack progression against MITRE ATT&CK, and orchestrates containment actions—compressing Mean Time To Detect (MTTD) and Mean Time To Respond (MTTR) from weeks to hours.

## Key Features
- **Multi-Agent Architecture**: Uses a specialized pipeline of LLM agents (Watcher, Investigator, Judge, Responder) to analyze and mitigate threats.
- **Code-Enforced Safety**: The Judge agent determines confidence, but the pipeline enforces strict code-level routing (e.g., auto-blocking >80%, Human-in-the-loop 40-80%).
- **Policy Enforcement**: Automated actions are strictly validated against a predefined `policy.json` and a blast-radius dependency graph (`assets.json`) before execution.
- **Dark Mode Aesthetic**: A sleek, dark-translucent glass UI tailored for security operations centers (SOC).

## ET AI Hackathon - Judging Criteria Alignment

WatchDog was built explicitly to solve the **AI-Driven Cyber Resilience for Critical National Infrastructure** challenge, addressing the CERT-In statistics and recent AIIMS/CBSE breaches.

- **Business Impact (25%):** Directly solves the delayed detection problem in government entities. By acting as an Autonomous Incident Response Orchestrator (SOAR), it compresses MTTD and MTTR, preventing catastrophic downtime in critical infrastructure while enforcing "blast radius" thresholds to guarantee operational safety.
- **Technical Excellence (25%):** A robust Next.js frontend paired with a custom Multi-Agent Node.js backend. Features real-time Socket.io communication, RAG/Knowledge Graph concepts for MITRE ATT&CK mapping, and seamless fallback data for flawless demonstrations. Ensures full auditability of every automated action taken.
- **Innovation (20%):** Replaces traditional signature-based playbooks with an Agentic AI pipeline (Watcher, Investigator, Judge, Responder). It acts as an APT Campaign Attribution Agent, using LLMs to synthesize context rather than relying on brittle, known malware signatures.
- **Scalability (15%):** Designed to scale horizontally across heterogeneous IT/OT environments. The agent pipeline can ingest millions of logs, filter the noise, and only escalate genuinely ambiguous events to human operators, drastically multiplying a security team's capacity.
- **User Experience (15%):** The project features a premium, cinematic landing page and a highly interactive "glassmorphism" dashboard that visualizes the AI's real-time thought process, complete with a Live AIIMS Delhi ransomware simulation replay.

---

## 🧠 How It Works

![Architecture Diagram](sentinel/architecture.png)

```text
┌──────────────┐   ┌───────────────┐   ┌─────────────┐   ┌──────────────┐   ┌─────────────┐
│  Detection   │──▶│  Enrichment   │──▶│   Triage    │──▶│   Decision   │──▶│    Audit    │
│ (rule-based) │   │ (LLM + APIs)  │   │    (LLM)    │   │ (LLM, fixed  │   │ (ledger     │
│              │   │               │   │             │   │  action set) │   │  write)     │
└──────────────┘   └───────────────┘   └──────┬──────┘   └──────────────┘   └─────────────┘
                            ▲                  │
                            │  retry if         │
                            └─ confidence <0.7 ─┘
                               (once, then escalates
                                to human if still low)
```

1. **Watcher (Detection) Agent** — deterministic, rule-based (request-rate spikes, known-bad-IP hits). No LLM call — fast and consistent.
2. **Investigator (Enrichment) Agent** — queries AbuseIPDB, VirusTotal, and GreyNoise in parallel, then uses an LLM to summarize findings into a structured threat context.
3. **Judge (Triage) Agent** — classifies the incident with a confidence score. If confidence is ambiguous (40-60%), it re-queries the Investigator with narrower context and retries **once**. If still unconfident, it **escalates to a human** rather than guessing. It also logs its reasoning.
4. **Responder (Decision) Agent** — selects a remediation action from a **fixed, constrained action set** (block IP, isolate segment, open ticket, alert on-call, trigger failover). Never freeform — this is a deliberate compliance guardrail.
5. **Record (Audit) Agent** — appends the full case trail to a hash-chained MongoDB ledger and marks the case resolved.

## ✨ What Makes This Different

- **"Verify Chain" live verification** — the UI visibly re-computes the SHA-256 hash chain of the audit log to prove no records have been altered. If a database entry is tampered with, it identifies exactly where the chain breaks. This turns "tamper-evident audit trail" from a slide claim into something you can verify live.
- **Bounded self-correction, not silent guessing** — the retry-then-escalate rule means the system never fakes confidence it doesn't have. If it's unsure, it passes it to the Review Queue for human approval.
- **Live Pipeline Visualization** — watch the 5 agents hand off work to each other in real-time via WebSockets as an attack occurs.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), Tailwind CSS v4, Framer Motion, Socket.IO Client |
| Backend | Next.js API Routes, Custom Node Server (for Socket.IO) |
| Database | MongoDB (Mongoose) |
| Orchestration | Hand-rolled finite-state machine (`sentinel/lib/agents/pipeline.ts`) |
| AI | Google Gemini API (schema-constrained JSON output) |
| Threat Intel | AbuseIPDB, VirusTotal, GreyNoise API |

## ⚙️ Setup & Run

### Prerequisites
- Node.js 18+
- A MongoDB cluster URL (shared/remote or local)
- Google Gemini API Key (`LLM_API_KEY`) for agent inference.

### Installation

```bash
git clone https://github.com/NEHANGRM/WeCode_ET-AI.git
cd "WeCode_ET-AI/sentinel"

# Install dependencies
npm install

# Setup environment variables
cp .env.local.example .env.local 
# (Add your MONGODB_URI and LLM_API_KEY)

# Seed the database with demo scenarios
node migrate.js

# Run the development server
npm run dev
```

### Documentation
- [Architecture Guide](./sentinel/docs/ARCHITECTURE.md) - Deep dive into the agent pipeline.
- [Demo Guide](./sentinel/docs/DEMO_GUIDE.md) - How to run the built-in simulations (Live AIIMS Replay & Ambiguous Event).

## 🎬 Demo Flow

1. **Cold open** — Dashboard shows pipeline monitoring.
2. **Trigger Simulation** — Click the simulation button. A seeded case runs through the full pipeline, with the Agent Graph lighting up node by node in real time via WebSockets.
3. **Retry in action** — An intentionally ambiguous seeded case triggers the confidence-gated retry loop, escalating to the Review Queue.

## 👥 Team
- Naren Moorthy S
- Sarigasini M
- Nehan G R M