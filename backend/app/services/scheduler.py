import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def start_scheduler():
    """Initialize and start the scheduler."""
    if not scheduler.running:
        scheduler.start()
        logger.info("APScheduler started")


def schedule_patient_checkins(patient_id: str, days: list, surgery_date: datetime):
    """Schedule check-in jobs for a patient."""
    for day in days:
        checkin_time = surgery_date + timedelta(days=day, hours=10)  # 10 AM IST
        if checkin_time > datetime.utcnow():
            job_id = f"checkin_{patient_id}_day{day}"
            try:
                scheduler.add_job(
                    send_scheduled_checkin,
                    trigger=DateTrigger(run_date=checkin_time),
                    id=job_id,
                    replace_existing=True,
                    args=[patient_id, day],
                )
                logger.info(f"Scheduled check-in for patient {patient_id} day {day}")
            except Exception as e:
                logger.error(f"Failed to schedule check-in: {e}")

        # Also schedule a 4-hour reminder
        reminder_time = checkin_time + timedelta(hours=4)
        if reminder_time > datetime.utcnow():
            reminder_id = f"reminder_{patient_id}_day{day}"
            try:
                scheduler.add_job(
                    send_reminder,
                    trigger=DateTrigger(run_date=reminder_time),
                    id=reminder_id,
                    replace_existing=True,
                    args=[patient_id, day],
                )
            except Exception as e:
                logger.error(f"Failed to schedule reminder: {e}")


async def send_scheduled_checkin(patient_id: str, day_number: int):
    """Send a scheduled check-in message to a patient."""
    try:
        from app.database import patients_collection
        from app.services.ai_brain import generate_checkin_questions
        from app.services.whatsapp import send_message, format_checkin_message
        from bson import ObjectId

        patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
        if not patient or not patient.get("is_active"):
            return

        questions = await generate_checkin_questions(patient_id, day_number)
        message = format_checkin_message(patient, day_number, questions)
        await send_message(patient["phone"], message)
        logger.info(f"Scheduled check-in sent to {patient['name']} (day {day_number})")

    except Exception as e:
        logger.error(f"Scheduled check-in failed: {e}")


async def send_reminder(patient_id: str, day_number: int):
    """Send a reminder if patient hasn't responded."""
    try:
        from app.database import patients_collection, checkins_collection
        from app.services.whatsapp import send_message
        from bson import ObjectId
        from datetime import datetime, timedelta

        patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
        if not patient or not patient.get("is_active"):
            return

        # Check if they already responded today
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        recent = await checkins_collection.find_one({
            "patient_id": patient_id,
            "created_at": {"$gte": today},
        })

        if not recent:
            lang = patient.get("language_preference", "en")
            reminders = {
                "en": f"Hi {patient['name']}, just a gentle reminder to complete your check-in. How are you feeling today?",
                "hi": f"Namaste {patient['name']}, aapka check-in abhi baki hai. Aap kaisa feel kar rahe hain?",
                "te": f"Namaskaram {patient['name']}, mee check-in pending undi. Meeru ela feel avutunnaru?",
            }
            await send_message(patient["phone"], reminders.get(lang, reminders["en"]))
            logger.info(f"Reminder sent to {patient['name']}")

    except Exception as e:
        logger.error(f"Reminder failed: {e}")
