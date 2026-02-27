from fastapi import APIRouter, Depends
from app.database import checkins_collection
from app.routes.doctors import get_current_doctor
from app.utils.helpers import objectid_to_str

router = APIRouter()


@router.get("/{patient_id}")
async def get_checkins(patient_id: str, doctor=Depends(get_current_doctor)):
    checkins = []
    cursor = checkins_collection.find({"patient_id": patient_id}).sort("created_at", -1)
    async for doc in cursor:
        c = objectid_to_str(doc)
        c["id"] = c.pop("_id", "")
        checkins.append(c)
    return checkins


@router.get("/{checkin_id}/detail")
async def get_checkin_detail(checkin_id: str, doctor=Depends(get_current_doctor)):
    from bson import ObjectId
    doc = await checkins_collection.find_one({"_id": ObjectId(checkin_id)})
    if not doc:
        return {"error": "Check-in not found"}
    c = objectid_to_str(doc)
    c["id"] = c.pop("_id", "")
    return c
