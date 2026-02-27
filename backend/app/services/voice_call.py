import logging
import httpx
from bson import ObjectId
from app.config import get_settings
from app.database import patients_collection

logger = logging.getLogger(__name__)
settings = get_settings()


async def _get_public_url() -> str:
    """Get the public ngrok URL if running, otherwise fall back to APP_URL."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get("http://127.0.0.1:4040/api/tunnels", timeout=2)
            tunnels = resp.json().get("tunnels", [])
            for t in tunnels:
                if t.get("public_url", "").startswith("https://"):
                    url = t["public_url"]
                    print(f"[VOICE_CALL] Using ngrok URL: {url}")
                    return url
    except Exception:
        pass
    print(f"[VOICE_CALL] ngrok not found, using APP_URL: {settings.APP_URL}")
    return settings.APP_URL


async def initiate_callback(patient_id: str):
    """Initiate a Twilio voice call to the patient."""
    patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        raise ValueError("Patient not found")

    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        raise ValueError("Twilio not configured")

    phone = patient["phone"]
    if not phone.startswith("+"):
        phone = f"+{phone}"

    public_url = await _get_public_url()

    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        print(f"[VOICE_CALL] Calling {phone} with TwiML at {public_url}/api/webhook/voice")
        call = client.calls.create(
            to=phone,
            from_=settings.TWILIO_PHONE_NUMBER,
            url=f"{public_url}/api/webhook/voice",
            status_callback=f"{public_url}/api/webhook/voice/status",
            status_callback_event=["completed"],
        )
        logger.info(f"Call initiated to {phone}: {call.sid}")
        print(f"[VOICE_CALL] Call SID: {call.sid}")
        return call.sid

    except Exception as e:
        logger.error(f"Voice call failed to {phone}: {e}")
        print(f"[VOICE_CALL] FAILED: {type(e).__name__}: {e}")
        raise
