import logging
import httpx
from app.config import get_settings
from app.database import patients_collection
from bson import ObjectId

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_twilio_client():
    from twilio.rest import Client
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)


async def send_message(phone: str, message: str):
    """Send a WhatsApp text message via Twilio."""
    try:
        client = _get_twilio_client()
        to_number = f"whatsapp:{phone}" if not phone.startswith("whatsapp:") else phone
        msg = client.messages.create(
            body=message,
            from_=settings.TWILIO_WHATSAPP_NUMBER,
            to=to_number,
        )
        logger.info(f"WhatsApp sent to {phone}: {msg.sid}")
        return msg.sid
    except Exception as e:
        logger.error(f"WhatsApp send failed to {phone}: {e}")
        raise


async def send_media(phone: str, media_url: str, caption: str = ""):
    """Send WhatsApp media message."""
    try:
        client = _get_twilio_client()
        to_number = f"whatsapp:{phone}" if not phone.startswith("whatsapp:") else phone
        msg = client.messages.create(
            body=caption,
            from_=settings.TWILIO_WHATSAPP_NUMBER,
            to=to_number,
            media_url=[media_url],
        )
        logger.info(f"WhatsApp media sent to {phone}: {msg.sid}")
        return msg.sid
    except Exception as e:
        logger.error(f"WhatsApp media send failed: {e}")
        raise


async def download_media(media_url: str) -> bytes:
    """Download media from Twilio URL."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            media_url,
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            follow_redirects=True,
        )
        return response.content


async def send_welcome_message(patient_id: str):
    """Send the onboarding welcome message with language selection to a new patient."""
    patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return

    from app.services.templates import get_template

    name = patient.get("name", "there")
    surgery_type = patient.get("surgery_type", "surgery")

    # Always send welcome in English first (language selection prompt)
    message = get_template("welcome", "en", name=name, surgery_type=surgery_type)
    await send_message(patient["phone"], message)


def format_checkin_message(patient: dict, day_number: int, questions: list) -> str:
    """Format a check-in message with questions."""
    from app.services.templates import get_template

    name = patient.get("name", "there")
    lang = patient.get("language_preference", "en")

    header = get_template("checkin_greeting", lang, name=name, day=day_number)
    q_text = "\n".join([f"• {q}" for q in questions])
    return f"{header}\n\n{q_text}"
