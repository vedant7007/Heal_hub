# Heal Hub Security and Reliability Remediation Report

Date: 2026-02-27  
Scope: Backend + Frontend hardening and multi-tenant correctness fixes.

## 1) Cross-doctor access (IDOR) fixes

### Problem
Several endpoints accepted resource IDs without verifying ownership (`doctor_id`), allowing cross-tenant access by any authenticated user.

### What was changed
- Added ownership filters to patient read/write endpoints.
- Scoped alert update by both `_id` and `doctor_id`.
- Scoped check-in access by validating patient ownership before returning data.
- Added role-based dependency helper for route authorization.

### Files
- `backend/app/routes/doctors.py`
- `backend/app/routes/patients.py`
- `backend/app/routes/checkins.py`
- `backend/app/routes/alerts.py`

## 2) Twilio webhook authenticity validation

### Problem
Webhook accepted unauthenticated POSTs and trusted payload contents.

### What was changed
- Implemented Twilio signature validation using `RequestValidator`.
- Rejects invalid or missing signature with `403`.
- Candidate URL validation includes both request URL and `APP_URL + path`.

### Files
- `backend/app/routes/webhook.py`

## 3) PII/secrets logging hardening

### Problem
Logs included raw phone numbers, message/transcript content, and API key fragments.

### What was changed
- Replaced high-risk logs with safe metadata logging.
- Removed API key prefix logging.
- Removed raw transcript/message body logging in sensitive paths.

### Files
- `backend/app/routes/webhook.py`
- `backend/app/routes/voice.py`
- `backend/app/services/speech.py`
- `backend/app/services/voice_call.py`
- `backend/app/services/ai_brain.py`

## 4) Production-safe auth and CORS configuration

### Problem
- Hardcoded default JWT secret.
- Wildcard CORS and Socket.IO origins.

### What was changed
- `JWT_SECRET` is now required from environment.
- Added configurable `CORS_ORIGINS` and `SOCKET_CORS_ORIGINS`.
- Added `APP_TIMEZONE`.
- Added CSV parsing for origin lists from env.

### Files
- `backend/app/config.py`
- `backend/app/main.py`
- `backend/.env.example`

## 5) Analytics tenant scoping

### Problem
`checkins_today`, `complications`, `response-rates` were not doctor-scoped and could leak aggregate data.

### What was changed
- Added `$lookup` joins from check-ins to patients and filtered by current doctor.
- Overview check-in count now uses aggregation pipeline with doctor scoping.

### Files
- `backend/app/routes/analytics.py`

## 6) Scheduler timezone correctness

### Problem
Scheduler used `surgery_date + hours` and UTC naive comparisons; this did not represent fixed local check-in times.

### What was changed
- Added timezone-aware scheduling using `ZoneInfo(APP_TIMEZONE)`.
- Check-ins now schedule on exact local `checkin_schedule.time`.
- Reminder scheduling now compares in same local timezone.

### Files
- `backend/app/services/scheduler.py`
- `backend/app/routes/patients.py` (updated function call with schedule time)

## 7) Voice session persistence (removed in-memory single-process dependency)

### Problem
Voice flow used `_call_data` in memory, losing state on restarts and across instances.

### What was changed
- Added `call_sessions` collection.
- Reworked voice flow to load/save/append/delete session state in MongoDB.
- Cleanup on status completion.

### Files
- `backend/app/database.py`
- `backend/app/routes/voice.py`
- `backend/seed_data.py` (clears `call_sessions`)

## 8) Role trust moved to backend data

### Problem
Frontend role was user-selected/stored in localStorage and not authoritative.

### What was changed
- Doctor model now includes role (`doctor`/`nurse`) in backend.
- Auth responses carry role from backend records.
- Frontend now derives role from `/me` and login response, not local storage selection.
- Removed role selector from login page.

### Files
- `backend/app/models/doctor.py`
- `backend/app/routes/doctors.py`
- `frontend/src/types/index.ts`
- `frontend/src/app/login/page.tsx`
- `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/hooks/use-auth.ts`
- `backend/seed_data.py` (seed doctors include role)

## 9) Mutable default model values

