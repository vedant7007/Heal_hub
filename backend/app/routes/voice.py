from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse
from app.config import get_settings
from app.utils.helpers import utc_now
import logging
import traceback
import hashlib
import os

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()

FALLBACK_VOICE = "Polly.Aditi"
AUDIO_CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "audio_cache")

# In-memory store for call responses keyed by CallSid
_call_data: dict = {}


async def _get_public_url() -> str:
    """Get ngrok URL if running, else APP_URL."""
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get("http://127.0.0.1:4040/api/tunnels", timeout=2)
            tunnels = resp.json().get("tunnels", [])
            for t in tunnels:
                if t.get("public_url", "").startswith("https://"):
                    return t["public_url"]
    except Exception:
        pass
    return settings.APP_URL


async def _generate_audio(text: str, public_url: str) -> str | None:
    """Generate ElevenLabs TTS audio, return public URL to the file. None on failure."""
    if not settings.ELEVENLABS_API_KEY:
        print(f"[VOICE-TTS] No ElevenLabs key — skipping")
        return None

    try:
        from app.services.speech import text_to_speech
        audio_bytes = await text_to_speech(text)
        if not audio_bytes or len(audio_bytes) < 100:
            print(f"[VOICE-TTS] ElevenLabs returned empty/tiny audio")
            return None

        # Save to audio_cache with hash-based filename
        filename = hashlib.md5(text.encode()).hexdigest() + ".mp3"
        filepath = os.path.join(AUDIO_CACHE_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(audio_bytes)

        url = f"{public_url}/api/audio/{filename}"
        print(f"[VOICE-TTS] Audio saved: {filepath} ({len(audio_bytes)} bytes) -> {url}")
        return url

    except Exception as e:
        print(f"[VOICE-TTS] ElevenLabs FAILED: {type(e).__name__}: {e}")
        traceback.print_exc()
        return None


def _speak_twiml(text: str, audio_url: str | None, lang: str = "en-IN") -> str:
    """Return TwiML fragment: <Play> if audio_url, else <Say> fallback."""
    if audio_url:
        return f'<Play>{audio_url}</Play>'
    return f'<Say voice="{FALLBACK_VOICE}" language="{lang}">{text}</Say>'


async def _transcribe_recording(recording_url: str, lang: str = "en") -> str:
    """Download a Twilio recording and transcribe with Deepgram."""
    if not recording_url:
        return ""
    try:
        import httpx
        wav_url = recording_url + ".wav"
        print(f"[VOICE] Downloading recording: {wav_url}")
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                wav_url,
                auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                follow_redirects=True,
            )
            audio_bytes = resp.content
        print(f"[VOICE] Audio downloaded: {len(audio_bytes)} bytes")

        from app.services.speech import speech_to_text
        transcript = await speech_to_text(audio_bytes, lang)
        print(f"[VOICE] Transcript: '{transcript}'")
        return transcript or ""
    except Exception as e:
        print(f"[VOICE] Transcription FAILED: {type(e).__name__}: {e}")
        traceback.print_exc()
        return ""


async def _lookup_patient(phone: str):
    """Look up patient by phone number."""
    from app.database import patients_collection
    phone_clean = phone.replace("+", "")
    patient = await patients_collection.find_one({"phone": {"$regex": phone_clean[-10:]}})
    return patient


def _twiml_lang(lang: str) -> str:
    return "hi-IN" if lang == "hi" else "en-IN"


# ─── Turn 1: Greeting + Pain question ───────────────────────────

