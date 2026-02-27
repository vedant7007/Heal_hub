# HEAL HUB — Product Requirements Document (PRD)
# Autonomous Patient Follow-up AI Agent
## HackWithAI 2026 | Problem Statement #23

---

## PROJECT OVERVIEW

**Product Name:** Heal Hub
**Tagline:** "Your AI Nurse That Never Sleeps"
**What it is:** An autonomous AI-powered patient follow-up system with two interfaces:
1. A WhatsApp AI agent for patients (and their families)
2. A beautiful web dashboard for doctors

**Problem:** After surgery, 50% of patients don't follow recovery instructions. Hospitals can't manually call every patient. Complications go undetected. Patients get readmitted. Lives are lost.

**Solution:** An AI agent that proactively follows up with patients via WhatsApp — asks about recovery, understands voice/text in Telugu/Hindi/English, analyzes wound photos, tracks symptoms over time, and alerts doctors the moment something goes wrong.

---

## TECH STACK (MANDATORY — use exactly these)

### Backend
- **Runtime:** Python 3.10+
- **Framework:** FastAPI (with uvicorn)
- **Database:** MongoDB (use MongoDB Atlas free tier or local)
- **ODM:** motor (async MongoDB driver) + pydantic for schemas
- **Task Queue:** APScheduler (for scheduled check-ins)
- **Real-time:** Socket.io (python-socketio) for dashboard live updates
- **Environment:** python-dotenv for .env configuration

### AI Services
- **Primary LLM:** Google Gemini Flash 2.0 (via google-generativeai SDK)
  - Used for: chat responses, symptom analysis, reasoning, translation
  - Model ID: `gemini-2.0-flash`
- **Backup LLM:** Claude Haiku 3.5 (via anthropic SDK)
  - Used for: complex medical reasoning when Gemini is uncertain
  - Model ID: `claude-3-5-haiku-20241022`
- **Vision Analysis:** Gemini Flash 2.0 with image input (for wound photo analysis)
- **Speech-to-Text:** Deepgram SDK (`deepgram-sdk`)
  - Used for: converting patient voice notes to text
- **Text-to-Speech:** ElevenLabs SDK (`elevenlabs`)
  - Used for: AI voice calls to patients
  - Voice: Use a warm, caring female voice
- **Translation:** Google Translate API (`googletrans==4.0.0-rc.1` or `deep-translator`)
  - Languages: English, Hindi, Telugu

### WhatsApp Integration
- **Provider:** Twilio WhatsApp Business API (`twilio` SDK)
- **Webhook:** FastAPI endpoint to receive incoming WhatsApp messages
- **Outgoing:** Twilio client to send messages, media, and initiate calls
- **Voice Calls:** Twilio Voice API for AI callback feature

### Frontend (Doctor Dashboard)
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Animations:** Framer Motion
- **Charts:** Recharts
- **Icons:** Lucide React
- **Real-time:** socket.io-client
- **HTTP Client:** axios
- **Date handling:** date-fns
- **State:** React Context + useState (keep it simple)

### Deployment
- **Backend:** Railway or Render (free tier)
- **Frontend:** Vercel
- **Database:** MongoDB Atlas (free tier)
- **Tunnel for dev:** ngrok (for Twilio webhook during development)

---

## PROJECT STRUCTURE

