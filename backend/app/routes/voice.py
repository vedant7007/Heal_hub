from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse
import hashlib
import logging
import os
import traceback

from app.config import get_settings
from app.database import call_sessions_collection
from app.utils.helpers import utc_now
from app.utils.rate_limit import SlidingWindowRateLimiter, get_client_ip

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()

FALLBACK_VOICE = "Polly.Aditi"
MAX_SPEECH_RESULT_CHARS = 1000
VOICE_IP_RATE_LIMIT_PER_MIN = 120
VOICE_CALLSID_RATE_LIMIT_PER_MIN = 40
_voice_ip_limiter = SlidingWindowRateLimiter()
_voice_session_limiter = SlidingWindowRateLimiter()
AUDIO_CACHE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "audio_cache"
)


async def _get_public_url() -> str:
    """Get ngrok URL if running, else APP_URL."""
    try:
        import httpx

        async with httpx.AsyncClient() as client:
            resp = await client.get("http://127.0.0.1:4040/api/tunnels", timeout=2)
            tunnels = resp.json().get("tunnels", [])
            for tunnel in tunnels:
                url = tunnel.get("public_url", "")
                if url.startswith("https://"):
                    return url
    except Exception:
        pass
    return settings.APP_URL


async def _save_call_data(call_sid: str, data: dict):
    await call_sessions_collection.update_one(
        {"call_sid": call_sid},
        {
            "$set": {**data, "updated_at": utc_now()},
            "$setOnInsert": {"created_at": utc_now()},
        },
        upsert=True,
    )


async def _load_call_data(call_sid: str) -> dict:
    doc = await call_sessions_collection.find_one({"call_sid": call_sid})
    if not doc:
        return {}
    return {
        "patient_id": doc.get("patient_id", ""),
        "patient_name": doc.get("patient_name", "there"),
        "lang": doc.get("lang", "en"),
        "responses": doc.get("responses", []),
    }


async def _append_response(call_sid: str, question: str, answer: str, turn: int):
    await call_sessions_collection.update_one(
        {"call_sid": call_sid},
        {
            "$push": {
                "responses": {
                    "question": question,
                    "answer": answer or "(no response)",
                    "turn": turn,
                }
            },
            "$set": {"updated_at": utc_now()},
        },
        upsert=True,
    )


async def _delete_call_data(call_sid: str):
    await call_sessions_collection.delete_one({"call_sid": call_sid})


async def _generate_audio(text: str, public_url: str) -> str | None:
    """Generate ElevenLabs TTS audio, return public URL to the file. None on failure."""
    if not settings.ELEVENLABS_API_KEY:
        return None

    try:
        from app.services.speech import text_to_speech

        audio_bytes = await text_to_speech(text)
        if not audio_bytes or len(audio_bytes) < 100:
            return None

        filename = hashlib.md5(text.encode()).hexdigest() + ".mp3"
        filepath = os.path.join(AUDIO_CACHE_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(audio_bytes)

        return f"{public_url}/api/audio/{filename}"
    except Exception:
        logger.exception("Voice TTS generation failed")
        return None


def _speak_twiml(text: str, audio_url: str | None, lang: str = "en-IN") -> str:
    if audio_url:
        return f"<Play>{audio_url}</Play>"
    return f'<Say voice="{FALLBACK_VOICE}" language="{lang}">{text}</Say>'


async def _transcribe_recording(recording_url: str, lang: str = "en") -> str:
    if not recording_url:
        return ""

    try:
        import httpx

        wav_url = recording_url + ".wav"
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                wav_url,
                auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                follow_redirects=True,
            )
            audio_bytes = resp.content

        from app.services.speech import speech_to_text

        transcript = await speech_to_text(audio_bytes, lang)
        return transcript or ""
    except Exception:
        logger.exception("Voice transcription failed")
        return ""


async def _lookup_patient(phone: str):
    from app.database import patients_collection

    phone_clean = phone.replace("+", "")
    return await patients_collection.find_one({"phone": {"$regex": phone_clean[-10:]}})


