# WatchDog

WatchDog is an AI-powered Cyber Resilience platform for critical national infrastructure. It autonomously detects behavioural anomalies, correlates weak signals across heterogeneous IT and OT environments, maps attack progression against MITRE ATT&CK, and orchestrates containment actions—compressing Mean Time To Detect (MTTD) and Mean Time To Respond (MTTR) from weeks to hours.

## Key Features
- **Multi-Agent Architecture**: Uses a specialized pipeline of LLM agents (Watcher, Investigator, Judge, Responder) to analyze and mitigate threats.
- **Code-Enforced Safety**: The Judge agent determines confidence, but the pipeline enforces strict code-level routing (e.g., auto-blocking >80%, Human-in-the-loop 40-80%).
- **Policy Enforcement**: Automated actions are strictly validated against a predefined `policy.json` and a blast-radius dependency graph (`assets.json`) before execution.
- **Dark Mode Aesthetic**: A sleek, dark-translucent glass UI tailored for security operations centers (SOC).

## Setup & Run

### Prerequisites
- Node.js 18+
- A MongoDB cluster URL (shared/remote or local)
- Google Gemini API Key (`LLM_API_KEY`) for agent inference.

### Installation
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Set up your environment variables in `.env`:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   LLM_API_KEY=your_gemini_api_key
   ```
3. Seed the database with initial demo data (optional but recommended):
   ```bash
   node migrate.js
   ```
4. Start the development server (runs with custom Socket.io integration):
   ```bash
   npm run dev
   ```

### Documentation
- [Architecture Guide](./docs/ARCHITECTURE.md) - Deep dive into the agent pipeline.
- [Demo Guide](./docs/DEMO_GUIDE.md) - How to run the built-in simulations (Live AIIMS Replay & Ambiguous Event).

## ET AI Hackathon - Judging Criteria Alignment

WatchDog was built explicitly to solve the **AI-Driven Cyber Resilience for Critical National Infrastructure** challenge, addressing the CERT-In statistics and recent AIIMS/CBSE breaches.

- **Business Impact (25%):** Directly solves the delayed detection problem in government entities. By acting as an Autonomous Incident Response Orchestrator (SOAR), it compresses MTTD and MTTR, preventing catastrophic downtime in critical infrastructure while enforcing "blast radius" thresholds to guarantee operational safety.
- **Technical Excellence (25%):** A robust Next.js frontend paired with a custom Multi-Agent Node.js backend. Features real-time Socket.io communication, RAG/Knowledge Graph concepts for MITRE ATT&CK mapping, and seamless fallback data for flawless demonstrations. Ensures full auditability of every automated action taken.
- **Innovation (20%):** Replaces traditional signature-based playbooks with an Agentic AI pipeline (Watcher, Investigator, Judge, Responder). It acts as an APT Campaign Attribution Agent, using LLMs to synthesize context rather than relying on brittle, known malware signatures.
- **Scalability (15%):** Designed to scale horizontally across heterogeneous IT/OT environments. The agent pipeline can ingest millions of logs, filter the noise, and only escalate genuinely ambiguous events to human operators, drastically multiplying a security team's capacity.
- **User Experience (15%):** The project features a premium, cinematic landing page and a highly interactive "glassmorphism" dashboard that visualizes the AI's real-time thought process, complete with a Live AIIMS Delhi ransomware simulation replay.