```
heal-hub/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── config.py               # Environment variables and settings
│   │   ├── database.py             # MongoDB connection setup
│   │   │
│   │   ├── models/                 # Pydantic models (data schemas)
│   │   │   ├── __init__.py
│   │   │   ├── patient.py          # Patient schema
│   │   │   ├── doctor.py           # Doctor schema
│   │   │   ├── checkin.py          # Check-in record schema
│   │   │   ├── alert.py            # Alert schema
│   │   │   └── conversation.py     # Conversation history schema
│   │   │
│   │   ├── routes/                 # API route handlers
│   │   │   ├── __init__.py
│   │   │   ├── webhook.py          # Twilio WhatsApp webhook (incoming messages)
│   │   │   ├── patients.py         # CRUD for patients
│   │   │   ├── doctors.py          # Doctor auth and profile
│   │   │   ├── checkins.py         # Check-in data endpoints
│   │   │   ├── alerts.py           # Alert management endpoints
│   │   │   ├── analytics.py        # Analytics and stats endpoints
│   │   │   └── voice.py            # Voice call endpoints (callback feature)
│   │   │
│   │   ├── services/               # Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── ai_brain.py         # Core AI logic (Gemini + Claude Haiku)
│   │   │   ├── symptom_analyzer.py # Symptom pattern detection and scoring
│   │   │   ├── escalation.py       # 4-level escalation engine
│   │   │   ├── scheduler.py        # APScheduler for automated check-ins
│   │   │   ├── whatsapp.py         # Twilio WhatsApp send/receive helpers
│   │   │   ├── voice_call.py       # AI voice call handler (Twilio + ElevenLabs)
│   │   │   ├── wound_analyzer.py   # Wound photo analysis (Gemini Vision)
│   │   │   ├── speech.py           # Speech-to-text (Deepgram) + Text-to-speech (ElevenLabs)
│   │   │   ├── translator.py       # Translation service (multi-language)
│   │   │   └── notification.py     # Send alerts to doctors and family
│   │   │
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── helpers.py          # Common utility functions
│   │
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx          # Root layout with sidebar
│   │   │   ├── page.tsx            # Dashboard home (patient overview)
│   │   │   ├── patients/
│   │   │   │   ├── page.tsx        # Patient list view
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx    # Individual patient detail
│   │   │   ├── alerts/
│   │   │   │   └── page.tsx        # Alerts center
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx        # Analytics dashboard
│   │   │   └── settings/
│   │   │       └── page.tsx        # Settings (check-in schedules, etc.)
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   │   │   ├── Header.tsx          # Top header with alerts bell
│   │   │   │   └── MobileNav.tsx       # Mobile navigation
│   │   │   ├── dashboard/
│   │   │   │   ├── PatientCard.tsx      # Patient card with status color
│   │   │   │   ├── StatsOverview.tsx    # Quick stats (total patients, alerts, etc.)
│   │   │   │   ├── AlertBanner.tsx      # Real-time alert notification
│   │   │   │   └── RecentActivity.tsx   # Recent check-in activity feed
│   │   │   ├── patient/
│   │   │   │   ├── PatientTimeline.tsx  # Recovery timeline visualization
│   │   │   │   ├── SymptomChart.tsx     # Pain/symptom score over time (Recharts)
│   │   │   │   ├── ConversationLog.tsx  # WhatsApp conversation history
│   │   │   │   ├── WoundGallery.tsx     # Wound photos with AI analysis
│   │   │   │   ├── MedicineTracker.tsx  # Medicine adherence display
│   │   │   │   ├── AIReasoning.tsx      # AI explanation panel
│   │   │   │   └── QuickActions.tsx     # Send message, call, schedule buttons
│   │   │   ├── alerts/
│   │   │   │   ├── AlertList.tsx        # List of all alerts
│   │   │   │   └── AlertDetail.tsx      # Individual alert with reasoning
│   │   │   ├── analytics/
│   │   │   │   ├── RecoveryStats.tsx    # Recovery time charts
│   │   │   │   ├── ComplicationRate.tsx # Complication analytics
│   │   │   │   └── PatientVolume.tsx    # Patient volume over time
│   │   │   └── ui/                      # shadcn/ui components
│   │   │       └── (auto-generated by shadcn)
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts              # Axios instance + API functions
│   │   │   ├── socket.ts           # Socket.io client setup
│   │   │   └── utils.ts            # Helper functions
│   │   │
│   │   └── types/
│   │       └── index.ts            # TypeScript type definitions
│   │
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── next.config.js
│
├── .gitignore
├── docker-compose.yml
└── README.md
```

---

## DATABASE SCHEMAS (MongoDB Collections)