async def _detect_and_update_lang(call_sid: str, transcript: str, current_lang: str) -> str:
    """Detect spoken language and update session if different. Returns the detected language."""
    if not transcript or len(transcript.strip()) < 3:
        return current_lang
    try:
        from app.services.translator import detect_language
        detected = detect_language(transcript)
        if detected in ("en", "hi", "te") and detected != current_lang:
            await call_sessions_collection.update_one(
                {"call_sid": call_sid},
                {"$set": {"lang": detected}},
            )
            logger.info(f"Voice call language switched: {current_lang} -> {detected}")
            return detected
    except Exception:
        pass
    return current_lang


def _twiml_lang(lang: str) -> str:
    lang_map = {"hi": "hi-IN", "te": "te-IN", "en": "en-IN"}
    return lang_map.get(lang, "en-IN")


async def _enforce_voice_rate_limit(request: Request, call_sid: str):
    client_ip = get_client_ip(request)
    if not await _voice_ip_limiter.allow(f"voice:ip:{client_ip}", VOICE_IP_RATE_LIMIT_PER_MIN, 60):
        raise HTTPException(status_code=429, detail="Too many requests")
    if call_sid and not await _voice_session_limiter.allow(
        f"voice:callsid:{call_sid}", VOICE_CALLSID_RATE_LIMIT_PER_MIN, 60
    ):
        raise HTTPException(status_code=429, detail="Too many requests")


@router.post("")
async def voice_turn1(request: Request):
    """Turn 1: Greet patient and ask about pain level."""
    form = await request.form()
    patient_phone = form.get("To", "")
    call_sid = form.get("CallSid", "")
    await _enforce_voice_rate_limit(request, call_sid)

    patient = await _lookup_patient(patient_phone)
    name = patient["name"] if patient else "there"
    lang = patient.get("language_preference", "en") if patient else "en"
    patient_id = str(patient["_id"]) if patient else ""

    await _save_call_data(
        call_sid,
        {
            "call_sid": call_sid,
            "patient_id": patient_id,
            "patient_name": name,
            "lang": lang,
            "responses": [],
        },
    )

    from app.services.templates import get_template
    text = get_template("voice_greeting", lang, name=name)

    public_url = await _get_public_url()
    audio_url = await _generate_audio(text, public_url)
    action_url = f"{public_url}/api/webhook/voice/turn2"
    tl = _twiml_lang(lang)

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    {_speak_twiml(text, audio_url, tl)}
    <Gather input="speech" speechTimeout="auto" language="{tl}" timeout="10" action="{action_url}">
    </Gather>
    <Say voice="{FALLBACK_VOICE}" language="{tl}">{get_template("voice_no_response", lang)}</Say>
    <Redirect>{action_url}</Redirect>
</Response>"""

    return PlainTextResponse(twiml, media_type="text/xml")


@router.post("/turn2")
async def voice_turn2(request: Request):
    """Turn 2: Process pain answer, ask about symptoms."""
    form = await request.form()
    call_sid = form.get("CallSid", "")
    speech_result = form.get("SpeechResult", "")
    recording_url = form.get("RecordingUrl", "")
    await _enforce_voice_rate_limit(request, call_sid)
    if len(speech_result) > MAX_SPEECH_RESULT_CHARS:
        raise HTTPException(status_code=413, detail="Speech payload too large")

    data = await _load_call_data(call_sid)
    transcript = speech_result
    if not transcript and recording_url:
        transcript = await _transcribe_recording(recording_url, data.get("lang", "en"))

    await _append_response(call_sid, "How is your pain today on a scale of 1 to 10?", transcript, 1)

    lang = data.get("lang", "en")
    lang = await _detect_and_update_lang(call_sid, transcript, lang)
    from app.services.templates import get_template
    text = get_template("voice_symptoms", lang)

    public_url = await _get_public_url()
    audio_url = await _generate_audio(text, public_url)
    action_url = f"{public_url}/api/webhook/voice/turn3"
    tl = _twiml_lang(lang)

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    {_speak_twiml(text, audio_url, tl)}
    <Gather input="speech" speechTimeout="auto" language="{tl}" timeout="10" action="{action_url}">
    </Gather>
    <Say voice="{FALLBACK_VOICE}" language="{tl}">Let me move on.</Say>
    <Redirect>{action_url}</Redirect>
</Response>"""

    return PlainTextResponse(twiml, media_type="text/xml")


