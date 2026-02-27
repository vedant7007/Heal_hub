import logging
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.cron import CronTrigger
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

scheduler = AsyncIOScheduler()


def start_scheduler():
    """Initialize and start the scheduler."""
    if not scheduler.running:
        scheduler.start()
        logger.info("APScheduler started")

    # Schedule medicine reminders at 9 AM, 2 PM, and 9 PM
    app_tz = ZoneInfo(settings.APP_TIMEZONE)
    for hour, label in [(9, "morning"), (14, "afternoon"), (21, "evening")]:
        job_id = f"medicine_reminder_{label}"
        try:
            scheduler.add_job(
                send_medicine_reminders,
                trigger=CronTrigger(hour=hour, minute=0, timezone=app_tz),
                id=job_id,
                replace_existing=True,
                args=[label],
            )
            logger.info(f"Medicine reminder scheduled: {label} at {hour}:00")
        except Exception as e:
            logger.error(f"Failed to schedule medicine reminder: {e}")


def schedule_patient_checkins(patient_id: str, days: list, surgery_date: datetime, schedule_time: str = "10:00"):
    """Schedule check-in jobs for a patient."""
    app_tz = ZoneInfo(settings.APP_TIMEZONE)
    hour, minute = 10, 0
    try:
        hour_str, minute_str = schedule_time.split(":")
        hour, minute = int(hour_str), int(minute_str)
    except Exception:
        logger.warning("Invalid schedule_time '%s', falling back to 10:00", schedule_time)

    if surgery_date.tzinfo is None:
        surgery_local = surgery_date.replace(tzinfo=app_tz)
    else:
        surgery_local = surgery_date.astimezone(app_tz)

    now_local = datetime.now(app_tz)

    for day in days:
        target_date = surgery_local.date() + timedelta(days=day)
        checkin_time = datetime.combine(target_date, time(hour=hour, minute=minute), tzinfo=app_tz)
        if checkin_time > now_local:
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
        if reminder_time > now_local:
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
    """Send a structured check-in message to a patient (multi-step flow)."""
    try:
        from app.database import patients_collection
        from app.services.whatsapp import send_message
        from app.services.templates import get_template
        from app.utils.helpers import utc_now
        from bson import ObjectId

        patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
        if not patient or not patient.get("is_active"):
            return

        lang = patient.get("language_preference", "en")
        name = patient.get("name", "there")

        # Set active check-in on patient (step 1 = pain question)
        active_checkin = {
            "step": 1,
            "day": day_number,
            "pain_answer": None,
            "symptom_answer": None,
            "medicine_answer": None,
            "started_at": utc_now(),
        }
        await patients_collection.update_one(
            {"_id": patient["_id"]},
            {"$set": {"active_checkin": active_checkin}}
        )

        # Send greeting + pain question
        greeting = get_template("checkin_greeting", lang, name=name, day=day_number)
        pain_q = get_template("pain_question", lang)
        message = f"{greeting}\n\n{pain_q}"
        await send_message(patient["phone"], message)
        logger.info(f"Structured check-in sent to {name} (day {day_number}, step 1)")

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
            from app.services.templates import get_template
            reminder_text = get_template("reminder", lang, name=patient["name"])
            await send_message(patient["phone"], reminder_text)
            logger.info(f"Reminder sent to {patient['name']}")

    except Exception as e:
        logger.error(f"Reminder failed: {e}")


async def send_medicine_reminders(time_of_day: str):
    """Send medicine reminders to all active patients who have medicines prescribed."""
    try:
        from app.database import patients_collection
        from app.services.whatsapp import send_message
        from app.services.templates import get_template

        cursor = patients_collection.find({
            "is_active": True,
            "medicines": {"$exists": True, "$ne": []},
        })

        count = 0
        async for patient in cursor:
            try:
                name = patient.get("name", "there")
                lang = patient.get("language_preference", "en")
                medicines = patient.get("medicines", [])

                if not medicines:
                    continue

                # Build medicine list text
                med_lines = []
                for i, med in enumerate(medicines, 1):
                    med_name = med.get("name", "Medicine")
                    dosage = med.get("dosage", "")
                    freq = med.get("frequency", "")
                    med_lines.append(f"  {i}. *{med_name}* — {dosage} ({freq})")

                medicine_list = "\n".join(med_lines)
                reminder = get_template("medicine_reminder", lang,
                                        name=name, medicine_list=medicine_list)
                await send_message(patient["phone"], reminder)
                count += 1

            except Exception as e:
                logger.error(f"Medicine reminder failed for {patient.get('name', '?')}: {e}")

        logger.info(f"Medicine reminders sent: {count} patients ({time_of_day})")

    except Exception as e:
        logger.error(f"Medicine reminder batch failed: {e}")