### Collection: `patients`
```json
{
  "_id": "ObjectId",
  "name": "string (full name)",
  "phone": "string (with country code, e.g., +919876543210)",
  "age": "number",
  "gender": "string (male/female/other)",
  "language_preference": "string (en/hi/te) — default: en",
  "surgery_type": "string (e.g., 'Knee Replacement', 'Appendectomy', 'Cardiac Bypass')",
  "surgery_date": "datetime",
  "hospital": "string",
  "doctor_id": "ObjectId (ref: doctors)",
  "family_contacts": [
    {
      "name": "string",
      "phone": "string",
      "relation": "string (son/daughter/spouse/parent)"
    }
  ],
  "checkin_schedule": {
    "days": [1, 3, 5, 7, 14, 21, 30],
    "time": "10:00"
  },
  "current_status": "string (green/yellow/red/critical)",
  "risk_score": "number (0-100)",
  "medicines": [
    {
      "name": "string",
      "dosage": "string",
      "frequency": "string (e.g., 'twice daily')",
      "taken_count": "number",
      "total_count": "number"
    }
  ],
  "is_active": "boolean (default: true)",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Collection: `doctors`
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (unique)",
  "password": "string (hashed with bcrypt)",
  "phone": "string",
  "specialization": "string",
  "hospital": "string",
  "created_at": "datetime"
}
```

### Collection: `checkins`
```json
{
  "_id": "ObjectId",
  "patient_id": "ObjectId (ref: patients)",
  "day_number": "number (days since surgery)",
  "type": "string (scheduled/patient_initiated/callback)",
  "questions_asked": ["string array"],
  "responses": [
    {
      "question": "string",
      "answer": "string",
      "answer_type": "string (text/voice/photo)",
      "original_language": "string (en/hi/te)",
      "translated_answer": "string (always in English)",
      "timestamp": "datetime"
    }
  ],
  "pain_score": "number (1-10) or null",
  "symptoms_detected": ["string array (e.g., 'swelling', 'fever', 'bleeding')"],
  "wound_photo_url": "string or null",
  "wound_analysis": {
    "description": "string (AI analysis result)",
    "risk_level": "string (normal/mild_concern/infection_risk)",
    "confidence": "number (0-1)"
  },
  "medicine_taken": "boolean or null",
  "ai_assessment": {
    "risk_level": "string (green/yellow/red/critical)",
    "risk_score": "number (0-100)",
    "reasoning": "string (AI's explanation of why this risk level)",
    "recommended_action": "string"
  },
  "escalation_triggered": "boolean",
  "escalation_level": "number (0-4) or null",
  "created_at": "datetime"
}
```

### Collection: `alerts`
```json
{
  "_id": "ObjectId",
  "patient_id": "ObjectId (ref: patients)",
  "doctor_id": "ObjectId (ref: doctors)",
  "checkin_id": "ObjectId (ref: checkins)",
  "level": "number (1=mild, 2=serious, 3=high_risk, 4=emergency)",
  "title": "string (short alert title)",
  "description": "string (detailed alert description)",
  "ai_reasoning": "string (why the AI flagged this)",
  "symptoms": ["string array"],
  "status": "string (new/seen/acknowledged/resolved)",
  "resolved_at": "datetime or null",
  "created_at": "datetime"
}
```

