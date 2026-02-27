"""
Conversation State Manager — tracks where each patient is in their journey.
States stored on the patient document in MongoDB, survives restarts.
"""
from enum import Enum
from datetime import datetime
from bson import ObjectId
from app.database import patients_collection


class ConversationState(str, Enum):
    # Onboarding
    NEW = "new"
    AWAITING_LANGUAGE = "awaiting_language"
    ONBOARDED = "onboarded"

    # Main states
    IDLE = "idle"
    IN_CONVERSATION = "in_conversation"

    # Structured check-in flow
    CHECKIN_PAIN = "checkin_pain"
    CHECKIN_SYMPTOMS = "checkin_symptoms"
    CHECKIN_MEDICINE = "checkin_medicine"
    CHECKIN_OPEN = "checkin_open"

    # Special states
    AWAITING_PHOTO = "awaiting_photo"
    DOCTOR_MODE = "doctor_mode"
    AWAITING_URGENCY = "awaiting_urgency"


def get_state(patient: dict) -> dict:
    """Read conversation state directly from patient document (no extra DB query)."""
    return {
        "state": patient.get("conversation_state", ConversationState.NEW),
        "language": patient.get("language_preference", "en"),
        "context": patient.get("agent_context", {}),
        "last_interaction": patient.get("last_interaction_at"),
    }


async def set_state(patient_id: str, state: str, context: dict = None):
    """Update conversation state and optional context on the patient document."""
    update: dict = {
        "conversation_state": state,
        "last_interaction_at": datetime.utcnow(),
    }
    if context is not None:
        update["agent_context"] = context
    await patients_collection.update_one(
        {"_id": ObjectId(patient_id)},
        {"$set": update},
    )


async def update_context(patient_id: str, new_data: dict):
    """Merge new data into existing agent_context without overwriting other keys."""
    patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
    existing = patient.get("agent_context", {}) if patient else {}
    existing.update(new_data)
    await patients_collection.update_one(
        {"_id": ObjectId(patient_id)},
        {"$set": {
            "agent_context": existing,
            "last_interaction_at": datetime.utcnow(),
        }},
    )
