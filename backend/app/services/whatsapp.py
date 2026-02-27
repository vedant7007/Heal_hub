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
    """Send first welcome WhatsApp message to a new patient."""
    patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return

    name = patient.get("name", "there")
    surgery = patient.get("surgery_type", "surgery")
    lang = patient.get("language_preference", "en")

    messages = {
        "en": (
            f"Hello {name}! 👋\n\n"
            f"I'm Heal Hub, your AI post-surgery care assistant. I'll be checking in on you "
            f"regularly after your {surgery} to make sure you're recovering well.\n\n"
            f"You can:\n"
            f"• Reply to my questions in text or voice\n"
            f"• Send me a photo of your wound for analysis\n"
            f"• Say 'call me' if you'd prefer a voice call\n"
            f"• Say 'my report' to see your recovery progress\n\n"
            f"I'm here 24/7. How are you feeling right now?"
        ),
        "hi": (
            f"Namaste {name}! 👋\n\n"
            f"Main Heal Hub hoon, aapka AI surgery care assistant. Aapki {surgery} ke baad main "
            f"regularly aapka haal puchungi.\n\n"
            f"Aap mujhe text ya voice note bhej sakte hain, wound ki photo bhej sakte hain, "
            f"ya 'call me' bol sakte hain.\n\n"
            f"Main 24/7 available hoon. Aap abhi kaisa feel kar rahe hain?"
        ),
        "te": (
            f"Namaskaram {name}! 👋\n\n"
            f"Nenu Heal Hub, mee AI surgery care assistant. Mee {surgery} tarvata nenu regularly "
            f"mee health check chestanu.\n\n"
            f"Meeru text, voice note, leda wound photo pampachu. 'call me' ante call chestanu.\n\n"
            f"Nenu 24/7 available. Meeru ippudu ela feel avutunnaru?"
        ),
    }

    message = messages.get(lang, messages["en"])
    await send_message(patient["phone"], message)


def format_checkin_message(patient: dict, day_number: int, questions: list) -> str:
    """Format a check-in message with questions."""
    name = patient.get("name", "there")
    lang = patient.get("language_preference", "en")

    greeting = {
        "en": f"Hi {name}! Day {day_number} check-in:",
        "hi": f"Namaste {name}! Din {day_number} check-in:",
        "te": f"Namaskaram {name}! Day {day_number} check-in:",
    }

    header = greeting.get(lang, greeting["en"])
    q_text = "\n".join([f"• {q}" for q in questions])
    return f"{header}\n\n{q_text}"