### Collection: `conversations`
```json
{
  "_id": "ObjectId",
  "patient_id": "ObjectId (ref: patients)",
  "messages": [
    {
      "role": "string (ai/patient)",
      "content": "string",
      "content_type": "string (text/voice/image)",
      "media_url": "string or null",
      "language": "string (en/hi/te)",
      "timestamp": "datetime"
    }
  ],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

## API ENDPOINTS

### Authentication
```
POST /api/auth/register          — Register new doctor
POST /api/auth/login             — Doctor login (returns JWT)
GET  /api/auth/me                — Get current doctor profile
```

### Patients
```
GET    /api/patients             — List all patients for logged-in doctor
POST   /api/patients             — Register new patient (triggers first WhatsApp msg)
GET    /api/patients/:id         — Get patient detail with full history
PUT    /api/patients/:id         — Update patient info
DELETE /api/patients/:id         — Deactivate patient
POST   /api/patients/:id/message — Send custom WhatsApp message to patient
POST   /api/patients/:id/call    — Trigger AI callback to patient
```

### Check-ins
```
GET    /api/checkins/:patient_id — Get all check-ins for a patient
GET    /api/checkins/:id/detail  — Get detailed check-in data
```

### Alerts
```
GET    /api/alerts               — Get all alerts (filterable by status, level)
GET    /api/alerts/active        — Get only active (unresolved) alerts
PUT    /api/alerts/:id           — Update alert status (acknowledge/resolve)
GET    /api/alerts/stats         — Alert statistics
```

### Analytics
```
GET    /api/analytics/overview          — Overall stats (total patients, active, alerts)
GET    /api/analytics/recovery-trends   — Average recovery by surgery type
GET    /api/analytics/complications     — Complication rates
GET    /api/analytics/response-rates    — Patient response rates
```

### Twilio Webhooks
```
POST   /api/webhook/whatsapp     — Incoming WhatsApp message webhook
POST   /api/webhook/voice        — Voice call webhook (TwiML response)
POST   /api/webhook/voice/status — Voice call status callback
```

---

## CORE SERVICE IMPLEMENTATIONS

### 1. AI Brain (`services/ai_brain.py`)

This is the MAIN intelligence engine. It handles ALL AI decision-making.

```
RESPONSIBILITIES:
- Process incoming patient messages (text/voice/photo)
- Generate contextual check-in questions based on surgery type and day number
- Analyze patient responses for symptoms and concerns
- Determine risk level and generate reasoning
- Decide if escalation is needed
- Generate replies in patient's preferred language
- Handle general medical Q&A from patients

IMPLEMENTATION NOTES:
- Use Gemini Flash 2.0 as primary (fast + cheap)
- Fall back to Claude Haiku 3.5 for complex medical reasoning
- Maintain conversation context using the conversations collection
- System prompt should include:
  - Surgery type and date
  - Patient's previous check-in history
  - Known symptoms and pain scores
  - Medicine list
  - Current risk level
  - Language preference

GEMINI SYSTEM PROMPT TEMPLATE:
"""
You are Heal Hub AI, a caring and professional post-surgery follow-up nurse assistant.

Patient Info:
- Name: {name}
- Surgery: {surgery_type} on {surgery_date} ({days_since} days ago)
- Language: {language}
- Current Status: {status}
- Known symptoms: {symptoms}
- Pain trend: {pain_scores}
- Medicines: {medicines}

Previous check-in summary:
{previous_checkin_summary}

Your tasks:
1. Ask recovery-relevant questions appropriate for day {day_number} post {surgery_type}
2. Understand the patient's response (they may reply in Hindi or Telugu)
3. Detect any symptoms: pain, swelling, fever, bleeding, redness, discharge, nausea, breathlessness
4. Score the risk: green (normal), yellow (monitor), red (alert doctor), critical (emergency)
5. Provide your reasoning for the risk assessment
6. Reply to the patient in {language} — be warm, empathetic, not robotic
7. If they ask medical questions, answer carefully with disclaimers

ALWAYS respond in this JSON format:
{
  "reply_to_patient": "string (in patient's language)",
  "detected_symptoms": ["array of symptoms"],
  "pain_score": number or null,
  "medicine_taken": boolean or null,
  "risk_level": "green/yellow/red/critical",
  "risk_score": number 0-100,
  "reasoning": "string (in English, explain WHY this risk level)",
  "recommended_action": "string (what should happen next)",
  "escalation_needed": boolean,
  "escalation_level": number 0-4,
  "next_question": "string or null (follow-up question if needed)"
}
"""
```

### 2. Symptom Analyzer (`services/symptom_analyzer.py`)

```
RESPONSIBILITIES:
- Track symptom patterns over multiple check-ins
- Detect TRENDS (e.g., pain escalating over 3 days)
- Compare against expected recovery milestones for the surgery type
- Flag deviations from normal recovery patterns

IMPLEMENTATION:
- Load all previous check-ins for the patient
- Build a timeline of pain scores, symptoms, risk levels
- Rules:
  - Pain increasing over 3+ consecutive check-ins = escalate
  - Fever after day 3 post-surgery = high concern
  - Wound redness + swelling = infection risk
  - No response for 2+ scheduled check-ins = escalate (patient may be unable to respond)
  - Patient reports "blood" or "bleeding" = immediate red alert
