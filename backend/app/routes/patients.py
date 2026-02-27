from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from typing import Optional
from app.database import patients_collection, conversations_collection, checkins_collection
from app.models.patient import PatientCreate, PatientUpdate, PatientResponse
from app.routes.doctors import get_current_doctor, require_roles
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


def _owned_patient_filter(patient_id: str, doctor_id: str, role: str = "doctor") -> dict:
    try:
        oid = ObjectId(patient_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid patient id")
    # Nurses can access any patient
    if role == "nurse":
        return {"_id": oid}
    return {"_id": oid, "doctor_id": doctor_id}


@router.get("")
async def list_patients(
    status: Optional[str] = None,
    search: Optional[str] = None,
    doctor=Depends(get_current_doctor),
):
    role = doctor.get("role", "doctor")
    # Nurses see ALL patients across all doctors
    if role == "nurse":
        query = {"is_active": True}
    else:
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
async def create_patient(data: PatientCreate, doctor=Depends(require_roles("doctor"))):
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
        schedule_patient_checkins(
            patient_id,
            data.checkin_schedule.days,
            data.surgery_date,
            data.checkin_schedule.time,
        )
    except Exception as e:
        logger.warning(f"Failed to schedule check-ins: {e}")

    doc["_id"] = result.inserted_id
    return format_patient(doc)


@router.get("/{patient_id}")
async def get_patient(patient_id: str, doctor=Depends(get_current_doctor)):
    patient = await patients_collection.find_one(_owned_patient_filter(patient_id, doctor["_id"], doctor.get("role", "doctor")))
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
async def update_patient(patient_id: str, data: PatientUpdate, doctor=Depends(require_roles("doctor"))):
    update_data = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = utc_now()
    result = await patients_collection.update_one(
        _owned_patient_filter(patient_id, doctor["_id"], doctor.get("role", "doctor")), {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient = await patients_collection.find_one(_owned_patient_filter(patient_id, doctor["_id"], doctor.get("role", "doctor")))
    return format_patient(patient)


@router.delete("/{patient_id}")
async def delete_patient(patient_id: str, doctor=Depends(require_roles("doctor"))):
    result = await patients_collection.update_one(
        _owned_patient_filter(patient_id, doctor["_id"], doctor.get("role", "doctor")),
        {"$set": {"is_active": False, "updated_at": utc_now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"message": "Patient deactivated"}


@router.post("/{patient_id}/message")
async def send_message(patient_id: str, body: dict, doctor=Depends(require_roles("doctor", "nurse"))):
    message = body.get("message", "")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    patient = await patients_collection.find_one(_owned_patient_filter(patient_id, doctor["_id"], doctor.get("role", "doctor")))
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
async def call_patient(patient_id: str, doctor=Depends(require_roles("doctor"))):
    patient = await patients_collection.find_one(_owned_patient_filter(patient_id, doctor["_id"], doctor.get("role", "doctor")))
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    try:
        from app.services.voice_call import initiate_callback
        await initiate_callback(patient_id)
        return {"message": "Call initiated"}
    except Exception as e:
        logger.warning(f"Voice call failed: {e}")
        raise HTTPException(status_code=500, detail=f"Call failed: {str(e)}")


@router.post("/{patient_id}/handoff")
async def toggle_handoff(patient_id: str, body: dict, doctor=Depends(require_roles("doctor"))):
    """Toggle between AI mode and doctor mode for a patient's conversation."""
    mode = body.get("mode", "ai")
    if mode not in ("ai", "doctor"):
        raise HTTPException(status_code=400, detail="Mode must be 'ai' or 'doctor'")

    result = await patients_collection.update_one(
        _owned_patient_filter(patient_id, doctor["_id"], doctor.get("role", "doctor")),
        {"$set": {"mode": mode, "updated_at": utc_now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")

    logger.info(f"Patient {patient_id} handoff mode set to: {mode}")
    return {"message": f"Mode set to {mode}", "mode": mode}


@router.post("/{patient_id}/reply")
async def doctor_reply(patient_id: str, body: dict, doctor=Depends(require_roles("doctor", "nurse"))):
    """Send a doctor's reply to the patient via WhatsApp, translated to patient's language."""
    message = body.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    patient = await patients_collection.find_one(_owned_patient_filter(patient_id, doctor["_id"], doctor.get("role", "doctor")))
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    doctor_name = doctor.get("name", "Your Doctor")
    lang = patient.get("language_preference", "en")

    # Translate doctor's message to patient's language
    translated_message = message
    if lang != "en":
        try:
            from app.services.translator import translate
            translated_message = translate(message, "en", lang)
        except Exception as e:
            logger.warning(f"Translation failed, sending in English: {e}")
            translated_message = message

    # Avoid "Dr. Dr." if name already starts with "Dr."
    display_name = doctor_name if doctor_name.lower().startswith("dr") else f"Dr. {doctor_name}"
    wa_message = f"👨‍⚕️ {display_name}:\n{translated_message}"

    try:
        from app.services.whatsapp import send_message as wa_send
        await wa_send(patient["phone"], wa_message)
    except Exception as e:
        logger.warning(f"WhatsApp doctor reply failed: {e}")

    # Save original English in DB for doctor's reference
    conv_entry = {
        "role": "doctor",
        "content": message,
        "content_type": "text",
        "language": "en",
        "timestamp": utc_now(),
    }
    if lang != "en":
        conv_entry["translated"] = translated_message
        conv_entry["translated_language"] = lang

    await conversations_collection.update_one(
        {"patient_id": patient_id},
        {
            "$push": {"messages": conv_entry},
            "$set": {"updated_at": utc_now()},
        },
    )

    try:
        from app.main import sio
        await sio.emit("new_message", {
            "patient_id": patient_id,
            "doctor_name": doctor_name,
            "content": message,
            "role": "doctor",
            "timestamp": utc_now().isoformat(),
        })
    except Exception:
        pass

    return {"message": "Reply sent"}


@router.post("/{patient_id}/ai-report")
async def generate_ai_report(patient_id: str, body: dict, doctor=Depends(require_roles("doctor", "nurse"))):
    """Generate an AI summary report of the patient's conversations in any language."""
    target_lang = body.get("language", "en")

    patient = await patients_collection.find_one(_owned_patient_filter(patient_id, doctor["_id"], doctor.get("role", "doctor")))
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    conv = await conversations_collection.find_one({"patient_id": patient_id})
    messages = conv.get("messages", []) if conv else []

    # Get recent check-ins
    recent_checkins = []
    cursor = checkins_collection.find({"patient_id": patient_id}).sort("created_at", -1).limit(10)
    async for c in cursor:
        recent_checkins.append(c)

    # Build conversation summary for AI
    convo_text = ""
    for m in messages[-30:]:  # Last 30 messages
        role = m.get("role", "unknown")
        content = m.get("content", "")
        convo_text += f"[{role}]: {content}\n"

    checkin_text = ""
    for c in recent_checkins:
        pain = c.get("pain_score", "N/A")
        symptoms = ", ".join(c.get("symptoms_detected", [])) or "none"
        assessment = c.get("ai_assessment", {}).get("reasoning", "")
        checkin_text += f"Day {c.get('day_number', '?')}: Pain {pain}/10, Symptoms: {symptoms}. AI: {assessment}\n"

    lang_names = {"en": "English", "hi": "Hindi", "te": "Telugu", "es": "Spanish", "fr": "French", "de": "German"}
    lang_name = lang_names.get(target_lang, target_lang)

    prompt = f"""You are a medical AI assistant. Generate a comprehensive patient report for the doctor.

Patient: {patient.get("name")}
Age: {patient.get("age")} | Gender: {patient.get("gender")}
Surgery: {patient.get("surgery_type")}
Days since surgery: {(utc_now() - patient["surgery_date"]).days if patient.get("surgery_date") else "unknown"}
Current status: {patient.get("current_status", "unknown")}

Recent Check-ins:
{checkin_text or "No check-ins yet."}

Recent Conversations:
{convo_text or "No conversations yet."}

Generate the report in {lang_name}. Include:
1. Overall recovery summary
2. Pain trend analysis
3. Key symptoms and concerns
4. Medicine adherence observations
5. Risk assessment
6. Recommendations for the doctor

Keep it concise but thorough. Use medical terminology appropriately."""

    try:
        import anthropic
        from app.config import get_settings
        settings = get_settings()
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model="claude-haiku-4-5-20241022",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        report = response.content[0].text
    except Exception as e:
        logger.error(f"AI report generation failed: {e}")
        report = f"Report generation failed: {str(e)}. Please try again."

    return {"report": report, "language": target_lang, "patient_name": patient.get("name")}


@router.post("/{patient_id}/send-medicine-reminder")
async def send_medicine_reminder(patient_id: str, doctor=Depends(require_roles("doctor", "nurse"))):
    """Manually send a medicine reminder to a patient via WhatsApp."""
    patient = await patients_collection.find_one(_owned_patient_filter(patient_id, doctor["_id"], doctor.get("role", "doctor")))
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    medicines = patient.get("medicines", [])
    name = patient.get("name", "there")
    lang = patient.get("language_preference", "en")

    if not medicines:
        raise HTTPException(status_code=400, detail="No medicines prescribed for this patient")

    # Build medicine list
    med_lines = []
    for i, med in enumerate(medicines, 1):
        med_name = med.get("name", "Medicine")
        dosage = med.get("dosage", "")
        freq = med.get("frequency", "")
        med_lines.append(f"  {i}. *{med_name}* — {dosage} ({freq})")
    medicine_list = "\n".join(med_lines)

    from app.services.templates import get_template
    reminder = get_template("medicine_reminder", lang, name=name, medicine_list=medicine_list)

    try:
        from app.services.whatsapp import send_message as wa_send
        await wa_send(patient["phone"], reminder)
    except Exception as e:
        logger.error(f"Medicine reminder send failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send: {str(e)}")

    # Mark that a reminder was sent
    await patients_collection.update_one(
        {"_id": patient["_id"]},
        {"$set": {
            "last_medicine_reminder": utc_now(),
            "awaiting_medicine_confirmation": True,
            "updated_at": utc_now(),
        }},
    )

    return {"message": "Medicine reminder sent", "patient_name": name}
