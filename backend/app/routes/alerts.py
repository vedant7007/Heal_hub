from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from typing import Optional
from app.database import alerts_collection, patients_collection
from app.models.alert import AlertUpdate
from app.routes.doctors import require_roles
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
    doctor=Depends(require_roles("doctor", "nurse")),
):
    role = doctor.get("role", "doctor")
    query = {} if role == "nurse" else {"doctor_id": doctor["_id"]}
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
async def get_active_alerts(doctor=Depends(require_roles("doctor", "nurse"))):
    role = doctor.get("role", "doctor")
    base = {} if role == "nurse" else {"doctor_id": doctor["_id"]}
    query = {**base, "status": {"$in": ["new", "seen", "acknowledged"]}}
    alerts = []
    cursor = alerts_collection.find(query).sort("created_at", -1)
    async for doc in cursor:
        alerts.append(await enrich_alert(doc))
    return alerts


@router.get("/stats")
async def get_alert_stats(doctor=Depends(require_roles("doctor", "nurse"))):
    role = doctor.get("role", "doctor")
    match_filter = {} if role == "nurse" else {"doctor_id": doctor["_id"]}
    pipeline = [
        {"$match": match_filter},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    stats = {}
    async for doc in alerts_collection.aggregate(pipeline):
        stats[doc["_id"]] = doc["count"]
    return stats


@router.put("/{alert_id}")
async def update_alert(alert_id: str, data: AlertUpdate, doctor=Depends(require_roles("doctor", "nurse"))):
    try:
        oid = ObjectId(alert_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Alert not found")

    role = doctor.get("role", "doctor")
    update_data = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if data.status == "resolved":
        update_data["resolved_at"] = utc_now()

    query = {"_id": oid} if role == "nurse" else {"_id": oid, "doctor_id": doctor["_id"]}
    result = await alerts_collection.update_one(query, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")

    doc = await alerts_collection.find_one({"_id": oid})
    enriched = await enrich_alert(doc)

    # Emit socket event so all connected clients update in real time
    try:
        from app.main import sio
        await sio.emit("alert_updated", {
            "alert_id": alert_id,
            "status": data.status,
        })
    except Exception:
        pass

    return enriched


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str, doctor=Depends(require_roles("doctor", "nurse"))):
    try:
        oid = ObjectId(alert_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Alert not found")

    role = doctor.get("role", "doctor")
    query = {"_id": oid} if role == "nurse" else {"_id": oid, "doctor_id": doctor["_id"]}
    result = await alerts_collection.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")

    try:
        from app.main import sio
        await sio.emit("alert_updated", {"alert_id": alert_id, "status": "deleted"})
    except Exception:
        pass

    return {"message": "Alert deleted"}