```

### 3. Escalation Engine (`services/escalation.py`)

```
4 LEVELS:

Level 0 — ALL GOOD (Green)
  → Log check-in, continue normal schedule
  → No notification needed

Level 1 — MILD CONCERN (Yellow)
  → Move next check-in to sooner (e.g., from 2 days to 1 day)
  → Flag in doctor dashboard (yellow badge)
  → Send family a gentle update

Level 2 — SERIOUS (Red)
  → Instant alert to doctor (dashboard + SMS via Twilio)
  → Send alert to family members
  → AI sends patient: "We've notified your doctor about your symptoms"

Level 3 — CRITICAL / EMERGENCY
  → All of Level 2 actions
  → Trigger automatic callback to patient to assess urgently
  → Mark as URGENT in dashboard with flashing indicator
  → Send hospital notification (mock)
```

### 4. WhatsApp Handler (`services/whatsapp.py`)

```
INCOMING MESSAGE HANDLING:
When Twilio webhook receives a message:
1. Identify the patient by phone number
2. Determine message type:
   - Text → pass directly to AI Brain
   - Voice note → download media → Deepgram STT → get text → pass to AI Brain
   - Image → download media → if wound context, pass to Wound Analyzer → pass to AI Brain
3. Get AI Brain response
4. If risk level changed, trigger Escalation Engine
5. Save check-in data to database
6. Send reply to patient via Twilio
7. Emit socket event to doctor dashboard (real-time update)

OUTGOING MESSAGES:
- scheduled_checkin(patient_id): Send the day-appropriate check-in question
- send_reply(phone, message): Send text reply
- send_media(phone, media_url, caption): Send image/audio
- send_reminder(patient_id): Gentle reminder if no response

SPECIAL COMMANDS the patient can send:
- "call me" or "mujhe call karo" or "call cheyyi" → triggers AI callback
- "stop" → pauses check-ins (with confirmation)
- "help" → shows available commands
- "my report" → sends recovery summary
- Photo → triggers wound analysis
- Voice note → STT then processed as text
```

### 5. Voice Call Handler (`services/voice_call.py`)

```
WHEN PATIENT REQUESTS CALLBACK:
1. Patient sends "call me" on WhatsApp
2. System initiates Twilio Voice call to patient's phone
3. Twilio connects to our webhook endpoint
4. We generate TwiML to:
   a. Play ElevenLabs-generated welcome message in patient's language
   b. Ask the check-in question via TTS
   c. Record patient's voice response
   d. Process recording through Deepgram STT
   e. Pass text to AI Brain
   f. Generate AI response via ElevenLabs TTS
   g. Play response to patient
   h. Repeat for follow-up questions (max 3-4 questions per call)
   i. End call with "Thank you, get well soon" message
5. Save entire call transcript as a check-in record
```

### 6. Wound Analyzer (`services/wound_analyzer.py`)

```
WHEN PATIENT SENDS A PHOTO:
1. Download image from Twilio media URL
2. Send to Gemini Flash 2.0 with vision prompt:
   "Analyze this post-surgical wound photo. Describe:
   1. Overall appearance (clean/inflamed/infected)
   2. Signs of redness or swelling (none/mild/moderate/severe)
   3. Any discharge or bleeding visible
   4. Estimated healing stage
   5. Risk level: normal / mild_concern / infection_risk
   6. Confidence level (0-1)
   Be conservative — when in doubt, flag for doctor review."
3. Parse response into wound_analysis object
4. If infection_risk → trigger escalation
5. Store analysis with the check-in record
6. Reply to patient with simplified assessment in their language
```

### 7. Translator (`services/translator.py`)

```
IMPLEMENTATION:
- Detect incoming message language (use langdetect or Gemini)
- Translate patient message to English for AI processing
- Translate AI response to patient's preferred language
- Support: English (en), Hindi (hi), Telugu (te)
- For voice: generate TTS in the target language via ElevenLabs
```

### 8. Scheduler (`services/scheduler.py`)

```
IMPLEMENTATION using APScheduler:
- On patient registration, create scheduled jobs for each check-in day
- Job: send_scheduled_checkin(patient_id, day_number)
- Check-in times based on patient's timezone (default: IST 10:00 AM)
- If patient doesn't respond within 4 hours, send a reminder
- If still no response after 8 hours, escalate to Level 1

