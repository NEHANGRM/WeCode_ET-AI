# 🛡️ Sentinel — Autonomous SOC Incident Response System

> An autonomous, self-correcting, cryptographically auditable multi-agent system for security incident triage and response.

**Built for:** ET AI Hackathon 2026
**Problem Statement:** PS7 — Cyber Resilience for Critical National Infrastructure
**Vertical:** Security Operations (SOC) Incident Response

---

## 🎯 The Problem

Enterprise SOC teams and Critical Infrastructure networks don't have a detection problem — they have an **alert-volume problem**. Manually triaging a single security alert (gathering IP reputation, cross-referencing threat intel, deciding on remediation) typically takes an analyst 15–30 minutes. At enterprise scale, that backlog directly increases Mean-Time-to-Respond (MTTR) — and MTTR is one of the strongest predictors of breach cost and blast radius.

Every automated remediation system that enterprises actually adopt has to clear one trust bar: **"why did the system do that, and can I prove it wasn't a black box?"** Compliance and security leadership won't grant real autonomy to a system that can't answer that question. Sentinel is built around that trust bar as the core product, not an afterthought.

## 💡 The Solution

Sentinel is a **five-agent pipeline** that takes a raw security alert, investigates it, decides what to do, and logs every single decision to a **tamper-evident, hash-chained audit ledger** — one that can be verified live, in front of a skeptical reviewer, in seconds.

**One-line pitch:** *A SOC analyst that never sleeps, never gets fatigued, and shows its work on every decision.*

---

## 🧠 How It Works

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
| Orchestration | Hand-rolled finite-state machine (`lib/agents/pipeline.ts`) |
| AI | Google Gemini API (schema-constrained JSON output) |
| Threat Intel | AbuseIPDB, VirusTotal, GreyNoise API |

## 📁 Project Structure

```text
sentinel/
├── app/                  # Next.js Frontend & API Routes
│   ├── api/              # API endpoints (events, investigate, judge, respond, audit)
│   ├── dashboard/        # Live operations control room
│   └── audit-log/        # Hash chain verification page
├── components/           # React UI components (GlassPanel, Navbar, Sidebar)
├── lib/                  # Backend logic
│   ├── agents/           # Watcher, Investigator, Judge, Responder, Record
│   ├── db/               # MongoDB models (Event, Investigation, Judgment, Action, AuditRecord)
│   ├── integrations/     # AbuseIPDB, VirusTotal, GreyNoise API wrappers
│   └── hashChain.ts      # SHA-256 cryptography ledger logic
├── scripts/              # Database seeding and tampering scripts
└── server.ts             # Custom server for Next.js + Socket.IO
```

## ⚙️ Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- API keys: AbuseIPDB, VirusTotal, GreyNoise (free tiers), and Gemini

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
npx tsx scripts/seed.ts

# Run the development server
npm run dev
```

### Environment Variables (`.env.local`)

```env
MONGODB_URI=mongodb://localhost:27017/sentinel
ABUSEIPDB_KEY=
VIRUSTOTAL_KEY=
GREYNOISE_KEY=
LLM_API_KEY=your_gemini_key
```

> If a threat intel key is missing, the relevant integration falls back to cached/mock responses so the demo doesn't break on network flakiness.

---

## 🎬 Demo Flow

1. **Cold open** — Dashboard shows pipeline monitoring.
2. **Trigger Simulation** — Click the simulation button. A seeded DDoS case runs through the full pipeline, with the Agent Graph lighting up node by node in real time via WebSockets.
3. **Retry in action** — An intentionally ambiguous seeded case triggers the confidence-gated retry loop, escalating to the Review Queue.
4. **Break the Chain** — 
   - Go to Audit Log and click "Verify Chain Integrity" (shows Green/Success).
   - In a terminal, run `npx tsx scripts/tamper.ts` to simulate a malicious database edit.
   - Click "Verify Chain Integrity" again — watch it turn Red and identify the broken hash link!

## 🚧 What's Real vs. Simulated 

| Component | Status |
|---|---|
| 5-Agent Orchestration | ✅ Fully functional async pipeline |
| Hash-chain ledger + verification | ✅ Fully functional (real SHA-256) |
| AbuseIPDB / VirusTotal / GN | ✅ Real API calls (with offline fallbacks) |
| LLM Synthesis & Scoring | ✅ Fully functional (Gemini 2.5 Flash) |
| Confidence-gated retry | ✅ Fully functional |
| Remediation actions | ⚠️ Logged and simulated — no real network/firewall integration |
| Network Traffic | ⚠️ Simulated payload injected via API |

## 📊 Impact

- Collapses a 15–30 minute manual triage window down to seconds for the median alert.
- Cryptographically verifiable audit trail supports NERC CIP, SOC 2, and ISO 27001 evidence requirements.
- Constrained action space and bounded retry logic mean the system never silently oversteps its confidence on critical infrastructure.

## 👥 Team
- Naren
- [Add other team members]

## 📜 License
Hackathon Project - Not intended for unmodified production use.