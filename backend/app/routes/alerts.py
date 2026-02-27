from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from typing import Optional
from app.database import alerts_collection, patients_collection
from app.models.alert import AlertUpdate
from app.routes.doctors import get_current_doctor
from app.utils.helpers import utc_now, objectid_to_str

router = APIRouter()


async def enrich_alert(doc: dict) -> dict:
    a = objectid_to_str(doc)
    a["id"] = a.pop("_id", "")
    # attach patient name
    if doc.get("patient_id"):
        try:
            patient = await patients_collection.find_one({"_id": ObjectId(doc["patient_id"])})
            a["patient_name"] = patient["name"] if patient else "Unknown"
        except Exception:
            a["patient_name"] = "Unknown"
    return a


@router.get("")
async def get_alerts(
    status: Optional[str] = None,
    level: Optional[int] = None,
    doctor=Depends(get_current_doctor),
):
    query = {"doctor_id": doctor["_id"]}
    if status:
        query["status"] = status
    if level:
        query["level"] = level

    alerts = []
    cursor = alerts_collection.find(query).sort("created_at", -1)
    async for doc in cursor:
        alerts.append(await enrich_alert(doc))
    return alerts


@router.get("/active")
async def get_active_alerts(doctor=Depends(get_current_doctor)):
    query = {"doctor_id": doctor["_id"], "status": {"$in": ["new", "seen", "acknowledged"]}}
    alerts = []
    cursor = alerts_collection.find(query).sort("created_at", -1)
    async for doc in cursor:
        alerts.append(await enrich_alert(doc))
    return alerts


@router.get("/stats")
async def get_alert_stats(doctor=Depends(get_current_doctor)):
    pipeline = [
        {"$match": {"doctor_id": doctor["_id"]}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    stats = {}
    async for doc in alerts_collection.aggregate(pipeline):
        stats[doc["_id"]] = doc["count"]
    return stats


@router.put("/{alert_id}")
async def update_alert(alert_id: str, data: AlertUpdate, doctor=Depends(get_current_doctor)):
    update_data = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if data.status == "resolved":
        update_data["resolved_at"] = utc_now()

    result = await alerts_collection.update_one(
        {"_id": ObjectId(alert_id)}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")

    doc = await alerts_collection.find_one({"_id": ObjectId(alert_id)})
    return await enrich_alert(doc)
