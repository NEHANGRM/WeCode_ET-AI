# WatchDog

WatchDog is an advanced, multi-agent AI cybersecurity defense pipeline designed to detect, investigate, and autonomously respond to complex network threats (like our Live AIIMS Delhi 2022 ransomware replay simulation) in seconds rather than hours.

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

## ET AI Hackathon - Evaluation Criteria Alignment

WatchDog was built explicitly with the hackathon's core criteria in mind:

- **Relevance to Problem Statement:** Tackles the critical issue of SOC alert fatigue and slow incident response times by automating the triage and investigation phases.
- **Innovation & Creativity:** Replaces traditional static playbooks with dynamic, context-aware AI agents (Watcher, Investigator, Judge, Responder) constrained by strict zero-trust YAML policies and cryptographic audit trails.
- **Technical Implementation:** A robust Next.js frontend paired with a custom multi-agent Node.js backend. Features real-time Socket.io communication, dynamic MongoDB state tracking, and seamless fallback data for flawless demonstrations.
- **Business Viability:** Directly solves the enterprise trust barrier with AI by enforcing "blast radius" checks and code-enforced routing, ensuring the AI cannot accidentally take down critical infrastructure.
- **Presentation & Clarity:** The project features a premium, cinematic landing page and a highly interactive "glassmorphism" dashboard that visualizes the AI's real-time thought process, complete with a Live AIIMS Delhi simulation replay.
- **Impact & Scalability:** Designed to scale horizontally. The agent pipeline can ingest thousands of logs, filter the noise, and only escalate genuinely ambiguous events to human operators, drastically multiplying a security team's effectiveness.
