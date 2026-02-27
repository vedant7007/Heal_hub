from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("")
async def voice_webhook(request: Request):
    """Handle incoming voice call — greet and ask first question."""
    form = await request.form()
    patient_phone = form.get("To", "")

    from app.database import patients_collection
    phone_clean = patient_phone.replace("+", "")
    patient = await patients_collection.find_one({"phone": {"$regex": phone_clean[-10:]}})

    name = patient["name"] if patient else "there"
    lang = patient.get("language_preference", "en") if patient else "en"

    greetings = {
        "en": f"Hello {name}, this is Heal Hub, your post-surgery care assistant. How are you feeling today? Please describe any symptoms after the beep.",
        "hi": f"Namaste {name}, yeh Heal Hub hai, aapka surgery ke baad dekhbhal assistant. Aap aaj kaisa mehsoos kar rahe hain? Beep ke baad apne symptoms batayein.",
        "te": f"Namaskaram {name}, idi Heal Hub, mee surgery tarvata care assistant. Meeru eeroju ela feel avutunnaru? Beep tarvata mee symptoms cheppandi.",
    }

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="{"en-IN" if lang == "en" else "hi-IN" if lang == "hi" else "en-IN"}">{greetings.get(lang, greetings["en"])}</Say>
    <Record maxLength="30" action="/api/webhook/voice/gather" transcribe="false" />
    <Say voice="alice">We did not receive your response. We will try again later. Get well soon!</Say>
</Response>"""
    return PlainTextResponse(twiml, media_type="text/xml")


@router.post("/gather")
async def voice_gather(request: Request):
    """Process recorded voice response from patient."""
    form = await request.form()
    recording_url = form.get("RecordingUrl", "")
    caller = form.get("From", "")

    logger.info(f"Voice recording from {caller}: {recording_url}")

    # Process the recording
    response_text = "Thank you for your response. Your doctor has been notified. Take care!"

    if recording_url:
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                resp = await client.get(recording_url + ".wav")
                audio_bytes = resp.content

            from app.services.speech import speech_to_text
            transcribed = await speech_to_text(audio_bytes, "en")
            logger.info(f"Voice transcription: {transcribed}")

            # Process with AI
            phone_clean = caller.replace("+", "")
            from app.database import patients_collection
            patient = await patients_collection.find_one({"phone": {"$regex": phone_clean[-10:]}})
            if patient:
                from app.services.ai_brain import process_message
                ai_result = await process_message(str(patient["_id"]), transcribed, "voice")
                response_text = ai_result.get("reply_to_patient", response_text)
        except Exception as e:
            logger.error(f"Voice processing error: {e}")

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">{response_text}</Say>
    <Say voice="alice">Thank you for talking with Heal Hub. Get well soon. Goodbye!</Say>
</Response>"""
    return PlainTextResponse(twiml, media_type="text/xml")


@router.post("/status")
async def voice_status(request: Request):
    """Voice call status callback."""
    form = await request.form()
    logger.info(f"Call status: {form.get('CallStatus', 'unknown')}")
    return {"status": "ok"}
