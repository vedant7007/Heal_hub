import logging
from bson import ObjectId
from app.config import get_settings
from app.database import patients_collection

logger = logging.getLogger(__name__)
settings = get_settings()


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

    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        call = client.calls.create(
            to=phone,
            from_=settings.TWILIO_PHONE_NUMBER,
            url=f"{settings.APP_URL}/api/webhook/voice",
            status_callback=f"{settings.APP_URL}/api/webhook/voice/status",
            status_callback_event=["completed"],
        )
        logger.info(f"Call initiated to {phone}: {call.sid}")
        return call.sid

    except Exception as e:
        logger.error(f"Voice call failed to {phone}: {e}")
        raise