@router.post("/turn3")
async def voice_turn3(request: Request):
    """Turn 3: Process symptoms answer, ask about medicines."""
    form = await request.form()
    call_sid = form.get("CallSid", "")
    speech_result = form.get("SpeechResult", "")
    recording_url = form.get("RecordingUrl", "")
    await _enforce_voice_rate_limit(request, call_sid)
    if len(speech_result) > MAX_SPEECH_RESULT_CHARS:
        raise HTTPException(status_code=413, detail="Speech payload too large")

    data = await _load_call_data(call_sid)
    transcript = speech_result
    if not transcript and recording_url:
        transcript = await _transcribe_recording(recording_url, data.get("lang", "en"))

    await _append_response(call_sid, "Are you experiencing any swelling, fever, or bleeding?", transcript, 2)

    lang = data.get("lang", "en")
    lang = await _detect_and_update_lang(call_sid, transcript, lang)
    from app.services.templates import get_template
    text = get_template("voice_medicines", lang)

    public_url = await _get_public_url()
    audio_url = await _generate_audio(text, public_url)
    action_url = f"{public_url}/api/webhook/voice/turn4"
    tl = _twiml_lang(lang)

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    {_speak_twiml(text, audio_url, tl)}
    <Gather input="speech" speechTimeout="auto" language="{tl}" timeout="10" action="{action_url}">
    </Gather>
    <Say voice="{FALLBACK_VOICE}" language="{tl}">Let me move on.</Say>
    <Redirect>{action_url}</Redirect>
</Response>"""

    return PlainTextResponse(twiml, media_type="text/xml")


@router.post("/turn4")
async def voice_turn4(request: Request):
    """Turn 4: Process medicines answer, ask for any other concerns."""
    form = await request.form()
    call_sid = form.get("CallSid", "")
    speech_result = form.get("SpeechResult", "")
    recording_url = form.get("RecordingUrl", "")
    await _enforce_voice_rate_limit(request, call_sid)
    if len(speech_result) > MAX_SPEECH_RESULT_CHARS:
        raise HTTPException(status_code=413, detail="Speech payload too large")

    data = await _load_call_data(call_sid)
    transcript = speech_result
    if not transcript and recording_url:
        transcript = await _transcribe_recording(recording_url, data.get("lang", "en"))

    await _append_response(call_sid, "Have you been taking your medicines regularly?", transcript, 3)

    lang = data.get("lang", "en")
    lang = await _detect_and_update_lang(call_sid, transcript, lang)
    from app.services.templates import get_template
    text = get_template("voice_concerns", lang)

    public_url = await _get_public_url()
    audio_url = await _generate_audio(text, public_url)
    action_url = f"{public_url}/api/webhook/voice/complete"
    tl = _twiml_lang(lang)

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    {_speak_twiml(text, audio_url, tl)}
    <Gather input="speech" speechTimeout="auto" language="{tl}" timeout="10" action="{action_url}">
    </Gather>
    <Say voice="{FALLBACK_VOICE}" language="{tl}">No problem.</Say>
    <Redirect>{action_url}</Redirect>
</Response>"""

    return PlainTextResponse(twiml, media_type="text/xml")


