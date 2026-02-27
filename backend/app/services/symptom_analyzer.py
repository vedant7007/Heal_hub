import logging
from bson import ObjectId
from app.database import checkins_collection, patients_collection
from app.utils.helpers import days_since

logger = logging.getLogger(__name__)

DANGER_SYMPTOMS = {"bleeding", "blood", "fever", "infection", "pus", "discharge"}
CONCERN_SYMPTOMS = {"swelling", "redness", "warmth", "pain", "nausea", "vomiting"}


async def analyze_trends(patient_id: str) -> dict:
    """Analyze symptom trends across all check-ins."""
    checkins = []
    cursor = checkins_collection.find({"patient_id": patient_id}).sort("created_at", 1)
    async for c in cursor:
        checkins.append(c)

    if not checkins:
        return {"trend": "no_data", "concerns": [], "score": 0}

    pain_scores = [c.get("pain_score") for c in checkins if c.get("pain_score") is not None]
    all_symptoms = []
    for c in checkins:
        all_symptoms.extend(c.get("symptoms_detected", []))

    concerns = []

    # Check for escalating pain
    if len(pain_scores) >= 3:
        recent = pain_scores[-3:]
        if all(recent[i] < recent[i + 1] for i in range(len(recent) - 1)):
            concerns.append("Pain is increasing over consecutive check-ins")

    # Check for danger symptoms
    symptom_set = set(s.lower() for s in all_symptoms)
    found_danger = symptom_set & DANGER_SYMPTOMS
    if found_danger:
        concerns.append(f"Danger symptoms detected: {', '.join(found_danger)}")

    # Check for fever after day 3
    patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
    if patient and patient.get("surgery_date"):
        day_num = days_since(patient["surgery_date"])
        if day_num > 3 and "fever" in symptom_set:
            concerns.append("Fever detected after day 3 post-surgery — possible infection")

    # No response check
    if len(checkins) >= 2:
        last_two_types = [c.get("type") for c in checkins[-2:]]
        if all(t == "scheduled" for t in last_two_types):
            last_responses = [c.get("responses", []) for c in checkins[-2:]]
            if all(len(r) == 0 for r in last_responses):
                concerns.append("No response for 2+ scheduled check-ins")

    trend = "stable"
    if len(concerns) >= 2:
        trend = "worsening"
    elif len(concerns) == 1:
        trend = "concerning"

    return {"trend": trend, "concerns": concerns, "pain_history": pain_scores}


async def get_recovery_score(patient_id: str) -> int:
    """Calculate overall recovery score 0-100 (100 = fully recovered)."""
    patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return 50

    score = 70  # Base score

    status = patient.get("current_status", "green")
    status_mod = {"green": 20, "yellow": 0, "red": -20, "critical": -40}
    score += status_mod.get(status, 0)

    # Get latest check-in
    latest = await checkins_collection.find_one(
        {"patient_id": patient_id}, sort=[("created_at", -1)]
    )
    if latest:
        pain = latest.get("pain_score")
        if pain is not None:
            score -= max(0, (pain - 3) * 3)  # Penalty for pain above 3

        symptoms = latest.get("symptoms_detected", [])
        score -= len(symptoms) * 5

    # Days factor — more days = generally better
    if patient.get("surgery_date"):
        days = days_since(patient["surgery_date"])
        if days > 14 and status == "green":
            score += 10

    return max(0, min(100, score))