SCHEDULE per surgery type (configurable):
Default schedule: Day 1, 3, 5, 7, 14, 21, 30
Cardiac surgery: Day 1, 2, 3, 5, 7, 10, 14, 21, 30 (more frequent early)
Minor surgery: Day 1, 3, 7, 14
```

---

## FRONTEND (DOCTOR DASHBOARD) SPECIFICATIONS

### Design Language
- **Theme:** Dark mode with medical blue accents (#3B82F6)
- **Style:** Clean, minimal, professional — NOT flashy (this is a medical tool)
- **Glassmorphism:** Subtle use on cards (backdrop-blur, slight transparency)
- **Typography:** Inter for body, Geist for headings (or use system fonts)
- **Animations:** Subtle Framer Motion — fade in, slide up on load. Nothing excessive.
- **Status Colors:**
  - Green: #22C55E (recovering well)
  - Yellow: #EAB308 (needs attention)
  - Red: #EF4444 (danger)
  - Critical: #EF4444 with pulsing animation

### Page: Dashboard Home (`/`)
- Top row: 4 stat cards (Total Patients, Active Alerts, Avg Recovery Score, Check-ins Today)
- Left section: Patient list (scrollable) with search bar, filter by status
  - Each patient card shows: name, surgery type, days since surgery, status color dot, last check-in time
- Right section: Recent activity feed (live updates via Socket.io)
  - "Ramesh completed Day 3 check-in — Status: Green ✅"
  - "Lakshmi reported increased pain — Status: Yellow ⚠️"
  - "ALERT: Suresh wound photo flagged — Status: Red 🔴"
- Bottom: Active alerts banner (if any red/critical alerts)

### Page: Patient Detail (`/patients/[id]`)
- Header: Patient name, age, surgery type, surgery date, days since surgery, BIG status badge
- Tab 1: **Timeline** — vertical timeline of all check-ins with status colors, expandable entries
- Tab 2: **Symptoms** — Recharts line chart of pain score over time, symptom frequency bar chart
- Tab 3: **Conversations** — WhatsApp-style chat log with message bubbles (AI = blue, patient = gray)
- Tab 4: **Wound Photos** — Gallery of wound photos with AI analysis overlay text
- Tab 5: **Medicines** — Medicine list with adherence percentage bars
- Side panel: **AI Reasoning** — shows latest AI assessment, risk score, reasoning text, recommended action
- Bottom actions bar: "Send Message" | "Request Photo" | "Call Patient" | "Schedule Visit"

### Page: Alerts (`/alerts`)
- Filter tabs: All | New | Acknowledged | Resolved
- Alert cards with: patient name, alert level badge, title, time, AI reasoning preview
- Click to expand: full reasoning, symptom history, quick actions

### Page: Analytics (`/analytics`)
- Recovery trends chart (line chart: avg days to recovery by surgery type)
- Complication rate donut chart
- Patient response rate bar chart
- Monthly patient volume chart
- Top symptoms detected (horizontal bar chart)

### Page: Settings (`/settings`)
- Check-in schedule configuration (which days, what time)
- Escalation rules (customize thresholds)
- Notification preferences (SMS, email, dashboard)
- Surgery types management (add/edit types with specific check-in questions)

### Real-time Updates
- Use Socket.io client to listen for events:
  - `new_checkin` → update patient card and activity feed
  - `new_alert` → show toast notification + update alerts badge count
  - `status_change` → update patient status color in list
- Show subtle animation when new data arrives (pulse effect on card)

---

## ENVIRONMENT VARIABLES (.env)

```
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/healhub

# Twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
TWILIO_PHONE_NUMBER=+1234567890

# Google Gemini
GEMINI_API_KEY=your_gemini_key

# Anthropic (Claude Haiku)
ANTHROPIC_API_KEY=your_anthropic_key

# Deepgram
DEEPGRAM_API_KEY=your_deepgram_key

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=your_voice_id