@router.post("/complete")
async def voice_complete(request: Request):
    """Final turn: process last answer, run AI assessment, save check-in, close call."""
    form = await request.form()
    call_sid = form.get("CallSid", "")
    speech_result = form.get("SpeechResult", "")
    recording_url = form.get("RecordingUrl", "")
    await _enforce_voice_rate_limit(request, call_sid)
    if len(speech_result) > MAX_SPEECH_RESULT_CHARS:
        raise HTTPException(status_code=413, detail="Speech payload too large")

    data = await _load_call_data(call_sid)
    transcript = speech_result
    if not transcript and recording_url:
        transcript = await _transcribe_recording(recording_url, data.get("lang", "en"))

    await _append_response(call_sid, "Any other concerns for your doctor?", transcript, 4)
    data = await _load_call_data(call_sid)

    patient_id = data.get("patient_id", "")
    patient_name = data.get("patient_name", "there")
    lang = data.get("lang", "en")
    lang = await _detect_and_update_lang(call_sid, transcript, lang)
    responses = data.get("responses", [])

    combined_text = "\n".join([f"Q: {r['question']}\nA: {r['answer']}" for r in responses])

    ai_response = None
    if patient_id and combined_text:
        try:
            from app.services.ai_brain import process_message

            ai_response = await process_message(patient_id, combined_text, "voice_call")
        except Exception:
            logger.exception("Voice AI assessment failed")

    if patient_id:
        try:
            from bson import ObjectId
            from app.database import patients_collection, checkins_collection, conversations_collection
            from app.utils.helpers import days_since

            patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
            day_num = days_since(patient.get("surgery_date", utc_now())) if patient else 0

            checkin_doc = {
                "patient_id": patient_id,
                "doctor_id": patient.get("doctor_id", "") if patient else "",
                "day_number": day_num,
                "type": "callback",
                "questions_asked": [r["question"] for r in responses],
                "responses": [
                    {
                        "question": r["question"],
                        "answer": r["answer"],
                        "answer_type": "voice",
                        "original_language": lang,
                        "translated_answer": r["answer"],
                        "timestamp": utc_now(),
                    }
                    for r in responses
                ],
                "pain_score": ai_response.get("pain_score") if ai_response else None,
                "symptoms_detected": ai_response.get("detected_symptoms", []) if ai_response else [],
                "medicine_taken": ai_response.get("medicine_taken") if ai_response else None,
                "ai_assessment": {
                    "risk_level": ai_response.get("risk_level", "green") if ai_response else "green",
                    "risk_score": ai_response.get("risk_score", 0) if ai_response else 0,
                    "reasoning": ai_response.get("reasoning", "") if ai_response else "Voice call completed",
                    "recommended_action": ai_response.get("recommended_action", "") if ai_response else "",
                },
                "escalation_triggered": ai_response.get("escalation_needed", False) if ai_response else False,
                "escalation_level": ai_response.get("escalation_level", 0) if ai_response else 0,
                "created_at": utc_now(),
            }
            await checkins_collection.insert_one(checkin_doc)

            if ai_response:
                new_status = ai_response.get("risk_level", "green")
                await patients_collection.update_one(
                    {"_id": ObjectId(patient_id)},
                    {
                        "$set": {
                            "current_status": new_status,
                            "risk_score": ai_response.get("risk_score", 0),
                            "updated_at": utc_now(),
                        }
                    },
                )

            conv_messages = []
            for r in responses:
                conv_messages.append(
                    {
                        "role": "ai",
                        "content": r["question"],
                        "content_type": "voice_call",
                        "language": lang,
                        "timestamp": utc_now(),
                    }
                )
                conv_messages.append(
                    {
                        "role": "patient",
                        "content": r["answer"],
                        "content_type": "voice_call",
                        "language": lang,
                        "timestamp": utc_now(),
                    }
                )

            await conversations_collection.update_one(
                {"patient_id": patient_id},
                {"$push": {"messages": {"$each": conv_messages}}, "$set": {"updated_at": utc_now()}},
                upsert=True,
            )

            if ai_response and ai_response.get("escalation_needed"):
                try:
                    from app.services.escalation import evaluate_and_escalate

                    await evaluate_and_escalate(patient_id, checkin_doc)
                except Exception:
                    logger.exception("Voice escalation failed")

            try:
                from app.main import sio

                await sio.emit(
                    "new_checkin",
                    {
                        "patient_id": patient_id,
                        "patient_name": patient_name,
                        "status": ai_response.get("risk_level", "green") if ai_response else "green",
                        "message": "Voice call check-in completed",
                        "timestamp": utc_now().isoformat(),
                    },
                )
            except Exception:
                logger.warning("Socket emit failed for voice new_checkin")

        except Exception:
            logger.exception("Voice check-in save failed")

    await _delete_call_data(call_sid)

    from app.services.templates import get_template
    closing_text = get_template("voice_closing", lang, name=patient_name)

    public_url = await _get_public_url()
    audio_url = await _generate_audio(closing_text, public_url)
    tl = _twiml_lang(lang)

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    {_speak_twiml(closing_text, audio_url, tl)}
    <Pause length="1"/>
    <Hangup/>
</Response>"""

    return PlainTextResponse(twiml, media_type="text/xml")


@router.post("/status")
async def voice_status(request: Request):
    """Voice call status callback."""
    form = await request.form()
    status = form.get("CallStatus", "unknown")
    call_sid = form.get("CallSid", "")
    await _enforce_voice_rate_limit(request, call_sid)

    if status in ("completed", "failed", "no-answer", "busy"):
        await _delete_call_data(call_sid)

    return {"status": "ok"}
