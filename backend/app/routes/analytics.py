from fastapi import APIRouter, Depends
from app.database import patients_collection, checkins_collection, alerts_collection
from app.routes.doctors import require_roles
from app.utils.helpers import utc_now

router = APIRouter()


def _patient_filter(doctor: dict) -> dict:
    """Return a Mongo filter for patients — nurses see all, doctors see their own."""
    if doctor.get("role") == "nurse":
        return {"is_active": True}
    return {"doctor_id": doctor["_id"], "is_active": True}


def _alert_filter(doctor: dict) -> dict:
    if doctor.get("role") == "nurse":
        return {}
    return {"doctor_id": doctor["_id"]}


def _checkin_lookup_match(doctor: dict) -> dict:
    """Build $match expression inside the checkins→patients $lookup pipeline."""
    if doctor.get("role") == "nurse":
        return {"$expr": {"$eq": [{"$toString": "$_id"}, "$$pid"]}}
    return {
        "$expr": {
            "$and": [
                {"$eq": [{"$toString": "$_id"}, "$$pid"]},
                {"$eq": ["$doctor_id", doctor["_id"]]},
            ]
        }
    }


@router.get("/overview")
async def get_overview(doctor=Depends(require_roles("doctor", "nurse"))):
    pf = _patient_filter(doctor)
    af = _alert_filter(doctor)

    total_patients = await patients_collection.count_documents(pf)
    active_alerts = await alerts_collection.count_documents(
        {**af, "status": {"$in": ["new", "seen", "acknowledged"]}}
    )

    # Average recovery score
    pipeline = [
        {"$match": pf},
        {"$group": {"_id": None, "avg_score": {"$avg": "$risk_score"}}},
    ]
    avg_score = 0
    async for doc in patients_collection.aggregate(pipeline):
        avg_score = round(100 - (doc.get("avg_score", 0) or 0))

    # Check-ins today
    now = utc_now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    checkins_today_pipeline = [
        {"$match": {"created_at": {"$gte": today_start}}},
        {
            "$lookup": {
                "from": "patients",
                "let": {"pid": "$patient_id"},
                "pipeline": [
                    {"$match": _checkin_lookup_match(doctor)},
                    {"$project": {"_id": 1}},
                ],
                "as": "patient",
            }
        },
        {"$match": {"patient.0": {"$exists": True}}},
        {"$count": "count"},
    ]
    checkins_today = 0
    checkins_today_docs = await checkins_collection.aggregate(checkins_today_pipeline).to_list(length=1)
    if checkins_today_docs:
        checkins_today = checkins_today_docs[0]["count"]

    # Status distribution
    status_pipeline = [
        {"$match": pf},
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
async def get_recovery_trends(doctor=Depends(require_roles("doctor", "nurse"))):
    pipeline = [
        {"$match": _patient_filter(doctor)},
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
async def get_complications(doctor=Depends(require_roles("doctor", "nurse"))):
    pipeline = [
        {
            "$lookup": {
                "from": "patients",
                "let": {"pid": "$patient_id"},
                "pipeline": [
                    {"$match": _checkin_lookup_match(doctor)},
                    {"$project": {"_id": 1}},
                ],
                "as": "patient",
            }
        },
        {"$match": {"patient.0": {"$exists": True}}},
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
async def get_response_rates(doctor=Depends(require_roles("doctor", "nurse"))):
    pipeline = [
        {
            "$lookup": {
                "from": "patients",
                "let": {"pid": "$patient_id"},
                "pipeline": [
                    {"$match": _checkin_lookup_match(doctor)},
                    {"$project": {"_id": 1}},
                ],
                "as": "patient",
            }
        },
        {"$match": {"patient.0": {"$exists": True}}},
        {"$group": {"_id": "$type", "count": {"$sum": 1}}},
    ]
    rates = {}
    async for doc in checkins_collection.aggregate(pipeline):
        rates[doc["_id"]] = doc["count"]
    return rates
