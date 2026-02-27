from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse
from app.config import get_settings
import logging
import traceback

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()

VOICE = "Polly.Aditi"  # Indian English voice — works with Twilio, no extra API key


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


@router.post("")
async def voice_webhook(request: Request):
    """Handle incoming voice call — greet and gather speech."""
    form = await request.form()
    patient_phone = form.get("To", "")
    call_sid = form.get("CallSid", "")

    print(f"\n[VOICE] === INCOMING CALL ===")
    print(f"[VOICE] To: {patient_phone}, CallSid: {call_sid}")

    from app.database import patients_collection
    phone_clean = patient_phone.replace("+", "")
    patient = await patients_collection.find_one({"phone": {"$regex": phone_clean[-10:]}})

    name = patient["name"] if patient else "there"
    lang = patient.get("language_preference", "en") if patient else "en"
    patient_id = str(patient["_id"]) if patient else ""

    print(f"[VOICE] Patient: {name} (id={patient_id}, lang={lang})")

    greetings = {
        "en": f"Hello {name}, this is Heal Hub. Let me check on your recovery. How is your pain today on a scale of 1 to 10? Please tell me after the beep.",
        "hi": f"Namaste {name}, yeh Heal Hub hai. Main aapki recovery check kar rahi hoon. Aapka dard aaj 1 se 10 mein kitna hai? Beep ke baad batayein.",
        "te": f"Namaskaram {name}, idi Heal Hub. Mee recovery check chestunnanu. Mee noppi eeroju 1 nundi 10 lo entha? Beep tarvata cheppandi.",
    }

    public_url = await _get_public_url()
    action_url = f"{public_url}/api/webhook/voice/gather"
    print(f"[VOICE] Gather action URL: {action_url}")

    twiml_lang = "en-IN" if lang == "en" else "hi-IN" if lang == "hi" else "en-IN"
    greeting_text = greetings.get(lang, greetings["en"])

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="{VOICE}" language="{twiml_lang}">{greeting_text}</Say>
    <Record maxLength="30" action="{action_url}" transcribe="false" playBeep="true" timeout="5" />
    <Say voice="{VOICE}" language="{twiml_lang}">We did not receive your response. We will try again later. Get well soon!</Say>
</Response>"""

    print(f"[VOICE] Sending TwiML greeting")
    return PlainTextResponse(twiml, media_type="text/xml")


@router.post("/gather")
async def voice_gather(request: Request):
    """Process recorded voice response from patient."""
    form = await request.form()
    recording_url = form.get("RecordingUrl", "")
    caller = form.get("From", "")
    call_sid = form.get("CallSid", "")

    print(f"\n[VOICE] === RECORDING RECEIVED ===")
    print(f"[VOICE] From: {caller}, CallSid: {call_sid}")
    print(f"[VOICE] Recording URL: {recording_url}")

    response_text = "Thank you for your response. Your doctor has been updated. Take care!"

    if recording_url:
        try:
            # Download recording with Twilio auth
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

            # Transcribe
            from app.services.speech import speech_to_text
            phone_clean = caller.replace("+", "")
            from app.database import patients_collection
            patient = await patients_collection.find_one({"phone": {"$regex": phone_clean[-10:]}})
            lang = patient.get("language_preference", "en") if patient else "en"

            transcribed = await speech_to_text(audio_bytes, lang)
            print(f"[VOICE] Transcription: '{transcribed}'")

            if patient and transcribed:
                from app.services.ai_brain import process_message
                ai_result = await process_message(str(patient["_id"]), transcribed, "voice")
                ai_reply = ai_result.get("reply_to_patient", "")
                print(f"[VOICE] AI reply: {ai_reply[:100]}")
                if ai_reply:
                    response_text = ai_reply
        except Exception as e:
            print(f"[VOICE] Processing FAILED: {type(e).__name__}: {e}")
            traceback.print_exc()

    twiml_lang = "en-IN"
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="{VOICE}" language="{twiml_lang}">{response_text}</Say>
    <Pause length="1"/>
    <Say voice="{VOICE}" language="{twiml_lang}">Thank you for talking with Heal Hub. Get well soon. Goodbye!</Say>
</Response>"""

    print(f"[VOICE] Sending closing TwiML")
    return PlainTextResponse(twiml, media_type="text/xml")


@router.post("/status")
async def voice_status(request: Request):
    """Voice call status callback."""
    form = await request.form()
    status = form.get("CallStatus", "unknown")
    duration = form.get("CallDuration", "0")
    print(f"[VOICE] Call status: {status}, duration: {duration}s")
    return {"status": "ok"}
