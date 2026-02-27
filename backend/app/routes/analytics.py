from fastapi import APIRouter, Depends
from app.database import patients_collection, checkins_collection, alerts_collection
from app.routes.doctors import get_current_doctor
from app.utils.helpers import utc_now
from datetime import timedelta

router = APIRouter()


@router.get("/overview")
async def get_overview(doctor=Depends(get_current_doctor)):
    doctor_id = doctor["_id"]

    total_patients = await patients_collection.count_documents({"doctor_id": doctor_id, "is_active": True})
    active_alerts = await alerts_collection.count_documents(
        {"doctor_id": doctor_id, "status": {"$in": ["new", "seen", "acknowledged"]}}
    )

    # Average recovery score
    pipeline = [
        {"$match": {"doctor_id": doctor_id, "is_active": True}},
        {"$group": {"_id": None, "avg_score": {"$avg": "$risk_score"}}},
    ]
    avg_score = 0
    async for doc in patients_collection.aggregate(pipeline):
        avg_score = round(100 - (doc.get("avg_score", 0) or 0))

    # Check-ins today
    now = utc_now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    checkins_today = await checkins_collection.count_documents(
        {"created_at": {"$gte": today_start}}
    )

    # Status distribution
    status_pipeline = [
        {"$match": {"doctor_id": doctor_id, "is_active": True}},
        {"$group": {"_id": "$current_status", "count": {"$sum": 1}}},
    ]
    status_dist = {}
    async for doc in patients_collection.aggregate(status_pipeline):
        status_dist[doc["_id"]] = doc["count"]

    return {
        "total_patients": total_patients,
        "active_alerts": active_alerts,
        "avg_recovery_score": avg_score,
        "checkins_today": checkins_today,
        "status_distribution": status_dist,
    }


@router.get("/recovery-trends")
async def get_recovery_trends(doctor=Depends(get_current_doctor)):
    pipeline = [
        {"$match": {"doctor_id": doctor["_id"], "is_active": True}},
        {
            "$group": {
                "_id": "$surgery_type",
                "avg_risk": {"$avg": "$risk_score"},
                "count": {"$sum": 1},
            }
        },
    ]
    trends = []
    async for doc in patients_collection.aggregate(pipeline):
        trends.append({
            "surgery_type": doc["_id"],
            "avg_recovery_score": round(100 - (doc.get("avg_risk", 0) or 0)),
            "patient_count": doc["count"],
        })
    return trends


@router.get("/complications")
async def get_complications(doctor=Depends(get_current_doctor)):
    # Get symptom frequencies from check-ins
    pipeline = [
        {"$unwind": "$symptoms_detected"},
        {"$group": {"_id": "$symptoms_detected", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    complications = []
    async for doc in checkins_collection.aggregate(pipeline):
        complications.append({"symptom": doc["_id"], "count": doc["count"]})
    return complications


@router.get("/response-rates")
async def get_response_rates(doctor=Depends(get_current_doctor)):
    # Simplified: total check-ins grouped by type
    pipeline = [
        {"$group": {"_id": "$type", "count": {"$sum": 1}}},
    ]
    rates = {}
    async for doc in checkins_collection.aggregate(pipeline):
        rates[doc["_id"]] = doc["count"]
    return rates
