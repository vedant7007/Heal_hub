# Heal Hub — Your AI Nurse That Never Sleeps

## Problem Statement #23: Autonomous Patient Follow-up Agent

### The Problem
After surgery, 50% of patients fail to follow recovery instructions. Manual follow-up calls are expensive and unsustainable. Complications go undetected until it's too late, leading to hospital readmissions and preventable deaths — especially in rural India where follow-up infrastructure is minimal.

### Our Solution
Heal Hub is an autonomous AI-powered patient follow-up system that:
- **Proactively contacts patients** via WhatsApp on a smart schedule
- **Understands responses** in English, Hindi, and Telugu (text + voice)
- **Analyzes wound photos** using AI vision to detect infections
- **Tracks symptom patterns** over time to detect complications early
- **Alerts doctors instantly** when something needs attention
- **Provides AI voice callbacks** for patients who can't type

### Technology Stack
- **Backend:** Python, FastAPI, MongoDB, Socket.io
- **AI:** Google Gemini Flash 2.0, Claude Haiku 3.5
- **WhatsApp:** Twilio WhatsApp Business API
- **Voice:** Deepgram (STT), ElevenLabs (TTS), Twilio Voice
- **Vision:** Gemini 2.0 Flash (wound photo analysis)
- **Frontend:** Next.js 14, Tailwind CSS, shadcn/ui, Recharts, Framer Motion
- **Translation:** Google Translate API

### Key Features
1. Smart check-in scheduling based on surgery type
2. Multilingual AI agent (English, Hindi, Telugu)
3. Voice note understanding and AI voice callbacks
4. Wound photo analysis with AI
5. 4-level escalation system (Green -> Yellow -> Red -> Critical)
6. Real-time doctor dashboard with patient monitoring
7. AI reasoning transparency (doctor sees WHY alerts were triggered)
8. Family member notifications
9. Recovery analytics and trends

### Setup Instructions

#### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas)

#### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in your API keys in .env
python seed_data.py
uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Environment Variables
Copy `backend/.env.example` to `backend/.env` and fill in:
- `MONGODB_URI` — MongoDB connection string
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` — Twilio credentials
- `GEMINI_API_KEY` — Google Gemini API key
- `ANTHROPIC_API_KEY` — Claude API key
- `DEEPGRAM_API_KEY` — Deepgram STT key
- `ELEVENLABS_API_KEY` — ElevenLabs TTS key

#### Demo Login
- Email: `priya@healhub.com`
- Password: `doctor123`

### Architecture

```
Patient (WhatsApp) --> Twilio Webhook --> AI Brain (Gemini/Claude)
                                              |
                                     Symptom Analyzer
                                              |
                                     Escalation Engine
                                              |
                              +---------------+---------------+
                              |               |               |
                        Doctor SMS      Family WhatsApp   Dashboard Alert
                              |
                    Doctor Dashboard <-- Socket.io <-- Real-time Updates
```

### Team
- Team Cloud Crusherz — HackWithAI 2026
