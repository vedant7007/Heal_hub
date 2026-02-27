# Heal Hub - AI-Powered Post-Surgical Patient Follow-up System

> **"Your AI Nurse That Never Sleeps"**

Built for **HackWithAI 2026** | Problem Statement #23 | Team Cloud Crusherz

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![Twilio](https://img.shields.io/badge/Twilio-F22F46?style=flat&logo=twilio&logoColor=white)

---

## Problem Statement

After surgery, **50% of patients fail to follow post-operative recovery instructions**. Hospitals don't have the manpower to manually call every discharged patient. Complications like infections, internal bleeding, or wound dehiscence go undetected for days. By the time patients show up at the ER, it's often too late — leading to **preventable readmissions, higher costs, and in worst cases, loss of life**.

Rural and semi-urban patients face an even bigger gap: language barriers, low health literacy, and poor access to follow-up care mean they often suffer in silence until a minor issue becomes a medical emergency.

### The Core Challenge

How do you provide **continuous, personalized, multilingual post-surgical monitoring** to thousands of patients simultaneously — without burning out your medical staff?

---

## Our Solution

Heal Hub is an **autonomous AI agent** that proactively follows up with post-surgery patients through **WhatsApp** — the app they already use every day. It understands text, voice notes, and wound photos in **English, Hindi, and Telugu**. It tracks symptoms over time, detects early warning signs, and alerts doctors the moment something looks wrong.

Think of it as a tireless AI nurse that:
- Sends scheduled check-ins at the right times based on surgery type
- Understands when a patient says "bahut dard ho raha hai" (having a lot of pain) in a voice note
- Analyzes wound photos to detect infection signs
- Knows the difference between normal post-op discomfort and a genuine emergency
- Escalates to the right doctor with full context, not just a generic alert

On the other side, doctors get a **real-time dashboard** showing all their patients' recovery status at a glance — with AI-generated risk scores, symptom trends, and one-click actions.

---

## What Makes Heal Hub Different

| Traditional Follow-up | Heal Hub |
|---|---|
| Manual phone calls by staff | Autonomous AI conversations 24/7 |
| English-only forms | Understands Hindi, Telugu, English (text + voice) |
| "How are you feeling?" checkbox | Contextual multi-turn conversations with memory |
| No image analysis | AI wound photo analysis (Gemini Vision) |
| Delayed alerts via email | Real-time Socket.IO dashboard alerts |
| Generic follow-up schedule | Smart scheduling based on surgery type and recovery stage |
| Doctor calls patient back | AI initiates voice calls with natural TTS |
| One-size-fits-all | NLP pipeline extracts pain scores, symptoms, sentiment per patient |

### Key Differentiators

1. **Conversational AI Agent, Not a Chatbot** — We built a proper state machine with 12 conversation states, intent classification, and dedicated handlers. It's not a simple if-else chain or a raw LLM wrapper.

2. **7-Module NLP Pipeline** — Before the LLM even sees a message, our NLP pipeline extracts medical entities (NER), pain scores, sentiment, risk levels, symptom trends, and message topics. The LLM gets enriched, structured data — not raw text.

3. **4-Level Escalation Engine** — Green (normal) -> Yellow (needs attention) -> Red (urgent) -> Critical (emergency). Each level triggers different actions: dashboard alert, doctor SMS, family WhatsApp notification.

4. **Voice-First for Rural Patients** — Many patients can't type. They send voice notes in their local language. We transcribe (Deepgram), translate, analyze, and respond — all automatically. The AI can even call patients who prefer voice.

5. **Doctor Handoff Mode** — Doctors can take over any conversation in real-time. The AI pauses, the doctor chats directly via dashboard, and the AI resumes when the doctor is done.

---

## System Architecture

```
                                    HEAL HUB ARCHITECTURE

    PATIENT SIDE                        BACKEND                         DOCTOR SIDE
    ============                    ==============                    ==============

    WhatsApp ──────────┐
      - Text messages  │         ┌──────────────────┐
      - Voice notes    ├────────>│  Twilio Webhook   │
      - Wound photos   │         │  (FastAPI)        │
      - Voice calls    │         └────────┬─────────┘
                       │                  │
                       │                  v
                       │         ┌──────────────────┐
                       │         │  Agent Router     │
                       │         │  (State Machine)  │
                       │         │  12 conv states   │
                       │         └────────┬─────────┘
                       │                  │
                       │         ┌────────v─────────┐
                       │         │   NLP Pipeline    │     ┌──────────────┐
                       │         │   (7 modules)     │────>│   MongoDB    │
                       │         │                   │     │   Atlas      │
                       │         │  - Medical NER    │     └──────┬───────┘
                       │         │  - Pain Extractor │            │
                       │         │  - Sentiment      │            │
                       │         │  - Risk Classifier│            │
                       │         └────────┬─────────┘            │
                       │                  │                       │
                       │         ┌────────v─────────┐            │
                       │         │   AI Brain        │            │
                       │         │  Gemini + Claude  │            │
                       │         └────────┬─────────┘            │
                       │                  │                       │
                       │         ┌────────v─────────┐            │
                       │         │  Escalation       │            │
                       │         │  Engine           │            │
                       │         │  (4-level)        │            │
                       │         └────────┬─────────┘            │
                       │                  │                       │
                       │                  v                       v
                       │         ┌──────────────────┐   ┌──────────────────┐
                       │         │  Socket.IO        │──>│  Doctor Dashboard │
                       │         │  (Real-time)      │   │  (Next.js)       │
                       │         └──────────────────┘   │                  │
                       │                                 │  - Live alerts   │
                       │<────────────────────────────────│  - Patient list  │
                       │         AI Response /           │  - Analytics     │
                       │         Doctor Reply            │  - Chat view     │
                       │                                 │  - Handoff mode  │
                                                        └──────────────────┘
```

---

## Tech Stack

| Layer | Technology | Why We Chose It |
|-------|-----------|-----------------|
| **Backend** | FastAPI + Uvicorn | Async-native, perfect for handling concurrent WhatsApp webhooks |
| **Database** | MongoDB Atlas + Motor | Flexible schema for varied patient data, async driver for non-blocking I/O |
| **Real-time** | Python-SocketIO | Instant dashboard updates when patients send messages |
| **Scheduling** | APScheduler | Cron-based medicine reminders (9 AM, 2 PM, 9 PM) |
| **Primary AI** | Google Gemini 2.0 Flash | Fast, multimodal (handles wound photos), good multilingual support |
| **Backup AI** | Claude Haiku 3.5 | Better medical reasoning for complex cases |
| **Speech-to-Text** | Deepgram | Fastest real-time transcription with Hindi/Telugu support |
| **Text-to-Speech** | ElevenLabs | Natural-sounding voice for patient callbacks |
| **WhatsApp** | Twilio API | Industry standard, supports text + media + voice |
| **Frontend** | Next.js 16 + React 19 | Server components, fast routing, great DX |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid development with consistent design system |
| **Charts** | Recharts | Simple, declarative charts for analytics |
| **Animations** | Framer Motion | Smooth transitions and micro-interactions |

---

## Features

### Patient Side (WhatsApp)
- **Scheduled AI check-ins** based on surgery type and recovery timeline
- **Multi-turn conversations** — the AI remembers context across messages
- **Voice note support** — speak in Hindi/Telugu/English, AI understands
- **Wound photo analysis** — send a photo, get AI assessment
- **Medicine reminders** — 3x daily with confirmation tracking
- **AI voice callbacks** — patients can request a call from the AI nurse
- **Appointment booking** via natural language
- **Family contact alerts** — family members get notified for critical cases

### Doctor Side (Dashboard)
- **Real-time patient overview** with risk scores and recovery status
- **Live alert feed** with 4-level severity (Green/Yellow/Red/Critical)
- **Patient detail view** with symptom timeline, pain charts, and chat history
- **Doctor handoff mode** — take over any AI conversation instantly
- **AI-generated reports** in 6 languages
- **Analytics dashboard** — response rates, complication trends, recovery curves
- **Appointment management** with WhatsApp notifications
- **Role-based access** — separate doctor and nurse views

### AI & NLP Pipeline
- **7-module NLP pipeline** running before every LLM call:
  1. Text Preprocessor — normalize, clean, handle multilingual input
  2. Medical NER — extract symptoms, body parts, medications
  3. Pain Extractor — extract pain score (1-10) from natural language
  4. Pain Trend Analyzer — detect worsening/improving trends
  5. Sentiment Analyzer — gauge patient emotional state
  6. Message Classifier — categorize message topic
  7. Risk Classifier — compute composite risk score
- **Dual-LLM architecture** — Gemini for speed, Claude for depth
- **Structured JSON responses** — AI returns actionable data, not just text

---

## Project Structure

```
Heal_hub/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + Socket.IO setup
│   │   ├── config.py            # Environment configuration
│   │   ├── database.py          # MongoDB connection + indexes
│   │   ├── agent/               # Conversational AI agent
│   │   │   ├── state.py         # 12 conversation states
│   │   │   ├── intent.py        # Intent classification
│   │   │   ├── router.py        # Message routing
│   │   │   └── handlers.py      # Action handlers
│   │   ├── models/              # Pydantic schemas
│   │   ├── routes/              # API endpoints (8 routers)
│   │   ├── services/            # Business logic (12 services)
│   │   ├── nlp/                 # NLP pipeline (7 modules)
│   │   └── utils/               # Helpers + rate limiting
│   ├── tests/                   # Pytest test suite
│   ├── requirements.txt
│   ├── Dockerfile
│   └── seed_data.py             # Demo data seeder
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js pages (10 routes)
│   │   ├── components/          # React components
│   │   ├── hooks/               # Custom hooks
│   │   ├── lib/                 # API client, socket, utils
│   │   └── types/               # TypeScript definitions
│   └── package.json
├── docs/
│   ├── PRD.md                   # Product Requirements
│   └── TECHNICAL_DEPTH.md       # Technical Documentation
└── .github/
    └── workflows/ci.yml         # CI pipeline
```

---

## Database Schema

```
MongoDB Collections:
├── doctors          # Doctor/nurse profiles + auth
├── patients         # Patient records with surgery info, medicines, contacts
├── checkins         # Daily recovery check-in records
├── alerts           # Escalation alerts with severity levels
├── conversations    # Full chat history per patient
├── appointments     # Scheduled appointments
└── call_sessions    # Voice call state (TTL-indexed)

Key Indexes:
- doctors.email (unique)
- patients.doctor_id + is_active + created_at (compound)
- patients.phone (for webhook lookups)
- checkins.patient_id + created_at (for timeline queries)
- alerts.doctor_id + status + created_at (for dashboard filtering)
- call_sessions.call_sid (unique) + TTL on updated_at
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register doctor/nurse |
| POST | `/api/auth/login` | Login with JWT |
| GET | `/api/auth/me` | Get current user profile |
| GET | `/api/patients` | List doctor's patients |
| POST | `/api/patients` | Add new patient |
| GET | `/api/patients/:id` | Get patient details |
| PUT | `/api/patients/:id` | Update patient |
| DELETE | `/api/patients/:id` | Remove patient |
| POST | `/api/patients/:id/reply` | Doctor sends WhatsApp reply |
| GET | `/api/checkins` | Get check-in records |
| GET | `/api/alerts` | Get alerts (filtered by severity) |
| PUT | `/api/alerts/:id` | Update alert status |
| GET | `/api/analytics/overview` | Dashboard stats |
| GET | `/api/analytics/complications` | Complication trends |
| GET | `/api/analytics/response-rates` | Check-in response rates |
| POST | `/api/webhook/whatsapp` | Twilio incoming webhook |
| POST | `/api/webhook/voice/*` | Voice call TwiML endpoints |
| GET | `/api/appointments` | List appointments |
| POST | `/api/appointments` | Create appointment |

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas free tier)
- Twilio account (for WhatsApp)
- API keys: Gemini, Anthropic, Deepgram, ElevenLabs

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Fill in your API keys
python seed_data.py             # Load demo data
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### WhatsApp Webhook (Local Development)

```bash
# In a separate terminal — expose your local server
ngrok http 8000

# Then set the ngrok URL in Twilio Console:
# Webhook URL: https://your-id.ngrok.app/api/webhook/whatsapp
```

### Demo Login

```
Email:    priya@healhub.com
Password: doctor123
```

---

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Backend | Railway | `healhub-backend-production.up.railway.app` |
| Frontend | Vercel | Deployed via `vercel --prod` |
| Database | MongoDB Atlas | M0 free tier |

### Environment Variables

See [`.env.example`](backend/.env.example) for the full list of required environment variables.

---

## Security Measures

- **JWT authentication** with bcrypt password hashing
- **Twilio webhook signature validation** — rejects forged requests
- **IDOR protection** — all endpoints verify doctor ownership of resources
- **Role-based access control** — nurses and doctors see different data
- **Rate limiting** — sliding window limiter on webhook and voice routes
- **Payload size guards** — prevents oversized messages/media
- **No PII in logs** — phone numbers and message content are never logged
- **CORS configuration** — whitelisted origins only, no wildcards in production

---

## Testing

```bash
cd backend
pytest -q tests/

# Tests cover:
# - Model validation and mutable default isolation
# - Config CSV parsing for CORS origins
# - Rate limiter sliding window behavior
# - IDOR protection (ownership guards)
# - Tenant-scoped analytics pipelines
# - Twilio webhook signature validation
```

---

## CI/CD

GitHub Actions workflow runs on every push:
- **Backend**: `pytest -q backend/tests` — model, security, and config tests
- **Frontend**: `npm run lint` — ESLint with Next.js rules

---

## Team

**Team Cloud Crusherz** — HackWithAI 2026

---

## License

This project was built for HackWithAI 2026 (Problem Statement #23).