@router.post("")
async def voice_turn1(request: Request):
    """Turn 1: Greet patient and ask about pain level."""
    form = await request.form()
    patient_phone = form.get("To", "")
    call_sid = form.get("CallSid", "")

    print(f"\n[VOICE] ===== CALL STARTED (Turn 1) =====")
    print(f"[VOICE] To: {patient_phone}, CallSid: {call_sid}")

    patient = await _lookup_patient(patient_phone)
    name = patient["name"] if patient else "there"
    lang = patient.get("language_preference", "en") if patient else "en"
    patient_id = str(patient["_id"]) if patient else ""

    print(f"[VOICE] Patient: {name} (id={patient_id}, lang={lang})")

    # Initialize call data
    _call_data[call_sid] = {
        "patient_id": patient_id,
        "patient_name": name,
        "lang": lang,
        "responses": [],
    }

    texts = {
        "en": f"Hello {name}, this is Heal Hub, your recovery assistant. How is your pain today on a scale of 1 to 10?",
        "hi": f"Namaste {name}, yeh Heal Hub hai, aapka recovery assistant. Aapka dard aaj 1 se 10 mein kitna hai?",
        "te": f"Namaskaram {name}, idi Heal Hub, mee recovery assistant. Mee noppi eeroju 1 nundi 10 lo entha?",
    }
    text = texts.get(lang, texts["en"])

    public_url = await _get_public_url()
    audio_url = await _generate_audio(text, public_url)
    action_url = f"{public_url}/api/webhook/voice/turn2"
    tl = _twiml_lang(lang)

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    {_speak_twiml(text, audio_url, tl)}
    <Gather input="speech" speechTimeout="auto" language="{tl}" timeout="10" action="{action_url}">
    </Gather>
    <Say voice="{FALLBACK_VOICE}" language="{tl}">I didn't hear anything. Let me move to the next question.</Say>
    <Redirect>{action_url}</Redirect>
