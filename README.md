# Heal Hub

**AI-powered post-surgical patient follow-up system.**

Heal Hub autonomously monitors patient recovery through WhatsApp, detects complications early via AI analysis (text, voice, wound photos), and alerts doctors in real-time through a premium dashboard.

Built for **HackWithAI 2026** | Problem Statement #23 | Team Cloud Crusherz

---

## Features

- **Autonomous WhatsApp follow-ups** on smart schedules based on surgery type
- **Multilingual AI agent** — English, Hindi, Telugu (text + voice)
- **Wound photo analysis** using Gemini 2.0 Flash vision
- **Voice note understanding** and AI voice callbacks
- **4-level escalation** (Green → Yellow → Red → Critical)
- **Real-time doctor dashboard** with Socket.io live updates
- **AI reasoning transparency** — doctors see WHY alerts were triggered

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Framer Motion, Recharts, shadcn/ui |
| **Backend** | Python, FastAPI, MongoDB, Socket.io |
| **AI** | Google Gemini 2.0 Flash, Claude Haiku 3.5 |
| **WhatsApp** | Twilio WhatsApp Business API |
| **Voice** | Deepgram (STT), ElevenLabs (TTS), Twilio Voice |

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas)

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env    # Fill in your API keys
python seed_data.py
uvicorn app.main:socket_app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### One-Click Start (Windows)

```bash
# Double-click run_all.bat or:
./run_all.bat
```

### Demo Login

```
Email:    priya@healhub.com
Password: doctor123
```

## Architecture

```
Patient (WhatsApp) ──→ Twilio Webhook ──→ AI Brain (Gemini/Claude)
                                              │
                                       Symptom Analyzer
                                              │
                                       Escalation Engine
                                              │
                              ┌───────────────┼───────────────┐
                              │               │               │
                        Doctor SMS    Family WhatsApp   Dashboard Alert
                              │
                    Doctor Dashboard ←── Socket.io ←── Real-time Updates
```

## Docs

- [Product Requirements (PRD)](docs/PRD.md)
- [Technical Depth](docs/TECHNICAL_DEPTH.md)
