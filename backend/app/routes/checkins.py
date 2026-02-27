from fastapi import APIRouter, Depends
from app.database import checkins_collection, patients_collection
from app.routes.doctors import require_roles
from app.utils.helpers import objectid_to_str
from bson import ObjectId

router = APIRouter()


@router.get("/{patient_id}")
async def get_checkins(patient_id: str, doctor=Depends(require_roles("doctor", "nurse"))):
    try:
        patient_obj_id = ObjectId(patient_id)
    except Exception:
        return []

    patient = await patients_collection.find_one({"_id": patient_obj_id, "doctor_id": doctor["_id"]})
    if not patient:
        return []

    checkins = []
    cursor = checkins_collection.find({"patient_id": patient_id}).sort("created_at", -1)
    async for doc in cursor:
        c = objectid_to_str(doc)
        c["id"] = c.pop("_id", "")
        checkins.append(c)
    return checkins


@router.get("/{checkin_id}/detail")
async def get_checkin_detail(checkin_id: str, doctor=Depends(require_roles("doctor", "nurse"))):
    try:
        oid = ObjectId(checkin_id)
    except Exception:
        return {"error": "Check-in not found"}

    doc = await checkins_collection.find_one({"_id": oid})
    if not doc:
        return {"error": "Check-in not found"}

    try:
        patient_oid = ObjectId(doc["patient_id"])
    except Exception:
        return {"error": "Check-in not found"}

    patient = await patients_collection.find_one({"_id": patient_oid, "doctor_id": doctor["_id"]})
    if not patient:
        return {"error": "Check-in not found"}

    c = objectid_to_str(doc)
    c["id"] = c.pop("_id", "")
    return c
