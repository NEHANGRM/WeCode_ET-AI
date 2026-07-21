# Sentinel

Sentinel is an advanced, multi-agent AI cybersecurity defense pipeline designed to detect, investigate, and autonomously respond to complex network threats (like the AIIMS Delhi 2022 ransomware attack) in seconds rather than hours.

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
- [Demo Guide](./docs/DEMO_GUIDE.md) - How to run the built-in simulations (AIIMS Replay & Ambiguous Event).