# App Config
APP_URL=https://your-backend-url.com
FRONTEND_URL=https://your-frontend-url.com
JWT_SECRET=your_super_secret_key
PORT=8000
```

---

## CHECK-IN QUESTION TEMPLATES

### General Post-Surgery (Default)
```
Day 1:
- "How are you feeling after the surgery? Rate your pain from 1 to 10."
- "Have you been able to eat and drink normally?"
- "Did you take your prescribed medicines today?"

Day 3:
- "How is your pain compared to Day 1? (1-10)"
- "Is there any swelling, redness, or warmth near the surgical area?"
- "Can you send a photo of the surgical wound?"
- "Are you able to move/walk as instructed?"

Day 5:
- "How is your pain today? (1-10)"
- "Any fever, chills, or unusual discharge from the wound?"
- "Are you following the diet plan given by your doctor?"

Day 7:
- "How would you rate your overall recovery so far? (1-10)"
- "Any new symptoms this week?"
- "Please send an updated wound photo."
- "Have you scheduled your follow-up appointment?"

Day 14:
- "How are you feeling two weeks after surgery?"
- "Are you able to resume light daily activities?"
- "Any lingering pain or discomfort?"

Day 21:
- "How is your recovery progressing?"
- "Any concerns you'd like to share with your doctor?"

Day 30:
- "It's been a month since your surgery! How are you feeling?"
- "Rate your overall recovery: 1 (poor) to 10 (fully recovered)"
- "Any ongoing symptoms?"
```

---

## MOCK DATA FOR DEMO

Create a seed script (`backend/seed_data.py`) that populates the database with:

- 2 doctors (Dr. Sharma, Dr. Reddy)
- 8-10 patients with different surgery types:
  - 3 in "green" status (recovering well)
  - 2 in "yellow" status (mild concerns)
  - 2 in "red" status (needs attention)
  - 1 in "critical" status (emergency)
- Each patient should have 3-5 historical check-ins showing progression
- Include wound photos (use placeholder medical images or colored rectangles)
- Include conversation histories with realistic Telugu/Hindi/English messages
- Include 3-4 active alerts at different levels

---

## GIT COMMIT STRATEGY

Make commits frequently during the hackathon with meaningful messages:
```
feat: initial project setup with FastAPI and Next.js
feat: add MongoDB schemas and database connection
feat: implement Twilio WhatsApp webhook handler
feat: add Gemini AI brain with symptom analysis
feat: implement 4-level escalation engine
feat: add doctor dashboard with patient list
feat: add patient detail page with timeline
feat: implement real-time alerts with Socket.io
feat: add wound photo analysis with Gemini Vision
feat: add voice call callback feature
feat: add multilingual support (Hindi, Telugu)
feat: add analytics dashboard
feat: seed demo data
feat: final polish and deploy
```

---

## README.md TEMPLATE (Max 1500 words for submission)

```markdown
# 🏥 Heal Hub — Your AI Nurse That Never Sleeps

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
5. 4-level escalation system (Green → Yellow → Red → Critical)
6. Real-time doctor dashboard with patient monitoring
7. AI reasoning transparency (doctor sees WHY alerts were triggered)
8. Family member notifications
9. Recovery analytics and trends

### Setup Instructions
[Include actual setup steps here during hackathon]

### Team
- [Name] — [Role]
- [Name] — [Role]
- [Name] — [Role]
- [Name] — [Role]
```

---

## FINAL NOTES FOR CLAUDE CODE

1. **Start with backend** — get the FastAPI server, MongoDB, and Twilio webhook working FIRST
2. **Then AI brain** — get Gemini processing messages correctly
3. **Then frontend** — build the dashboard to show data
4. **Then fancy features** — voice calls, wound analysis, multilingual
5. **Always keep it working** — after every feature, make sure the app still runs
6. **Use mock data** — don't wait for real Twilio messages. Build the seed script early.
7. **Error handling** — wrap every external API call in try/except. Never let the app crash.
8. **CORS** — make sure FastAPI allows requests from the frontend URL
9. **Socket.io** — emit events from backend whenever data changes, listen in frontend

---

*Document Version: 1.0 | Created for HackWithAI 2026 | Team: Cloud Crusherz*
