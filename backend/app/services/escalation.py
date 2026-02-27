import logging
from bson import ObjectId
from app.database import alerts_collection, patients_collection
from app.utils.helpers import utc_now

logger = logging.getLogger(__name__)


async def evaluate_and_escalate(patient_id: str, checkin_data: dict):
    """Evaluate check-in data and trigger appropriate escalation."""
    assessment = checkin_data.get("ai_assessment", {})
    risk_level = assessment.get("risk_level", "green")
    escalation_level = checkin_data.get("escalation_level", 0)

    if risk_level == "green" and escalation_level == 0:
        return  # All good, no action needed

    patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return

    doctor_id = str(patient.get("doctor_id", ""))
    symptoms = checkin_data.get("symptoms_detected", [])
    reasoning = assessment.get("reasoning", "")

    if escalation_level >= 1 or risk_level == "yellow":
        # Level 1: Yellow alert
        await _create_alert(
            patient_id=patient_id,
            doctor_id=doctor_id,
            checkin_id=str(checkin_data.get("_id", "")),
            level=1,
            title=f"Mild concern for {patient['name']}",
            description=f"Patient showing symptoms that need monitoring: {', '.join(symptoms) or 'See reasoning'}",
            ai_reasoning=reasoning,
            symptoms=symptoms,
        )
        logger.info(f"Level 1 escalation for patient {patient_id}")

    if escalation_level >= 2 or risk_level == "red":
        # Level 2: Red alert — notify doctor
        await _create_alert(
            patient_id=patient_id,
            doctor_id=doctor_id,
            checkin_id=str(checkin_data.get("_id", "")),
            level=2,
            title=f"Serious concern for {patient['name']}",
            description=f"Patient requires immediate attention: {', '.join(symptoms) or 'See reasoning'}",
            ai_reasoning=reasoning,
            symptoms=symptoms,
        )

        # Notify doctor via SMS
        try:
            from app.services.notification import notify_doctor
            await notify_doctor(doctor_id, {
                "patient_name": patient["name"],
                "level": 2,
                "title": f"Serious concern for {patient['name']}",
                "reasoning": reasoning,
            })
        except Exception as e:
            logger.error(f"Doctor notification failed: {e}")

        # Notify family
        try:
            from app.services.notification import notify_family
            await notify_family(patient_id, f"Health update for {patient['name']}: Your doctor has been notified about recent symptoms. No need to panic, but please check in with them.")
        except Exception as e:
            logger.error(f"Family notification failed: {e}")

        logger.info(f"Level 2 escalation for patient {patient_id}")

    if escalation_level >= 3 or risk_level == "critical":
        # Level 3: Critical — callback + urgent alert
        await _create_alert(
            patient_id=patient_id,
            doctor_id=doctor_id,
            checkin_id=str(checkin_data.get("_id", "")),
            level=3,
            title=f"CRITICAL: {patient['name']} needs urgent attention",
            description=f"Emergency situation detected: {', '.join(symptoms) or 'See reasoning'}",
            ai_reasoning=reasoning,
            symptoms=symptoms,
        )

        # Trigger callback
        try:
            from app.services.voice_call import initiate_callback
            await initiate_callback(patient_id)
        except Exception as e:
            logger.error(f"Emergency callback failed: {e}")

        # Socket notification
        try:
            from app.main import sio
            await sio.emit("new_alert", {
                "patient_id": patient_id,
                "patient_name": patient["name"],
                "level": 3,
                "title": f"CRITICAL ALERT: {patient['name']}",
                "timestamp": utc_now().isoformat(),
            })
        except Exception as e:
            logger.warning(f"Socket emit failed: {e}")

        logger.info(f"Level 3 CRITICAL escalation for patient {patient_id}")


async def _create_alert(
    patient_id: str,
    doctor_id: str,
    checkin_id: str,
    level: int,
    title: str,
    description: str,
    ai_reasoning: str,
    symptoms: list,
):
    alert_doc = {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "checkin_id": checkin_id,
        "level": level,
        "title": title,
        "description": description,
        "ai_reasoning": ai_reasoning,
        "symptoms": symptoms,
        "status": "new",
        "resolved_at": None,
        "created_at": utc_now(),
    }
    await alerts_collection.insert_one(alert_doc)
