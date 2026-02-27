from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings

settings = get_settings()

client = AsyncIOMotorClient(settings.MONGODB_URI)
db = client.get_default_database("healhub")

# Collections
patients_collection = db["patients"]
doctors_collection = db["doctors"]
checkins_collection = db["checkins"]
alerts_collection = db["alerts"]
conversations_collection = db["conversations"]
appointments_collection = db["appointments"]


async def ping_db():
    try:
        await client.admin.command("ping")
        return True
    except Exception:
        return False
