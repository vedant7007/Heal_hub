# Heal Hub — Technical Depth Document

> **Autonomous AI-Powered Post-Surgical Patient Follow-up System**
> Built for hackathon evaluation — this document covers every file, every endpoint, every data flow.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Backend Deep Dive (File-by-File)](#2-backend-deep-dive)
3. [AI Pipeline Analysis](#3-ai-pipeline-analysis)
4. [API Documentation](#4-api-documentation)
5. [Database Schema](#5-database-schema)
6. [Frontend Analysis](#6-frontend-analysis)
7. [External Service Integration](#7-external-service-integration)
8. [Lines of Code Count](#8-lines-of-code-count)
9. [Tech Stack Summary](#9-tech-stack-summary)

---

## 1. Architecture Overview

### System Architecture Pattern

Heal Hub follows a **modular monolith** architecture with real-time event-driven communication:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PATIENTS (WhatsApp)                         │
│                   Text · Voice Notes · Images                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │ Twilio Webhooks
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI + Socket.IO)                   │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌────────────────┐  │
│  │ Webhook  │→ │ Translator│→ │  AI Brain  │→ │  Escalation    │  │
│  │ Router   │  │ (Google)  │  │(Claude/    │  │  Engine        │  │
│  │          │  │           │  │ Gemini)    │  │                │  │
│  └──────────┘  └───────────┘  └────────────┘  └────────────────┘  │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌────────────────┐  │
│  │ Voice    │  │ Speech    │  │  Wound     │  │  Notification  │  │
│  │ Call     │  │ (Deepgram │  │  Analyzer  │  │  Service       │  │
│  │ Agent    │  │ /11Labs)  │  │ (Gemini    │  │ (SMS/WA/       │  │
│  │          │  │           │  │  Vision)   │  │  Socket)       │  │
│  └──────────┘  └───────────┘  └────────────┘  └────────────────┘  │
│                         │                                          │
│                    MongoDB (Motor async driver)                     │
└─────────────────────────┬──────────────────────────────────────────┘
                          │ Socket.IO (WebSocket)
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js 16 + React 19)                 │
│              Doctor Dashboard · Real-time Monitoring                │
│          Patient Cards · Chat · Analytics · Alert System            │
└─────────────────────────────────────────────────────────────────────┘
```

### Backend ↔ Frontend Communication

| Channel | Protocol | Purpose |
|---------|----------|---------|
| REST API | HTTP/JSON | CRUD operations, auth, data queries |
| Socket.IO | WebSocket | Real-time alerts, new check-ins, live chat updates |
| JWT Bearer | HTTP Header | Authentication on all protected endpoints |

### Real-Time Update Flow (Socket.IO)

```
Patient sends WhatsApp → Twilio webhook fires → Backend processes message →
  ├── sio.emit("new_checkin", {...})  → Dashboard updates patient list
  ├── sio.emit("new_alert", {...})    → Alert banner appears instantly
  └── sio.emit("new_message", {...})  → Chat view updates in real-time
```

Events emitted:
- `new_checkin` — When any patient check-in is processed
- `new_alert` — When escalation triggers a new alert
- `new_message` — When a patient sends a message (in doctor handoff mode)
- `status_change` — When a patient's risk status changes

### AI Pipeline (End-to-End Message Flow)

```
1. Patient sends WhatsApp message (text/voice/image)
2. Twilio webhook → POST /api/webhook/whatsapp
3. Patient lookup by phone number (exact match → last-10-digit regex fallback)
4. Media handling:
   ├── Voice note → Deepgram STT → text transcript
   ├── Image → Gemini Vision → wound analysis JSON
   └── Text → passed directly
5. Language detection (langdetect library)
6. Translation to English (deep-translator → Google Translate API)
7. AI Brain processes message:
   ├── Build patient context (history, symptoms, pain scores, medicines)
   ├── Format system prompt with patient data
   ├── Call Claude Haiku (PRIMARY) → parse JSON response
   ├── If Claude fails → Call Gemini 2.0 Flash (FALLBACK)
   └── If both fail → Return safe generic response
8. Response validation (reject generic "doctor will review" phrases)
9. Save to database:
   ├── Conversation (messages array push)
   ├── Check-in record (symptoms, pain, AI assessment)
   └── Patient status update (risk level, risk score)
10. Escalation evaluation:
    ├── Level 1 (Yellow) → Create alert
    ├── Level 2 (Red) → Alert + SMS doctor + WhatsApp family
    └── Level 3 (Critical) → Alert + Auto voice callback + Socket notification
11. Translate AI reply back to patient's language
12. Send reply via Twilio WhatsApp API
13. Emit Socket.IO events for dashboard updates
```

---

## 2. Backend Deep Dive

### `app/main.py` (93 lines)
**Purpose:** Application entry point and server configuration.
- Creates FastAPI app with CORS (allow all origins for development)
- Initializes Socket.IO async server (`socketio.AsyncServer`)
- Mounts Socket.IO as ASGI middleware wrapping FastAPI
- Registers 7 route modules with prefixed paths
- Mounts static file server for ElevenLabs TTS audio cache (`/api/audio/`)
- `startup_event`: Pings MongoDB, starts APScheduler for scheduled check-ins
- Socket.IO event handlers for `connect`/`disconnect` logging

### `app/config.py` (43 lines)
**Purpose:** Centralized configuration via environment variables.
- Uses `pydantic-settings` `BaseSettings` for type-safe env loading
- Configuration groups:
  - MongoDB: `MONGODB_URI`
  - Twilio: Account SID, Auth Token, WhatsApp number, Phone number
  - AI: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`
  - Speech: `DEEPGRAM_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`
  - App: `APP_URL`, `FRONTEND_URL`, JWT secret/algorithm/expiration, port
- `@lru_cache` singleton pattern for settings instance

### `app/database.py` (22 lines)
**Purpose:** MongoDB connection and collection references.
- Uses Motor async driver (`AsyncIOMotorClient`)
- Exposes 5 typed collection references: `patients`, `doctors`, `checkins`, `alerts`, `conversations`
- `ping_db()` async function for health checks

### `app/models/patient.py` (75 lines)
**Purpose:** Pydantic models for patient data.
- `FamilyContact`: name, phone, relation (son/daughter/spouse/parent)
- `Medicine`: name, dosage, frequency, taken_count, total_count
- `CheckinSchedule`: days array (default [1,3,5,7,14,21,30]), time string
- `PatientCreate`: Full registration payload with all nested models
- `PatientUpdate`: Optional fields for partial updates
- `PatientResponse`: Output model with computed `days_since_surgery`

### `app/models/doctor.py` (40 lines)
**Purpose:** Pydantic models for doctor auth.
- `DoctorRegister`: name, email, password, phone, specialization, hospital
- `DoctorLogin`: email, password
- `DoctorResponse`: Output model with `_id` alias to `id`, password excluded
- `DoctorInDB`: Internal model with hashed password

### `app/models/checkin.py` (59 lines)
**Purpose:** Pydantic models for check-in records.
- `CheckinResponse`: question, answer, answer_type (text/voice/photo), original_language, translated_answer
- `WoundAnalysis`: description, risk_level (normal/mild_concern/infection_risk), confidence float
- `AIAssessment`: risk_level (green/yellow/red/critical), risk_score (0-100), reasoning, recommended_action
- `CheckinCreate`/`CheckinOut`: Full check-in with responses array, symptoms, wound data, AI assessment

### `app/models/alert.py` (36 lines)
**Purpose:** Pydantic models for alert system.
- `AlertCreate`: patient_id, doctor_id, level (1-4), title, description, ai_reasoning, symptoms array
- Alert statuses: `new` → `seen` → `acknowledged` → `resolved`
- Alert levels: 1=mild, 2=serious, 3=high_risk, 4=emergency

### `app/models/conversation.py` (20 lines)
**Purpose:** Pydantic models for conversation threads.
- `Message`: role (ai/patient/doctor), content, content_type (text/voice/image), media_url, language, timestamp
- `ConversationOut`: patient_id, messages array, timestamps

### `app/routes/webhook.py` (397 lines)
**Purpose:** WhatsApp webhook handler — the core message processing pipeline.
- **POST `/api/webhook/whatsapp`**: Main entry point for all incoming WhatsApp messages
- Extracts: From number, Body, MediaUrl0, MediaContentType0, NumMedia from Twilio form data
- **Patient lookup**: Exact phone match → last-10-digit regex fallback
- **Media handling**:
  - Audio/OGG → Downloads via Twilio auth → Deepgram STT transcription
  - Image → Downloads → Gemini Vision wound analysis
- **Special commands**: "call me" (multi-language), "help", "stop", "my report"
- **Doctor handoff mode**: If patient.mode == "doctor", saves message without AI processing, emits socket event
- **AI pipeline**: Language detection → translation to English → `ai_brain.process_message()` → response validation
- **Generic reply rejection**: Filters out "doctor will review" type responses, replaces with active question
- **Database writes**: Conversation update (both messages), check-in insert, patient status update
- **Escalation trigger**: Calls `evaluate_and_escalate()` when AI flags escalation
- **Socket.IO events**: Emits `new_checkin` for all, `new_alert` for red/critical statuses

### `app/routes/voice.py` (525 lines)
**Purpose:** Multi-turn AI voice call agent using Twilio TwiML.
- Implements a 4-turn conversational flow over phone calls
- **Turn 1 (POST `/`)**: Greets patient by name, asks pain level (1-10)
- **Turn 2 (POST `/turn2`)**: Processes pain answer, asks about swelling/fever/bleeding
- **Turn 3 (POST `/turn3`)**: Processes symptoms answer, asks about medicine adherence
- **Turn 4 (POST `/turn4`)**: Processes medicine answer, asks open-ended concerns
- **Complete (POST `/complete`)**: Processes final answer, runs full AI assessment, saves check-in
- **TTS Pipeline**: ElevenLabs multilingual TTS → saves MP3 to audio_cache → serves via `<Play>` TwiML
- **Fallback**: If ElevenLabs fails, uses Twilio `<Say>` with Polly.Aditi voice
- **Language support**: Hardcoded responses in English, Hindi, Telugu
- **ngrok detection**: Auto-detects ngrok tunnel URL for webhook callbacks
- In-memory `_call_data` dict stores call state keyed by CallSid
- **Status callback (POST `/status`)**: Cleans up call data on completion/failure

### `app/routes/doctors.py` (76 lines)
**Purpose:** Doctor authentication with JWT.
- **POST `/api/auth/register`**: Bcrypt password hashing, JWT token generation
- **POST `/api/auth/login`**: Email/password verification, token issuance
- **GET `/api/auth/me`**: Returns current doctor profile (password stripped)
- `get_current_doctor()`: FastAPI dependency — extracts JWT from Bearer header, validates, returns doctor doc
- JWT config: HS256 algorithm, 72-hour expiration

### `app/routes/patients.py` (254 lines)
**Purpose:** Full patient CRUD + communication endpoints.
- **GET `/api/patients`**: List with optional status/search filters, sorted by created_at desc
- **POST `/api/patients`**: Create patient + conversation record + send WhatsApp welcome + schedule check-ins
- **GET `/api/patients/{id}`**: Full patient detail with last 20 check-ins + conversation history
- **PUT `/api/patients/{id}`**: Partial update with exclude_unset
- **DELETE `/api/patients/{id}`**: Soft delete (sets is_active=false)
- **POST `/api/patients/{id}/message`**: Doctor sends WhatsApp message to patient
- **POST `/api/patients/{id}/call`**: Initiates AI voice callback via Twilio
- **POST `/api/patients/{id}/handoff`**: Toggle between "ai" and "doctor" conversation modes
- **POST `/api/patients/{id}/reply`**: Doctor sends reply (prefixed with "Dr. {name}:"), emits socket event

### `app/routes/checkins.py` (28 lines)
**Purpose:** Check-in data retrieval.
- **GET `/api/checkins/{patient_id}`**: All check-ins for a patient, sorted by created_at desc
- **GET `/api/checkins/{checkin_id}/detail`**: Single check-in by ID

### `app/routes/alerts.py` (79 lines)
**Purpose:** Alert management with enrichment.
- **GET `/api/alerts`**: List alerts with optional status/level filters, enriched with patient_name
- **GET `/api/alerts/active`**: Only non-resolved alerts (new/seen/acknowledged)
- **GET `/api/alerts/stats`**: Aggregation pipeline — alert count grouped by status
- **PUT `/api/alerts/{id}`**: Update alert status, auto-sets resolved_at timestamp

### `app/routes/analytics.py` (99 lines)
**Purpose:** Dashboard analytics with MongoDB aggregation pipelines.
- **GET `/api/analytics/overview`**: Total patients, active alerts, avg recovery score, check-ins today, status distribution
- **GET `/api/analytics/recovery-trends`**: Avg risk score grouped by surgery type
- **GET `/api/analytics/complications`**: Top 10 symptoms from $unwind + $group pipeline
- **GET `/api/analytics/response-rates`**: Check-in counts grouped by type (scheduled/patient_initiated/callback)

### `app/services/ai_brain.py` (326 lines)
**Purpose:** Core AI processing engine — the "brain" of Heal Hub.
- **System Prompt Template**: Injects patient name, surgery details, days since surgery, language, symptoms history, pain trend, medicines, previous check-in summary
- **`_get_patient_context()`**: Builds context from patient doc + last 5 check-ins
- **`_parse_ai_response()`**: Robust JSON parser — strips markdown code blocks, finds JSON object boundaries, falls back to raw text
- **`process_message()`**: Primary orchestrator:
  1. Claude Haiku (PRIMARY) — chosen for speed and cost efficiency
  2. Gemini 2.0 Flash (FALLBACK) — for when Claude quota/API issues
  3. Safe generic response (LAST RESORT) — asks patient for more info
- **`_call_claude()`**: Uses Anthropic SDK, model `claude-3-haiku-20240307`, max_tokens=1000, runs sync client in asyncio thread
- **`_call_gemini()`**: Uses Google GenerativeAI SDK, model `gemini-2.0-flash`, temperature=0.3, 20s timeout with asyncio.wait_for
- **`generate_checkin_questions()`**: Day-specific question templates for days 1,3,5,7,14,21,30 — maps to closest day

### `app/services/escalation.py` (133 lines)
**Purpose:** Multi-tier escalation engine.
- **`evaluate_and_escalate()`**: Evaluates check-in data and triggers tiered response:
  - **Level 1 (Yellow)**: Creates alert in database
  - **Level 2 (Red)**: Creates alert + notifies doctor via SMS + notifies family via WhatsApp
  - **Level 3 (Critical)**: Creates alert + initiates emergency voice callback + Socket.IO real-time alert
- **`_create_alert()`**: Inserts alert document with patient_id, doctor_id, level, title, description, AI reasoning, symptoms

### `app/services/notification.py` (50 lines)
**Purpose:** Multi-channel notification delivery.
- **`notify_doctor()`**: Socket.IO emit + Twilio SMS to doctor's phone
- **`notify_family()`**: Iterates all family_contacts, sends personalized WhatsApp to each

### `app/services/scheduler.py` (103 lines)
**Purpose:** Automated check-in scheduling with APScheduler.
- Uses `AsyncIOScheduler` with `DateTrigger` for one-time scheduled jobs
- **`schedule_patient_checkins()`**: For each day in schedule, creates:
  - Check-in job at surgery_date + day + 10:00 AM
  - Reminder job at check-in + 4 hours (if no response)
- **`send_scheduled_checkin()`**: Generates day-specific questions via AI Brain, formats message, sends via WhatsApp
- **`send_reminder()`**: Checks if patient responded today, sends multilingual reminder if not

### `app/services/speech.py` (102 lines)
**Purpose:** Speech-to-text and text-to-speech services.
- **`speech_to_text()`**: Deepgram Nova-2 model, supports en-IN/hi/te languages, runs sync SDK in thread
- **`text_to_speech()`**: ElevenLabs `eleven_multilingual_v2` model, handles both bytes and generator responses

### `app/services/symptom_analyzer.py` (95 lines)
**Purpose:** Clinical symptom trend analysis.
- **DANGER_SYMPTOMS**: bleeding, blood, fever, infection, pus, discharge
- **CONCERN_SYMPTOMS**: swelling, redness, warmth, pain, nausea, vomiting
- **`analyze_trends()`**: Checks for escalating pain (3+ consecutive increases), danger symptoms, post-day-3 fever, consecutive no-responses
- **`get_recovery_score()`**: 0-100 score calculation:
  - Base: 70
  - Status modifier: green(+20), yellow(0), red(-20), critical(-40)
  - Pain penalty: -(pain-3)*3 for pain > 3
  - Symptom penalty: -5 per symptom
  - Day bonus: +10 if day > 14 and green status

### `app/services/translator.py` (34 lines)
**Purpose:** Language detection and translation.
- **`detect_language()`**: Uses `langdetect` library, maps Marathi/Nepali → Hindi
- **`translate()`**: Uses `deep-translator` GoogleTranslator, supports en/hi/te
- Graceful fallback to original text on any error

### `app/services/voice_call.py` (62 lines)
**Purpose:** Twilio voice call initiation.
- **`_get_public_url()`**: Queries ngrok local API for HTTPS tunnel URL, falls back to APP_URL
- **`initiate_callback()`**: Creates Twilio voice call with TwiML URL pointing to voice webhook, includes status callback

### `app/services/whatsapp.py` (118 lines)
**Purpose:** WhatsApp messaging via Twilio.
- **`send_message()`**: Text message via Twilio WhatsApp sandbox
- **`send_media()`**: Media message with caption
- **`download_media()`**: Downloads Twilio media with auth credentials
- **`send_welcome_message()`**: Multilingual onboarding message (en/hi/te) explaining all features
- **`format_checkin_message()`**: Formats day-specific questions into bulleted message

### `app/services/wound_analyzer.py` (88 lines)
**Purpose:** Wound photo analysis using Gemini Vision.
- Uses `gemini-2.0-flash` with PIL Image processing
- Structured prompt requesting: appearance, redness, discharge, healing stage, risk level, confidence
- Temperature 0.1 for conservative medical analysis
- Returns structured JSON: description, appearance, redness, discharge, healing_stage, risk_level, confidence, recommendation

### `app/utils/helpers.py` (36 lines)
**Purpose:** Shared utility functions.
- **`utc_now()`**: Timezone-aware UTC datetime
- **`objectid_to_str()`**: Recursively converts MongoDB ObjectId fields to strings (handles nested dicts and lists)
- **`days_since()`**: Calculates days elapsed since a given date

### `seed_data.py` (599 lines)
**Purpose:** Comprehensive demo data seeder.
- Creates 2 doctors, 8 patients (with varied statuses: green/yellow/red/critical)
- Generates realistic check-in histories with pain scores, symptoms, AI assessments
- Creates 4 alerts across severity levels
- Builds 4 conversation threads in multiple languages (English, Hindi, Telugu)
- Login credentials: `priya@healhub.com` / `doctor123`

### `start_ngrok.py` (73 lines)
**Purpose:** ngrok tunnel launcher with setup instructions.
- Uses `pyngrok` to create HTTPS tunnel on port 8000
- Prints Twilio sandbox configuration instructions

---

## 3. AI Pipeline Analysis

### Complete Flow: Message → Response

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌───────────────┐
│  WhatsApp   │───▶│  Language    │───▶│  Translate   │───▶│   AI Brain    │
│  Message    │    │  Detection   │    │  to English  │    │   Process     │
│  Received   │    │  (langdetect)│    │(GoogleTrans) │    │               │
└─────────────┘    └──────────────┘    └─────────────┘    └───────┬───────┘
                                                                   │
                                                                   ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌───────────────┐
│  Send via   │◀───│  Translate   │◀───│  Validate   │◀───│  Parse JSON   │
│  WhatsApp   │    │  to Patient  │    │  Response    │    │  Response     │
│             │    │  Language    │    │  (no generic)│    │               │
└─────────────┘    └──────────────┘    └─────────────┘    └───────────────┘
```

### Claude vs Gemini: Primary/Fallback Logic

| Aspect | Claude (PRIMARY) | Gemini (FALLBACK) |
|--------|-----------------|-------------------|
| Model | `claude-3-haiku-20240307` | `gemini-2.0-flash` |
| SDK | `anthropic` (sync in thread) | `google-generativeai` (sync in thread) |
| Max Tokens | 1000 | 1000 |
| Temperature | Default (not set) | 0.3 |
| Timeout | None (thread-level) | 20s (`asyncio.wait_for`) |
| System Prompt | Passed as `system` parameter | Concatenated with user message |
| Why Primary | Reliable JSON output, better medical reasoning | Free tier quota exhaustion issues |

### System Prompt Template

The AI receives a rich context injection with every message:

```
Patient Info:
- Name: {name}
- Surgery: {surgery_type} on {surgery_date} ({days_since} days ago)
- Language: {language}
- Current Status: {status}
- Known symptoms: {symptoms}
- Pain trend: {pain_scores}
- Medicines: {medicines}

Previous check-in summary:
{Day X: Risk=Y, Pain=Z, Symptoms=[...]}
```

The AI is instructed to respond in **strict JSON format**:
```json
{
  "reply_to_patient": "string (in patient's language)",
  "detected_symptoms": ["array of symptoms"],
  "pain_score": null,
  "medicine_taken": null,
  "risk_level": "green|yellow|red|critical",
  "risk_score": 0-100,
  "reasoning": "string (English, explains WHY this risk level)",
  "recommended_action": "string (what should happen next)",
  "escalation_needed": false,
  "escalation_level": 0-3,
  "next_question": null
}
```

### Symptom Analysis

Two-tier symptom classification:

| Tier | Symptoms | Action |
|------|----------|--------|
| **DANGER** | bleeding, blood, fever, infection, pus, discharge | Immediate escalation |
| **CONCERN** | swelling, redness, warmth, pain, nausea, vomiting | Increased monitoring |

**Trend Detection:**
- Escalating pain: 3+ consecutive increases → flag "worsening"
- Post-day-3 fever: Possible surgical site infection
- No response for 2+ check-ins: Non-responder alert

### Risk Scoring Algorithm

```
Recovery Score = Base(70)
  + Status modifier (green=+20, yellow=0, red=-20, critical=-40)
  - Pain penalty (max(0, (pain-3) * 3))
  - Symptom count * 5
  + Day bonus (+10 if day > 14 and green)

Clamped to [0, 100]
```

### Escalation Decision Matrix

| Risk Level | Escalation Level | Actions Triggered |
|-----------|-----------------|-------------------|
| Green | 0 | None — normal recovery |
| Yellow | 1 | Create Level 1 alert (mild concern) |
| Red | 2 | Level 2 alert + SMS to doctor + WhatsApp to family |
| Critical | 3 | Level 3 alert + Emergency voice callback + Real-time socket notification |

---

## 4. API Documentation

### Authentication Endpoints

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| POST | `/api/auth/register` | Public | `{name, email, password, phone?, specialization?, hospital?}` | `{token, doctor: {id, name, email}}` |
| POST | `/api/auth/login` | Public | `{email, password}` | `{token, doctor: {id, name, email, ...}}` |
| GET | `/api/auth/me` | Bearer JWT | — | `{_id, name, email, phone, specialization, hospital}` |

### Patient Endpoints

| Method | Path | Auth | Request/Params | Response |
|--------|------|------|---------------|----------|
| GET | `/api/patients` | Bearer JWT | `?status=green&search=name` | `[{id, name, phone, current_status, risk_score, days_since_surgery, ...}]` |
| POST | `/api/patients` | Bearer JWT | `{name, phone, age, gender, language_preference, surgery_type, surgery_date, hospital?, medicines[], family_contacts[], checkin_schedule?}` | `{id, ...patient}` |
| GET | `/api/patients/{id}` | Bearer JWT | — | `{...patient, checkins[], conversations[]}` |
| PUT | `/api/patients/{id}` | Bearer JWT | Partial patient fields | `{...updated_patient}` |
| DELETE | `/api/patients/{id}` | Bearer JWT | — | `{message: "Patient deactivated"}` |
| POST | `/api/patients/{id}/message` | Bearer JWT | `{message: "text"}` | `{message: "Message sent"}` |
| POST | `/api/patients/{id}/call` | Bearer JWT | — | `{message: "Call initiated"}` |
| POST | `/api/patients/{id}/handoff` | Bearer JWT | `{mode: "ai"|"doctor"}` | `{message, mode}` |
| POST | `/api/patients/{id}/reply` | Bearer JWT | `{message: "text"}` | `{message: "Reply sent"}` |

### Check-in Endpoints

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/api/checkins/{patient_id}` | Bearer JWT | `[{id, day_number, pain_score, symptoms_detected, ai_assessment, ...}]` |
| GET | `/api/checkins/{checkin_id}/detail` | Bearer JWT | `{...full_checkin}` |

### Alert Endpoints

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/api/alerts` | Bearer JWT | `[{id, patient_name, level, title, description, ai_reasoning, symptoms, status, ...}]` |
| GET | `/api/alerts/active` | Bearer JWT | `[...non-resolved alerts]` |
| GET | `/api/alerts/stats` | Bearer JWT | `{new: N, seen: N, acknowledged: N, resolved: N}` |
| PUT | `/api/alerts/{id}` | Bearer JWT | `{...updated_alert}` |

### Analytics Endpoints

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/api/analytics/overview` | Bearer JWT | `{total_patients, active_alerts, avg_recovery_score, checkins_today, status_distribution}` |
| GET | `/api/analytics/recovery-trends` | Bearer JWT | `[{surgery_type, avg_recovery_score, patient_count}]` |
| GET | `/api/analytics/complications` | Bearer JWT | `[{symptom, count}]` (top 10) |
| GET | `/api/analytics/response-rates` | Bearer JWT | `{scheduled: N, patient_initiated: N, callback: N}` |

### Webhook Endpoints (Twilio — Public)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/webhook/whatsapp` | Public (Twilio) | Incoming WhatsApp messages |
| POST | `/api/webhook/voice` | Public (Twilio) | Voice call Turn 1 — greeting + pain question |
| POST | `/api/webhook/voice/turn2` | Public (Twilio) | Voice call Turn 2 — symptoms question |
| POST | `/api/webhook/voice/turn3` | Public (Twilio) | Voice call Turn 3 — medicine question |
| POST | `/api/webhook/voice/turn4` | Public (Twilio) | Voice call Turn 4 — open-ended concerns |
| POST | `/api/webhook/voice/complete` | Public (Twilio) | Voice call completion + AI assessment |
| POST | `/api/webhook/voice/status` | Public (Twilio) | Call status callback |

### Utility Endpoints

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/` | Public | `{message: "Heal Hub API is running", status: "ok"}` |
| GET | `/health` | Public | `{status: "healthy"|"degraded", database: "connected"|"disconnected"}` |
| GET | `/api/audio/{filename}` | Public | Static MP3 file (ElevenLabs TTS cache) |

**Total: 27 endpoints** (20 REST + 7 Twilio webhooks)

---

## 5. Database Schema

### MongoDB Database: `healhub`

#### Collection: `doctors`

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `name` | String | Full name |
| `email` | String | Login email (unique) |
| `password` | String | Bcrypt hashed |
| `phone` | String | Doctor's phone for SMS alerts |
| `specialization` | String | e.g., "Orthopedic Surgery" |
| `hospital` | String | Hospital name |
| `created_at` | DateTime | Registration timestamp |

#### Collection: `patients`

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `name` | String | Patient full name |
| `phone` | String | WhatsApp number (with +country code) |
| `age` | Integer | Patient age |
| `gender` | String | male/female/other |
| `language_preference` | String | en/hi/te |
| `surgery_type` | String | e.g., "Knee Replacement" |
| `surgery_date` | DateTime | Date of surgery |
| `hospital` | String | Hospital name |
| `doctor_id` | String | Reference to doctors._id |
| `family_contacts` | Array[Object] | `[{name, phone, relation}]` |
| `checkin_schedule` | Object | `{days: [1,3,5,...], time: "10:00"}` |
| `medicines` | Array[Object] | `[{name, dosage, frequency, taken_count, total_count}]` |
| `current_status` | String | green/yellow/red/critical |
| `risk_score` | Integer | 0-100 (higher = more risk) |
| `mode` | String | "ai" or "doctor" (conversation handler) |
| `is_active` | Boolean | Soft delete flag |
| `created_at` | DateTime | Registration timestamp |
| `updated_at` | DateTime | Last modification |

#### Collection: `checkins`

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `patient_id` | String | Reference to patients._id |
| `day_number` | Integer | Days since surgery |
| `type` | String | scheduled/patient_initiated/callback |
| `questions_asked` | Array[String] | Questions sent to patient |
| `responses` | Array[Object] | `[{question, answer, answer_type, original_language, translated_answer, timestamp}]` |
| `pain_score` | Integer/null | 1-10 scale |
| `symptoms_detected` | Array[String] | AI-detected symptoms |
| `wound_photo_url` | String/null | Twilio media URL |
| `wound_analysis` | Object/null | `{description, risk_level, confidence}` |
| `medicine_taken` | Boolean/null | AI-determined adherence |
| `ai_assessment` | Object | `{risk_level, risk_score, reasoning, recommended_action}` |
| `escalation_triggered` | Boolean | Whether escalation ran |
| `escalation_level` | Integer/null | 0-3 |
| `created_at` | DateTime | Check-in timestamp |

#### Collection: `alerts`

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `patient_id` | String | Reference to patients._id |
| `doctor_id` | String | Reference to doctors._id |
| `checkin_id` | String | Reference to checkins._id |
| `level` | Integer | 1=mild, 2=serious, 3=critical |
| `title` | String | Alert headline |
| `description` | String | Alert details |
| `ai_reasoning` | String | AI's explanation |
| `symptoms` | Array[String] | Triggering symptoms |
| `status` | String | new/seen/acknowledged/resolved |
| `resolved_at` | DateTime/null | When resolved |
| `created_at` | DateTime | Alert creation |

#### Collection: `conversations`

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `patient_id` | String | Reference to patients._id (one per patient) |
| `messages` | Array[Object] | `[{role, content, content_type, media_url?, language, timestamp}]` |
| `created_at` | DateTime | Thread creation |
| `updated_at` | DateTime | Last message time |

### Data Flow Between Collections

```
doctors ─── 1:N ──→ patients ─── 1:N ──→ checkins
                         │                    │
                         │                    └── alerts (via escalation)
                         │
                         └── 1:1 ──→ conversations (message thread)
```

---

## 6. Frontend Analysis

### Page Structure and Routing

| Route | File | Purpose |
|-------|------|---------|
| `/login` | `app/login/page.tsx` | Authentication page with role selection |
| `/` | `app/page.tsx` | Main dashboard — stats, patient list, activity feed |
| `/patients` | `app/patients/page.tsx` | Full patient table with filters, sort, pagination |
| `/patients/[id]` | `app/patients/[id]/page.tsx` | Patient detail — 7-tab interface (Overview, Chat, Check-ins, Photos, Medicines, Appointments, Reports) |
| `/alerts` | `app/alerts/page.tsx` | Alert management with acknowledge/resolve actions |
| `/analytics` | `app/analytics/page.tsx` | Charts — recovery by surgery, distribution pie, symptom bar, recovery summary |
| `/appointments` | `app/appointments/page.tsx` | Appointment scheduling (mock data, frontend-only) |
| `/nurses` | `app/nurses/page.tsx` | Nurse management (mock data, frontend-only) |
| `/settings` | `app/settings/page.tsx` | Profile, check-in schedule, escalation rules, notifications, theme |

### State Management Approach

- **No global state library** — uses React hooks (`useState`, `useEffect`, `useCallback`)
- **Auth state**: `localStorage` for JWT token + role, validated on each page via `AppShell`
- **Data fetching**: Axios API client with JWT interceptor, parallel `Promise.all()` for initial loads
- **Real-time updates**: Socket.IO events trigger `fetchData()` refetches (optimistic full refresh)
- **Custom hooks**:
  - `useAuth()` — Authentication state management with login/logout/checkAuth
  - `useCounter()` — Animated number counter with ease-out cubic easing

### Socket.IO Event Handling

```typescript
// AppShell.tsx — Global event listeners
socket.on("new_alert", (data) => {
  setAlerts(prev => [data, ...prev]);       // Prepend new alert
  toast.error(`Alert: ${data.title}`);       // Show toast notification
});

// Dashboard page.tsx — Data refresh on events
socket.on("new_checkin", () => fetchData());  // Refetch all dashboard data
socket.on("new_alert", () => fetchData());    // Refetch all dashboard data

// Patient detail [id]/page.tsx — Targeted refresh
socket.on("new_message", (data) => {
  if (data.patient_id === id) fetchData();    // Only refresh if relevant
});
```

### Component Hierarchy

```
RootLayout
├── ThemeProvider (next-themes)
│   ├── TooltipProvider (Radix)
│   └── Toaster (Sonner)
│
├── LoginPage (unauthenticated route)
│
└── AppShell (authenticated wrapper)
    ├── Sidebar (desktop + mobile bottom nav)
    │   ├── NavLink items with badges
    │   ├── Theme toggle
    │   └── User card + logout
    │
    ├── Header
    │   ├── Page title + greeting
    │   ├── Animated search input
    │   ├── Notification dropdown (real-time alerts)
    │   └── Avatar dropdown
    │
    └── Page Content
        ├── DashboardPage
        │   ├── StatsOverview (4 animated stat cards)
        │   ├── PatientListItem (scrollable list)
        │   ├── RecentActivity (activity feed)
        │   ├── AlertBanner (critical alert banner)
        │   └── AddPatientDialog
        │
        ├── PatientsPage
        │   ├── Search + filters (status, surgery type, sort)
        │   ├── Table (desktop) / Cards (mobile)
        │   ├── Pagination
        │   └── Delete confirmation dialog
        │
        ├── PatientDetailPage
        │   ├── Patient header card (status, actions)
        │   └── 7 Tabs:
        │       ├── Overview (recovery ring, pain chart, symptom bars, medicine adherence, AI assessment)
        │       ├── Conversations (chat bubbles, doctor handoff toggle, reply input)
        │       ├── Check-ins (timeline view with status dots)
        │       ├── Photos (wound photo grid)
        │       ├── Medicines (adherence cards)
        │       ├── Appointments (placeholder)
        │       └── Reports (AI-generated summary)
        │
        ├── AlertsPage (filter tabs, expandable AI reasoning, action buttons)
        ├── AnalyticsPage (4 charts: bar, pie, horizontal bar, progress bars)
        ├── AppointmentsPage (scheduling interface)
        ├── NursesPage (table with CRUD)
        └── SettingsPage (5 sections: profile, schedule, escalation, notifications, appearance)
```

### UI Component Library

Uses **shadcn/ui** (Radix UI primitives + Tailwind CSS):
- 18 UI components: alert, avatar, badge, button, card, command, dialog, dropdown-menu, input, label, popover, scroll-area, select, separator, sheet, sonner, switch, table, tabs, textarea, tooltip
- Custom shared components: PageWrapper (page transitions), Skeleton (loading states)

### Design System

- **Font**: Plus Jakarta Sans (Google Fonts)
- **Theme**: Light/Dark mode via next-themes with CSS variables
- **Animations**: Framer Motion for page transitions, staggered lists, hover effects
- **Charts**: Recharts (AreaChart, BarChart, PieChart, LineChart)
- **Toasts**: Sonner with rich colors and close button
- **Responsive**: Mobile-first with Tailwind breakpoints, bottom nav on mobile

---

## 7. External Service Integration

### Twilio (WhatsApp + Voice)

**WhatsApp Flow:**
```
Patient → WhatsApp → Twilio Sandbox → POST /api/webhook/whatsapp
                                              │
Backend processes → Twilio REST API → WhatsApp → Patient
```

- **Inbound**: Twilio sends form-encoded POST with `From`, `Body`, `MediaUrl0`, `MediaContentType0`, `NumMedia`
- **Outbound**: `client.messages.create()` with `from_=whatsapp:+14155238886` (sandbox number)
- **Media Download**: `httpx.get(media_url, auth=(SID, TOKEN))` with redirect following
- **SDK**: `twilio==9.0.0`

**Voice Call Flow:**
```
Backend → Twilio REST API → calls.create(url=webhook) → Patient Phone
                                                              │
Patient picks up ← TwiML <Say>/<Play> ← POST /api/webhook/voice
                         │
                    4-turn conversation via TwiML <Gather>/<Record>
                         │
                    POST /api/webhook/voice/complete → AI Assessment
```

- Uses TwiML (XML) responses for call flow control
- `<Gather input="speech">` for speech recognition
- `<Play>` for ElevenLabs TTS audio, `<Say voice="Polly.Aditi">` as fallback
- Status callbacks for call completion tracking

### Google Gemini

| Aspect | Detail |
|--------|--------|
| **SDK** | `google-generativeai==0.8.0` |
| **Model (Text)** | `gemini-2.0-flash` |
| **Model (Vision)** | `gemini-2.0-flash` (multimodal) |
| **Text Config** | temperature=0.3, max_tokens=1000, timeout=15s (request) + 20s (asyncio) |
| **Vision Config** | temperature=0.1, max_tokens=500 |
| **Text Use** | Fallback AI brain for patient message processing |
| **Vision Use** | Wound photo analysis — accepts PIL.Image + text prompt |
| **Image Input** | PIL.Image.open(io.BytesIO(image_bytes)) passed as content array |

### Anthropic Claude

| Aspect | Detail |
|--------|--------|
| **SDK** | `anthropic==0.34.0` |
| **Model** | `claude-3-haiku-20240307` |
| **Config** | max_tokens=1000, system prompt as separate parameter |
| **Use** | Primary AI brain — better JSON adherence, medical reasoning |
| **Execution** | Sync client wrapped in `asyncio.to_thread()` |

### Deepgram (Speech-to-Text)

| Aspect | Detail |
|--------|--------|
| **SDK** | `deepgram-sdk==3.5.0` |
| **Model** | `nova-2` |
| **Languages** | en-IN (English-India), hi (Hindi), te (Telugu) |
| **Input** | Raw audio bytes (OGG format from WhatsApp voice notes) |
| **Config** | `smart_format=True` for punctuation and formatting |
| **Execution** | Sync `transcribe_file()` in `asyncio.to_thread()` |
| **Output** | Transcript string + confidence score |

### ElevenLabs (Text-to-Speech)

| Aspect | Detail |
|--------|--------|
| **SDK** | `elevenlabs==1.5.0` |
| **Model** | `eleven_multilingual_v2` (supports Hindi, Telugu) |
| **Voice** | Configurable via `ELEVENLABS_VOICE_ID`, default: `21m00Tcm4TlvDq8ikWAM` (Rachel) |
| **Output** | MP3 audio bytes |
| **Caching** | MD5-hashed filenames in `audio_cache/` directory, served as static files |
| **Use** | Voice call TTS — generates natural speech for Twilio `<Play>` |

### Language Services

| Service | Library | Purpose |
|---------|---------|---------|
| Language Detection | `langdetect==1.0.9` | Detects en/hi/te from patient messages |
| Translation | `deep-translator==1.11.4` (GoogleTranslator) | Translates between en↔hi↔te |

---

## 8. Lines of Code Count

### Backend (Python)

| File | Lines |
|------|-------|
| `seed_data.py` | 599 |
| `routes/voice.py` | 525 |
| `routes/webhook.py` | 397 |
| `services/ai_brain.py` | 326 |
| `routes/patients.py` | 254 |
| `services/escalation.py` | 133 |
| `services/whatsapp.py` | 118 |
| `services/scheduler.py` | 103 |
| `services/speech.py` | 102 |
| `routes/analytics.py` | 99 |
| `services/symptom_analyzer.py` | 95 |
| `main.py` | 93 |
| `services/wound_analyzer.py` | 88 |
| `routes/alerts.py` | 79 |
| `routes/doctors.py` | 76 |
| `models/patient.py` | 75 |
| `start_ngrok.py` | 73 |
| `services/voice_call.py` | 62 |
| `models/checkin.py` | 59 |
| `services/notification.py` | 50 |
| `config.py` | 43 |
| `models/doctor.py` | 40 |
| `utils/helpers.py` | 36 |
| `models/alert.py` | 36 |
| `services/translator.py` | 34 |
| `routes/checkins.py` | 28 |
| `database.py` | 22 |
| `models/conversation.py` | 20 |
| **Backend Total** | **3,665 lines** |

### Frontend (TypeScript/TSX/CSS)

| File | Lines |
|------|-------|
| `app/patients/[id]/page.tsx` | 751 |
| `app/patients/page.tsx` | 346 |
| `app/settings/page.tsx` | 329 |
| `app/appointments/page.tsx` | 285 |
| `app/analytics/page.tsx` | 275 |
| `components/layout/Sidebar.tsx` | 270 |
| `app/alerts/page.tsx` | 266 |
| `components/dashboard/AddPatientDialog.tsx` | 248 |
| `app/globals.css` | 236 |
| `app/nurses/page.tsx` | 226 |
| `components/layout/Header.tsx` | 196 |
| `app/page.tsx` (Dashboard) | 191 |
| `app/login/page.tsx` | 168 |
| `types/index.ts` | 127 |
| `components/dashboard/StatsOverview.tsx` | 106 |
| `components/layout/AppShell.tsx` | 103 |
| `lib/api.ts` | 78 |
| `components/shared/Skeleton.tsx` | 65 |
| `hooks/use-auth.ts` | 61 |
| `components/dashboard/RecentActivity.tsx` | 54 |
| `components/dashboard/PatientCard.tsx` | 52 |
| `components/dashboard/AlertBanner.tsx` | 48 |
| `components/shared/PageWrapper.tsx` | 34 |
| `hooks/use-counter.ts` | 27 |
| `lib/socket.ts` | 17 |
| `components/ThemeProvider.tsx` | 16 |
| `lib/utils.ts` | 6 |
| + 18 shadcn/ui components | ~1,600 |
| **Frontend Total** | **6,504 lines** |

### Summary

| Category | Files | Lines of Code |
|----------|-------|---------------|
| Backend (Python) | 33 | 3,665 |
| Frontend (TS/TSX/CSS) | 49 | 6,504 |
| Config (Docker, JSON, etc.) | 6 | ~130 |
| **Grand Total** | **88** | **~10,299** |

---

## 9. Tech Stack Summary

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Backend Framework** | FastAPI | 0.115.0 | Async Python web framework with auto OpenAPI docs |
| **ASGI Server** | Uvicorn | 0.30.0 | Lightning-fast ASGI server |
| **Database** | MongoDB | 7.x | Document database for flexible patient data |
| **DB Driver** | Motor | 3.3.2 | Async MongoDB driver for Python |
| **Validation** | Pydantic | 2.9.0 | Data validation and serialization |
| **Real-time** | python-socketio | 5.11.0 | WebSocket communication for live updates |
| **Auth** | python-jose + passlib | 3.3.0 / 1.7.4 | JWT tokens + bcrypt password hashing |
| **AI (Primary)** | Anthropic Claude | 0.34.0 (SDK) | Claude 3 Haiku — primary AI brain |
| **AI (Fallback)** | Google Gemini | 0.8.0 (SDK) | Gemini 2.0 Flash — fallback AI + vision |
| **WhatsApp** | Twilio | 9.0.0 | WhatsApp Business API via sandbox |
| **Voice Calls** | Twilio Voice | 9.0.0 | Programmable voice with TwiML |
| **STT** | Deepgram | 3.5.0 (SDK) | Nova-2 speech-to-text (en/hi/te) |
| **TTS** | ElevenLabs | 1.5.0 (SDK) | Multilingual v2 text-to-speech |
| **Translation** | deep-translator | 1.11.4 | Google Translate wrapper (en↔hi↔te) |
| **Language Detection** | langdetect | 1.0.9 | Automatic language identification |
| **Image Processing** | Pillow | 10.4.0 | Wound photo preprocessing for Gemini Vision |
| **Scheduler** | APScheduler | 3.10.4 | Automated check-in scheduling |
| **HTTP Client** | httpx | 0.27.0 | Async HTTP client for media downloads |
| **Tunneling** | pyngrok | 7.1.6 | ngrok tunnel for local Twilio webhooks |
| **Frontend Framework** | Next.js | 16.1.6 | React meta-framework with App Router |
| **UI Library** | React | 19.2.3 | Component-based UI library |
| **UI Components** | shadcn/ui + Radix | 1.4.3 | 18 accessible, customizable components |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS framework |
| **Animations** | Framer Motion | 12.34.3 | Production-ready motion library |
| **Charts** | Recharts | 3.7.0 | Composable charting for React |
| **HTTP Client** | Axios | 1.13.5 | Promise-based HTTP client with interceptors |
| **Real-time (Client)** | socket.io-client | 4.8.3 | WebSocket client for live updates |
| **Theming** | next-themes | 0.4.6 | Dark/light mode with system preference |
| **Notifications** | Sonner | 2.0.7 | Toast notification system |
| **Date Utils** | date-fns | 4.1.0 | Date formatting and manipulation |
| **Containerization** | Docker + Compose | 3.8 | Multi-service container orchestration |
| **TypeScript** | TypeScript | 5.x | Type-safe frontend development |

### Languages Used

| Language | Purpose | LOC |
|----------|---------|-----|
| Python 3.11 | Backend API, AI pipeline, services | 3,665 |
| TypeScript/TSX | Frontend UI, components, hooks | 6,268 |
| CSS | Tailwind utilities, custom animations | 236 |
| TwiML (XML) | Voice call flow control | ~50 (inline) |
| JSON | Config, package definitions | ~130 |

---

*Generated for hackathon evaluation. Every file, every function, every data flow documented.*