</Response>"""

    print(f"[VOICE] Turn 1 TwiML sent (action={action_url})")
    return PlainTextResponse(twiml, media_type="text/xml")


# ─── Turn 2: Process pain answer + Ask about symptoms ───────────

@router.post("/turn2")
async def voice_turn2(request: Request):
    """Turn 2: Process pain answer, ask about symptoms."""
    form = await request.form()
    call_sid = form.get("CallSid", "")
    speech_result = form.get("SpeechResult", "")
    recording_url = form.get("RecordingUrl", "")

    print(f"\n[VOICE] ===== TURN 2 =====")
    print(f"[VOICE] CallSid: {call_sid}")
    print(f"[VOICE] SpeechResult: '{speech_result}'")

    # If Gather gave us SpeechResult, use it; else try recording
    transcript = speech_result
    if not transcript and recording_url:
        data = _call_data.get(call_sid, {})
        transcript = await _transcribe_recording(recording_url, data.get("lang", "en"))

    # Save turn 1 response
    if call_sid in _call_data:
        _call_data[call_sid]["responses"].append({
            "question": "How is your pain today on a scale of 1 to 10?",
            "answer": transcript or "(no response)",
            "turn": 1,
        })
        print(f"[VOICE] Saved turn 1 response: '{transcript}'")

    data = _call_data.get(call_sid, {})
    lang = data.get("lang", "en")

    texts = {
        "en": "Thank you. Are you experiencing any swelling, fever, or bleeding near the surgical area?",
        "hi": "Shukriya. Kya aapko surgery ke aaspaas sujan, bukhar, ya khoon aa raha hai?",
        "te": "Dhanyavaadalu. Surgery area daggara vaapu, jwaram, leda bleeding unda?",
    }
    text = texts.get(lang, texts["en"])

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

    print(f"[VOICE] Turn 2 TwiML sent")
    return PlainTextResponse(twiml, media_type="text/xml")


# ─── Turn 3: Process symptoms + Ask about medicines ─────────────

@router.post("/turn3")
async def voice_turn3(request: Request):
    """Turn 3: Process symptoms answer, ask about medicines."""
    form = await request.form()
    call_sid = form.get("CallSid", "")
    speech_result = form.get("SpeechResult", "")
    recording_url = form.get("RecordingUrl", "")

    print(f"\n[VOICE] ===== TURN 3 =====")
    print(f"[VOICE] SpeechResult: '{speech_result}'")

    transcript = speech_result
    if not transcript and recording_url:
        data = _call_data.get(call_sid, {})
        transcript = await _transcribe_recording(recording_url, data.get("lang", "en"))

    if call_sid in _call_data:
        _call_data[call_sid]["responses"].append({
            "question": "Are you experiencing any swelling, fever, or bleeding?",
            "answer": transcript or "(no response)",
            "turn": 2,
        })
        print(f"[VOICE] Saved turn 2 response: '{transcript}'")

    data = _call_data.get(call_sid, {})
    lang = data.get("lang", "en")

    texts = {
        "en": "Got it. Have you been taking your medicines regularly?",
        "hi": "Samajh gaya. Kya aap apni dawaiyan niyamit le rahe hain?",
        "te": "Ardham ayyindi. Meeru mee medicines regularly teesukuntunnara?",
    }
    text = texts.get(lang, texts["en"])

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

    print(f"[VOICE] Turn 3 TwiML sent")
    return PlainTextResponse(twiml, media_type="text/xml")


# ─── Turn 4: Process medicines + Ask open-ended concerns ────────

@router.post("/turn4")
async def voice_turn4(request: Request):
    """Turn 4: Process medicines answer, ask for any other concerns."""
    form = await request.form()
    call_sid = form.get("CallSid", "")
    speech_result = form.get("SpeechResult", "")
    recording_url = form.get("RecordingUrl", "")

    print(f"\n[VOICE] ===== TURN 4 =====")
    print(f"[VOICE] SpeechResult: '{speech_result}'")

    transcript = speech_result
    if not transcript and recording_url:
        data = _call_data.get(call_sid, {})
        transcript = await _transcribe_recording(recording_url, data.get("lang", "en"))

    if call_sid in _call_data:
        _call_data[call_sid]["responses"].append({
            "question": "Have you been taking your medicines regularly?",
            "answer": transcript or "(no response)",
            "turn": 3,
        })
        print(f"[VOICE] Saved turn 3 response: '{transcript}'")

    data = _call_data.get(call_sid, {})
    lang = data.get("lang", "en")

    texts = {
        "en": "One last thing. Do you have any other concerns you'd like me to tell your doctor?",
        "hi": "Ek aakhri baat. Kya aap apne doctor ko kuch aur batana chahte hain?",
        "te": "Oka last question. Meeru mee doctor ki inkemanna cheppaalanukuntunaara?",
    }
    text = texts.get(lang, texts["en"])

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

    print(f"[VOICE] Turn 4 TwiML sent")
    return PlainTextResponse(twiml, media_type="text/xml")


# ─── Complete: Process final answer + AI assessment + save ───────

@router.post("/complete")
async def voice_complete(request: Request):
    """Final turn: process last answer, run AI assessment, save check-in, close call."""
    form = await request.form()
    call_sid = form.get("CallSid", "")
    speech_result = form.get("SpeechResult", "")
    recording_url = form.get("RecordingUrl", "")

    print(f"\n[VOICE] ===== COMPLETE =====")
    print(f"[VOICE] SpeechResult: '{speech_result}'")

    transcript = speech_result
    if not transcript and recording_url:
        data = _call_data.get(call_sid, {})
        transcript = await _transcribe_recording(recording_url, data.get("lang", "en"))

    if call_sid in _call_data:
        _call_data[call_sid]["responses"].append({
            "question": "Any other concerns for your doctor?",
            "answer": transcript or "(no response)",
            "turn": 4,
        })
        print(f"[VOICE] Saved turn 4 response: '{transcript}'")

    data = _call_data.get(call_sid, {})
    patient_id = data.get("patient_id", "")
    patient_name = data.get("patient_name", "there")
    lang = data.get("lang", "en")
    responses = data.get("responses", [])

    print(f"[VOICE] All responses collected for {patient_name}:")
    for r in responses:
        print(f"  Q: {r['question']}")
        print(f"  A: {r['answer']}")

    # Build combined text for AI assessment
    combined_text = "\n".join([
        f"Q: {r['question']}\nA: {r['answer']}" for r in responses
    ])

    ai_response = None
    if patient_id and combined_text:
        try:
            from app.services.ai_brain import process_message
            ai_response = await process_message(patient_id, combined_text, "voice_call")
            print(f"[VOICE] AI assessment: risk={ai_response.get('risk_level')}, score={ai_response.get('risk_score')}")
        except Exception as e:
            print(f"[VOICE] AI assessment FAILED: {e}")
            traceback.print_exc()

    # Save as check-in
    if patient_id:
        try:
            from app.database import patients_collection, checkins_collection
            from app.utils.helpers import days_since
            from bson import ObjectId

            patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
            day_num = days_since(patient.get("surgery_date", utc_now())) if patient else 0

            checkin_doc = {
                "patient_id": patient_id,
                "day_number": day_num,
                "type": "callback",
                "questions_asked": [r["question"] for r in responses],
                "responses": [{
                    "question": r["question"],
                    "answer": r["answer"],
                    "answer_type": "voice",
                    "original_language": lang,
                    "translated_answer": r["answer"],
                    "timestamp": utc_now(),
                } for r in responses],
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
            result = await checkins_collection.insert_one(checkin_doc)
            print(f"[VOICE] Check-in saved: {result.inserted_id}")

            # Update patient status
            if ai_response:
                new_status = ai_response.get("risk_level", "green")
                await patients_collection.update_one(
                    {"_id": ObjectId(patient_id)},
                    {"$set": {
                        "current_status": new_status,
                        "risk_score": ai_response.get("risk_score", 0),
                        "updated_at": utc_now(),
                    }}
                )
                print(f"[VOICE] Patient status updated to: {new_status}")

            # Save conversation messages
            from app.database import conversations_collection
            conv_messages = []
            for r in responses:
                conv_messages.append({
                    "role": "ai",
                    "content": r["question"],
                    "content_type": "voice_call",
                    "language": lang,
                    "timestamp": utc_now(),
                })
                conv_messages.append({
                    "role": "patient",
                    "content": r["answer"],
                    "content_type": "voice_call",
                    "language": lang,
                    "timestamp": utc_now(),
                })

            await conversations_collection.update_one(
                {"patient_id": patient_id},
                {"$push": {"messages": {"$each": conv_messages}}, "$set": {"updated_at": utc_now()}},
                upsert=True,
            )
            print(f"[VOICE] Conversation updated with {len(conv_messages)} messages")

            # Run escalation if needed
            if ai_response and ai_response.get("escalation_needed"):
                print(f"[VOICE] Escalation triggered! Level: {ai_response.get('escalation_level')}")
                try:
                    from app.services.escalation import evaluate_and_escalate
                    await evaluate_and_escalate(patient_id, checkin_doc)
                except Exception as e:
                    print(f"[VOICE] Escalation FAILED: {e}")

            # Emit socket event
            try:
                from app.main import sio
                await sio.emit("new_checkin", {
                    "patient_id": patient_id,
                    "patient_name": patient_name,
                    "status": ai_response.get("risk_level", "green") if ai_response else "green",
                    "message": "Voice call check-in completed",
                    "timestamp": utc_now().isoformat(),
                })
            except Exception:
                pass

        except Exception as e:
            print(f"[VOICE] Check-in save FAILED: {type(e).__name__}: {e}")
            traceback.print_exc()

    # Clean up call data
    _call_data.pop(call_sid, None)

    # Closing message
    closings = {
        "en": f"Thank you {patient_name}. I've recorded all your responses and your doctor will be updated. If you need anything, just send us a WhatsApp message. Take care and get well soon!",
        "hi": f"Shukriya {patient_name}. Maine aapke saare jawab record kar liye hain aur aapke doctor ko update kar diya jayega. Kuch bhi chahiye toh WhatsApp par message karein. Apna khayal rakhiye!",
        "te": f"Dhanyavaadalu {patient_name}. Mee responses anni record chesamu, mee doctor ki update chestamu. Emaina kaavali ante WhatsApp lo message pamapandi. Jagratta!",
    }
    closing_text = closings.get(lang, closings["en"])

    public_url = await _get_public_url()
    audio_url = await _generate_audio(closing_text, public_url)
    tl = _twiml_lang(lang)

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    {_speak_twiml(closing_text, audio_url, tl)}
    <Pause length="1"/>
    <Hangup/>
</Response>"""

    print(f"[VOICE] ===== CALL COMPLETE =====\n")
    return PlainTextResponse(twiml, media_type="text/xml")


# ─── Status callback ────────────────────────────────────────────

@router.post("/status")
async def voice_status(request: Request):
    """Voice call status callback."""
    form = await request.form()
    status = form.get("CallStatus", "unknown")
    duration = form.get("CallDuration", "0")
    call_sid = form.get("CallSid", "")
    print(f"[VOICE] Call status: {status}, duration: {duration}s, sid: {call_sid}")

    # Clean up call data on completion
    if status in ("completed", "failed", "no-answer", "busy"):
        _call_data.pop(call_sid, None)

    return {"status": "ok"}
