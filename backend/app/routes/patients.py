from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from typing import Optional
from app.database import patients_collection, conversations_collection, checkins_collection
from app.models.patient import PatientCreate, PatientUpdate, PatientResponse
from app.routes.doctors import get_current_doctor
from app.utils.helpers import utc_now, objectid_to_str, days_since
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def format_patient(doc: dict) -> dict:
    p = objectid_to_str(doc)
    p["id"] = p.pop("_id", "")
    if doc.get("surgery_date"):
        p["days_since_surgery"] = days_since(doc["surgery_date"])
    else:
        p["days_since_surgery"] = 0
    return p


@router.get("")
async def list_patients(
    status: Optional[str] = None,
    search: Optional[str] = None,
    doctor=Depends(get_current_doctor),
):
    query = {"doctor_id": doctor["_id"], "is_active": True}
    if status and status != "all":
        query["current_status"] = status
    if search:
        query["name"] = {"$regex": search, "$options": "i"}

    cursor = patients_collection.find(query).sort("created_at", -1)
    patients = []
    async for doc in cursor:
        patients.append(format_patient(doc))
    return patients


@router.post("")
async def create_patient(data: PatientCreate, doctor=Depends(get_current_doctor)):
    doc = {
        **data.model_dump(),
        "doctor_id": doctor["_id"],
        "current_status": "green",
        "risk_score": 0,
        "is_active": True,
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    result = await patients_collection.insert_one(doc)
    patient_id = str(result.inserted_id)

    # Create conversation record
    await conversations_collection.insert_one({
        "patient_id": patient_id,
        "messages": [],
        "created_at": utc_now(),
        "updated_at": utc_now(),
    })

    # Send welcome WhatsApp message
    try:
        from app.services.whatsapp import send_welcome_message
        await send_welcome_message(patient_id)
    except Exception as e:
        logger.warning(f"Failed to send welcome message: {e}")

    # Schedule check-ins
    try:
        from app.services.scheduler import schedule_patient_checkins
        schedule_patient_checkins(patient_id, data.checkin_schedule.days, data.surgery_date)
    except Exception as e:
        logger.warning(f"Failed to schedule check-ins: {e}")

    doc["_id"] = result.inserted_id
    return format_patient(doc)


@router.get("/{patient_id}")
async def get_patient(patient_id: str, doctor=Depends(get_current_doctor)):
    patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    result = format_patient(patient)

    # Get recent check-ins
    checkins = []
    cursor = checkins_collection.find({"patient_id": patient_id}).sort("created_at", -1).limit(20)
    async for c in cursor:
        ci = objectid_to_str(c)
        ci["id"] = ci.pop("_id", "")
        checkins.append(ci)
    result["checkins"] = checkins

    # Get conversation
    conv = await conversations_collection.find_one({"patient_id": patient_id})
    if conv:
        result["conversations"] = objectid_to_str(conv).get("messages", [])
    else:
        result["conversations"] = []

    return result


@router.put("/{patient_id}")
async def update_patient(patient_id: str, data: PatientUpdate, doctor=Depends(get_current_doctor)):
    update_data = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = utc_now()
    result = await patients_collection.update_one(
        {"_id": ObjectId(patient_id)}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
    return format_patient(patient)


@router.delete("/{patient_id}")
async def delete_patient(patient_id: str, doctor=Depends(get_current_doctor)):
    result = await patients_collection.update_one(
        {"_id": ObjectId(patient_id)},
        {"$set": {"is_active": False, "updated_at": utc_now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"message": "Patient deactivated"}


@router.post("/{patient_id}/message")
async def send_message(patient_id: str, body: dict, doctor=Depends(get_current_doctor)):
    message = body.get("message", "")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    try:
        from app.services.whatsapp import send_message as wa_send
        await wa_send(patient["phone"], message)
    except Exception as e:
        logger.warning(f"WhatsApp send failed: {e}")

    # Save to conversation
    await conversations_collection.update_one(
        {"patient_id": patient_id},
        {
            "$push": {
                "messages": {
                    "role": "ai",
                    "content": message,
                    "content_type": "text",
                    "language": "en",
                    "timestamp": utc_now(),
                }
            },
            "$set": {"updated_at": utc_now()},
        },
    )
    return {"message": "Message sent"}


@router.post("/{patient_id}/call")
async def call_patient(patient_id: str, doctor=Depends(get_current_doctor)):
    patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    try:
        from app.services.voice_call import initiate_callback
        await initiate_callback(patient_id)
        return {"message": "Call initiated"}
    except Exception as e:
        logger.warning(f"Voice call failed: {e}")
        raise HTTPException(status_code=500, detail=f"Call failed: {str(e)}")