### Problem
Pydantic models used mutable list/object defaults directly.

### What was changed
- Replaced with `Field(default_factory=...)` for list/object fields.

### Files
- `backend/app/models/patient.py`

## 10) Test coverage bootstrap

### Problem
No automated tests existed.

### What was changed
- Added baseline pytest setup and initial tests for:
  - mutable default isolation
  - settings origin parsing
- Added `pytest` dependency to backend requirements.

### Files
- `backend/tests/conftest.py`
- `backend/tests/test_models_and_config.py`
- `backend/requirements.txt`

## 11) Frontend lint remediation

### Problem
Frontend lint had blocking rule violations and warnings, including:
- impure render usage (`Math.random()` in JSX),
- synchronous setState in effects,
- unused imports/variables,
- `Image` a11y false-positive caused by icon naming.

### What was changed
- Added `useMounted` hook with `requestAnimationFrame` scheduling.
- Replaced direct `setMounted` effect patterns in layout/settings.
- Removed impure `Math.random()` waveform with deterministic bar heights.
- Renamed icon import to `ImageIcon` where needed.
- Removed unused imports and unused route vars.

### Files
- `frontend/src/hooks/use-mounted.ts`
- `frontend/src/components/layout/Header.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/app/settings/page.tsx`
- `frontend/src/hooks/use-auth.ts`
- `frontend/src/hooks/use-counter.ts`
- `frontend/src/app/patients/[id]/page.tsx`
- `frontend/src/app/alerts/page.tsx`
- `frontend/src/app/analytics/page.tsx`
- `frontend/src/app/patients/page.tsx`
- `frontend/src/components/layout/AppShell.tsx`

## 12) CI automation

### Problem
No repository-level CI workflow was present to enforce lint/test quality gates.

### What was changed
- Added GitHub Actions workflow running:
  - backend tests (`pytest -q backend/tests`)
  - frontend lint (`npm run lint`)

### Files
- `.github/workflows/ci.yml`

## 13) Database indexing hardening

### Problem
Critical query paths lacked explicit indexes, increasing latency and lock contention as data grows.

### What was changed
- Added startup index initialization (`ensure_indexes`) and wired it into FastAPI startup when DB is available.
- Added indexes for core high-frequency filters and sorts:
  - doctors by email (unique)
  - patients by doctor/activity/created_at, and phone
  - checkins by patient/created_at and doctor/created_at
  - alerts by doctor/status/created_at and patient/created_at
  - conversations by patient (unique)
  - call_sessions by call_sid (unique) + TTL on updated_at
  - appointments by doctor/scheduled_at

### Files
- `backend/app/database.py`
- `backend/app/main.py`

## 14) Webhook and voice rate-limiting + payload guardrails

### Problem
Webhook and voice callbacks had no request throttling or strict payload size controls.

### What was changed
- Added reusable sliding-window in-memory limiter utility.
- Added IP and phone-based limits to WhatsApp webhook.
- Added IP and CallSid-based limits across voice routes.
- Added payload size guards:
  - WhatsApp message body length
  - WhatsApp media count
  - Voice speech result length

### Files
- `backend/app/utils/rate_limit.py`
- `backend/app/routes/webhook.py`
- `backend/app/routes/voice.py`

## 15) Additional test coverage for guardrails

### What was changed
- Added tests for:
  - sliding-window limiter behavior
  - ownership guard query behavior
  - tenant-scoped analytics pipeline
  - webhook signature validation

### Files
- `backend/tests/test_rate_limit.py`
- `backend/tests/test_security_guards.py`

## Verification performed

- Python compile check:
  - `python -m compileall backend/app backend/tests` -> success
- Tests:
  - `pytest -q backend/tests` -> `7 passed`
- Frontend lint:
  - `npm run -s lint` -> success

## Runtime/Deployment notes

- `JWT_SECRET` is now required; backend will not start without it.
- Ensure `.env` includes:
  - `JWT_SECRET`
  - `CORS_ORIGINS`
  - `SOCKET_CORS_ORIGINS`
  - `APP_TIMEZONE`
- Twilio webhook validation requires valid `TWILIO_AUTH_TOKEN`; unsigned requests are rejected.
