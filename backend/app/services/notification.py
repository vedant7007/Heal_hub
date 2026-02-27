import logging
from bson import ObjectId
from app.config import get_settings
from app.database import doctors_collection, patients_collection

logger = logging.getLogger(__name__)
settings = get_settings()


async def notify_doctor(doctor_id: str, alert: dict):
    """Notify doctor via Socket.io + SMS."""
    # Socket notification
    try:
        from app.main import sio
        await sio.emit("new_alert", alert)
    except Exception as e:
        logger.warning(f"Socket notify failed: {e}")

    # SMS notification via Twilio
    try:
        doctor = await doctors_collection.find_one({"_id": ObjectId(doctor_id)})
        if doctor and doctor.get("phone"):
            from twilio.rest import Client
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            client.messages.create(
                body=f"[Heal Hub Alert] {alert.get('title', 'Patient alert')}: {alert.get('reasoning', '')[:100]}",
                from_=settings.TWILIO_PHONE_NUMBER,
                to=doctor["phone"],
            )
            logger.info(f"SMS sent to doctor {doctor_id}")
    except Exception as e:
        logger.error(f"Doctor SMS failed: {e}")


async def notify_family(patient_id: str, message: str):
    """Send WhatsApp notification to all family contacts."""
    patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return

    family = patient.get("family_contacts", [])
    for contact in family:
        phone = contact.get("phone")
        if phone:
            try:
                from app.services.whatsapp import send_message
                name = contact.get("name", "Family member")
                await send_message(phone, f"Dear {name},\n\n{message}")
            except Exception as e:
                logger.error(f"Family notification failed for {phone}: {e}")
