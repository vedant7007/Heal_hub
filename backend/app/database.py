from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings

settings = get_settings()

client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
db = client.get_default_database("healhub")

# Collections
patients_collection = db["patients"]
doctors_collection = db["doctors"]
checkins_collection = db["checkins"]
alerts_collection = db["alerts"]
conversations_collection = db["conversations"]
call_sessions_collection = db["call_sessions"]
appointments_collection = db["appointments"]


async def ping_db():
    try:
        await client.admin.command("ping")
        return True
    except Exception:
        return False


async def ensure_indexes():
    await doctors_collection.create_index("email", unique=True, name="uniq_doctor_email")
    await patients_collection.create_index(
        [("doctor_id", 1), ("is_active", 1), ("created_at", -1)],
        name="patients_doctor_active_created",
    )
    await patients_collection.create_index([("phone", 1)], name="patients_phone")
    await checkins_collection.create_index(
        [("patient_id", 1), ("created_at", -1)],
        name="checkins_patient_created",
    )
    await checkins_collection.create_index(
        [("doctor_id", 1), ("created_at", -1)],
        name="checkins_doctor_created",
    )
    await alerts_collection.create_index(
        [("doctor_id", 1), ("status", 1), ("created_at", -1)],
        name="alerts_doctor_status_created",
    )
    await alerts_collection.create_index(
        [("patient_id", 1), ("created_at", -1)],
        name="alerts_patient_created",
    )
    await conversations_collection.create_index(
        [("patient_id", 1)],
        unique=True,
        name="uniq_conversation_patient",
    )
    await call_sessions_collection.create_index(
        [("call_sid", 1)],
        unique=True,
        name="uniq_callsid",
    )
    await call_sessions_collection.create_index(
        [("updated_at", 1)],
        expireAfterSeconds=60 * 60 * 24,
        name="call_sessions_ttl_updated_at_24h",
    )
    await appointments_collection.create_index(
        [("doctor_id", 1), ("scheduled_at", 1)],
        name="appointments_doctor_scheduled",
    )
