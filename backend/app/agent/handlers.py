"""
Agent Handlers — Each function handles one specific patient action.
All handlers:
1. Do their work (DB ops, API calls, etc.)
2. Update conversation state
3. Return a reply string in the patient's language (or None for doctor mode)
"""
import logging
from datetime import datetime
from bson import ObjectId
from app.agent.state import ConversationState, set_state, update_context
from app.services.templates import get_template
from app.database import (
    patients_collection, alerts_collection,
    checkins_collection, conversations_collection,
)
from app.utils.helpers import utc_now, days_since

logger = logging.getLogger(__name__)


# ───────────────────────── helpers ─────────────────────────

def _calculate_day(patient: dict) -> int:
    surgery_date = patient.get("surgery_date")
    if not surgery_date:
        return 0
    if isinstance(surgery_date, str):
        surgery_date = datetime.fromisoformat(surgery_date)
    return max((datetime.utcnow() - surgery_date).days, 0)


async def _get_doctor_name(doctor_id: str) -> str:
    try:
        from app.database import doctors_collection
        doctor = await doctors_collection.find_one({"_id": ObjectId(doctor_id)})
        if doctor:
            name = doctor.get("name", "Your Doctor")
            # Strip "Dr." / "Dr " prefix so templates can add it consistently
            if name.lower().startswith("dr."):
                name = name[3:].strip()
            elif name.lower().startswith("dr "):
                name = name[3:].strip()
            return name or "Your Doctor"
    except Exception:
        pass
    return "Your Doctor"


def _format_medicine_list(medicines: list, lang: str) -> str:
    if not medicines:
        no_meds = {
            "en": "No medicines listed.",
            "hi": "कोई दवाई सूचीबद्ध नहीं।",
            "te": "మందులు జాబితా చేయబడలేదు.",
        }
        return no_meds.get(lang, no_meds["en"])
    lines = []
    for i, m in enumerate(medicines, 1):
        lines.append(f"{i}. {m.get('name', '')} — {m.get('dosage', '')} ({m.get('frequency', '')})")
    return "\n".join(lines)


async def _save_conversation(patient_id, patient_msg, ai_msg,
                             message_type="text", media_url=None,
                             patient_lang="en", ai_lang="en"):
    messages = [
        {
            "role": "patient",
            "content": patient_msg,
            "content_type": message_type,
            "media_url": media_url,
            "language": patient_lang,
            "timestamp": utc_now(),
        },
        {
            "role": "ai",
            "content": ai_msg,
            "content_type": "text",
            "language": ai_lang,
            "timestamp": utc_now(),
        },
    ]
    await conversations_collection.update_one(
        {"patient_id": patient_id},
        {"$push": {"messages": {"$each": messages}}, "$set": {"updated_at": utc_now()}},
        upsert=True,
    )

    # Emit socket event so doctor dashboard updates in real time
    try:
        from app.main import sio
        await sio.emit("new_message", {
            "patient_id": patient_id,
            "content": patient_msg[:100],
            "role": "patient",
            "timestamp": utc_now().isoformat(),
        })
    except Exception:
        pass


# ═══════════════════════ ONBOARDING ═══════════════════════

async def handle_onboarding(patient: dict, lang: str) -> str:
    patient_id = str(patient["_id"])
    await set_state(patient_id, ConversationState.AWAITING_LANGUAGE)
    surgery_type = patient.get("surgery_type", "surgery")
    return get_template("welcome", "en", name=patient["name"], surgery_type=surgery_type)


async def handle_language_selection(patient: dict, body: str) -> str:
    patient_id = str(patient["_id"])
    lang_map = {"1": "en", "2": "hi", "3": "te"}

    if body.strip() not in lang_map:
        return get_template("language_selection_retry", "en")

    new_lang = lang_map[body.strip()]
    await patients_collection.update_one(
        {"_id": patient["_id"]},
        {"$set": {
            "language_preference": new_lang,
            "onboarding_complete": True,
            "updated_at": utc_now(),
        }},
    )
    await set_state(patient_id, ConversationState.IDLE)

    confirm = get_template("lang_confirm", new_lang)
    menu = get_template("main_menu", new_lang)
    return f"{confirm}\n\n{menu}"


# ═══════════════════════ GREETINGS & MENU ═══════════════════════

async def handle_greeting(patient: dict, lang: str) -> str:
    name = patient["name"]
    greeting = get_template("greeting_reply", lang, name=name)
    menu = get_template("main_menu", lang)
    await set_state(str(patient["_id"]), ConversationState.IDLE)
    return f"{greeting}\n\n{menu}"


async def handle_menu(patient: dict, lang: str) -> str:
    return get_template("main_menu", lang)


# ═══════════════════════ SYMPTOMS / CHECK-IN ═══════════════════════

PAIN_MAP = {"1": 1, "2": 3, "3": 5, "4": 7, "5": 9}
SYMPTOM_MAP = {"1": "swelling", "2": "fever", "3": "bleeding", "4": "redness", "5": "nausea"}
MEDICINE_MAP = {"1": True, "2": "partial", "3": False}


async def handle_report_symptoms(patient: dict, lang: str, initial_message: str = None) -> str:
    patient_id = str(patient["_id"])

    if initial_message:
        # Patient already described symptoms — process with AI
        return await handle_general_conversation(patient, initial_message, lang)

    # Start structured check-in
    await set_state(patient_id, ConversationState.CHECKIN_PAIN, context={
        "checkin_started": utc_now().isoformat(),
        "checkin_type": "patient_initiated",
    })
    return get_template("pain_question", lang)


async def handle_checkin_step(patient: dict, body: str, current_state: str, lang: str) -> str:
    """Route to the correct check-in sub-step based on current state."""
    patient_id = str(patient["_id"])
    ctx = patient.get("agent_context", {})

    # ── PAIN ──
    if current_state == ConversationState.CHECKIN_PAIN:
        pain_val = PAIN_MAP.get(body.strip())
        if pain_val is None:
            try:
                pain_val = int(body.strip())
                pain_val = max(1, min(pain_val, 10))
            except ValueError:
                nums = [int(c) for c in body if c.isdigit()]
                pain_val = nums[0] if nums else 5

        await update_context(patient_id, {"pain_score": pain_val})
        await set_state(patient_id, ConversationState.CHECKIN_SYMPTOMS)
        return get_template("symptom_question", lang)

    # ── SYMPTOMS ──
    if current_state == ConversationState.CHECKIN_SYMPTOMS:
        selected = []
        for tok in body.replace(",", " ").split():
            tok = tok.strip()
            if tok in SYMPTOM_MAP:
                selected.append(SYMPTOM_MAP[tok])
        if "6" in body:
            selected = []

        await update_context(patient_id, {"symptoms": selected})
        await set_state(patient_id, ConversationState.CHECKIN_MEDICINE)
        return get_template("medicine_question", lang)

    # ── MEDICINE ──
    if current_state == ConversationState.CHECKIN_MEDICINE:
        med_taken = MEDICINE_MAP.get(body.strip())
        await update_context(patient_id, {"medicine_taken": med_taken})
        await set_state(patient_id, ConversationState.CHECKIN_OPEN)
        return get_template("checkin_open_ended", lang)

    # ── OPEN-ENDED (final step) ──
    if current_state == ConversationState.CHECKIN_OPEN:
        open_text = body if body.lower().strip() not in ("no", "nahi", "లేదు", "nope", "nothing") else ""

        # Reload patient to get latest context
        patient_fresh = await patients_collection.find_one({"_id": patient["_id"]})
        ctx = patient_fresh.get("agent_context", {})
        pain_score = ctx.get("pain_score", 5)
        symptoms = ctx.get("symptoms", [])
        medicine_taken = ctx.get("medicine_taken")
        day_num = _calculate_day(patient)
        checkin_type = ctx.get("checkin_type", "patient_initiated")

        summary = (
            f"Day {day_num} check-in:\n"
            f"Pain level: {pain_score}/10\n"
            f"Symptoms: {', '.join(symptoms) if symptoms else 'none'}\n"
            f"Medicine taken: {medicine_taken}\n"
            f"Additional notes: {open_text or 'none'}"
        )

        # AI assessment
        ai_response = None
        try:
            from app.services.ai_brain import process_message
            ai_response = await process_message(patient_id, summary, "structured_checkin")
        except Exception as e:
            logger.error("AI processing for checkin failed: %s", e)

        # Save check-in document
        checkin_doc = {
            "patient_id": patient_id,
            "day_number": day_num,
            "type": "scheduled_structured" if checkin_type == "scheduled" else "patient_initiated",
            "questions_asked": ["pain", "symptoms", "medicine", "open_ended"],
            "responses": [
                {"question": "pain_level", "answer": str(pain_score), "timestamp": utc_now()},
                {"question": "symptoms", "answer": ", ".join(symptoms) or "none", "timestamp": utc_now()},
                {"question": "medicine_taken", "answer": str(medicine_taken), "timestamp": utc_now()},
                {"question": "open_ended", "answer": open_text or "none", "timestamp": utc_now()},
            ],
            "pain_score": pain_score,
            "symptoms_detected": symptoms,
            "medicine_taken": medicine_taken is True,
            "ai_assessment": {
                "risk_level": ai_response.get("risk_level", "green") if ai_response else "green",
                "risk_score": ai_response.get("risk_score", 0) if ai_response else 0,
                "reasoning": ai_response.get("reasoning", "") if ai_response else "Structured check-in completed",
                "recommended_action": ai_response.get("recommended_action", "") if ai_response else "",
            },
            "escalation_triggered": ai_response.get("escalation_needed", False) if ai_response else False,
            "escalation_level": ai_response.get("escalation_level", 0) if ai_response else 0,
            "created_at": utc_now(),
        }
        await checkins_collection.insert_one(checkin_doc)

        # Update patient status
        if ai_response:
            new_status = ai_response.get("risk_level", "green")
            await patients_collection.update_one(
                {"_id": patient["_id"]},
                {"$set": {
                    "current_status": new_status,
                    "risk_score": ai_response.get("risk_score", 0),
                    "updated_at": utc_now(),
                }},
            )
            if ai_response.get("escalation_needed"):
                try:
                    from app.services.escalation import evaluate_and_escalate
                    await evaluate_and_escalate(patient_id, checkin_doc)
                except Exception as e:
                    logger.error("Escalation failed: %s", e)

        # Reset state
        await set_state(patient_id, ConversationState.IDLE, context={})

        # Clear legacy active_checkin field too
        await patients_collection.update_one(
            {"_id": patient["_id"]},
            {"$set": {"active_checkin": None}},
        )

        # Socket event
        try:
            from app.main import sio
            await sio.emit("new_checkin", {
                "patient_id": patient_id,
                "patient_name": patient.get("name", ""),
                "status": ai_response.get("risk_level", "green") if ai_response else "green",
                "message": f"Day {day_num} check-in completed",
                "timestamp": utc_now().isoformat(),
            })
        except Exception:
            pass

        # Reply
        reply = ""
        if ai_response:
            reply = ai_response.get("reply_to_patient", "")
        if not reply:
            reply = get_template("checkin_complete", lang, name=patient.get("name", ""))
        return reply

    return get_template("main_menu", lang)


# ═══════════════════════ WOUND PHOTOS ═══════════════════════

async def handle_photo_request(patient: dict, lang: str) -> str:
    await set_state(str(patient["_id"]), ConversationState.AWAITING_PHOTO)
    return get_template("photo_prompt", lang)


async def handle_photo_received(patient: dict, media_url: str, lang: str) -> str:
    patient_id = str(patient["_id"])

    try:
        from app.services.whatsapp import download_media
        from app.services.wound_analyzer import analyze_wound
        image_bytes = await download_media(media_url)
        analysis = await analyze_wound(image_bytes)
    except Exception as e:
        logger.error("Wound analysis failed: %s", e)
        analysis = {"description": "Image received", "risk_level": "unknown", "recommendation": ""}

    checkin_doc = {
        "patient_id": patient_id,
        "day_number": _calculate_day(patient),
        "type": "photo_analysis",
        "wound_photo_url": media_url,
        "wound_analysis": analysis,
        "ai_assessment": {
            "risk_level": analysis.get("risk_level", "green"),
            "reasoning": analysis.get("description", ""),
        },
        "created_at": utc_now(),
    }
    await checkins_collection.insert_one(checkin_doc)

    await set_state(patient_id, ConversationState.IDLE)

    reply = get_template("photo_analysis_result", lang,
        description=analysis.get("description", "Image analyzed"),
        risk=analysis.get("risk_level", "unknown"),
        recommendation=analysis.get("recommendation", "Share with your doctor for review"),
    )
    return reply


# ═══════════════════════ MEDICINES ═══════════════════════

async def handle_medicine_confirmation(patient: dict, body: str, lang: str) -> str:
    """Handle patient reply to medicine reminder: 1=taken, 2=not taken."""
    patient_id = str(patient["_id"])
    took_medicine = body.strip() == "1"

    # Clear the awaiting flag
    await patients_collection.update_one(
        {"_id": patient["_id"]},
        {"$set": {"awaiting_medicine_confirmation": False, "updated_at": utc_now()}},
    )

    # Update medicine adherence counts
    if took_medicine:
        medicines = patient.get("medicines", [])
        for i in range(len(medicines)):
            await patients_collection.update_one(
                {"_id": patient["_id"]},
                {"$inc": {f"medicines.{i}.taken_count": 1, f"medicines.{i}.total_count": 1}},
            )
    else:
        medicines = patient.get("medicines", [])
        for i in range(len(medicines)):
            await patients_collection.update_one(
                {"_id": patient["_id"]},
                {"$inc": {f"medicines.{i}.total_count": 1}},
            )

    # Socket event for dashboard
    try:
        from app.main import sio
        await sio.emit("medicine_update", {
            "patient_id": patient_id,
            "patient_name": patient.get("name", ""),
            "took_medicine": took_medicine,
            "timestamp": utc_now().isoformat(),
        })
    except Exception:
        pass

    # Save conversation
    if took_medicine:
        confirm = {
            "en": "Great job taking your medicines! Keep it up. Your recovery depends on it.",
            "hi": "बहुत अच्छा! दवाइयां लेते रहें। आपकी रिकवरी इस पर निर्भर करती है।",
            "te": "మందులు తీసుకున్నారు, బాగుంది! కొనసాగించండి. మీ రికవరీ దీని మీద ఆధారపడి ఉంటుంది.",
        }
    else:
        confirm = {
            "en": "Please try to take your medicines as prescribed. They are important for your recovery. If you're having trouble, let your doctor know.",
            "hi": "कृपया अपनी दवाइयां लेने की कोशिश करें। ये आपकी रिकवरी के लिए ज़रूरी हैं। अगर कोई परेशानी है तो डॉक्टर को बताएं।",
            "te": "దయచేసి మీ మందులు తీసుకోండి. మీ రికవరీకి ఇవి చాలా ముఖ్యం. ఇబ్బంది ఉంటే డాక్టర్‌కు చెప్పండి.",
        }

    reply = confirm.get(lang, confirm["en"])
    await _save_conversation(patient_id, body, reply, "text", None, lang, lang)
    return reply


async def handle_medicines(patient: dict, lang: str) -> str:
    medicines = patient.get("medicines", [])
    if not medicines:
        return get_template("no_medicines", lang)
    med_text = _format_medicine_list(medicines, lang)
    return get_template("medicine_list", lang, medicine_list=med_text)


# ═══════════════════════ RECOVERY REPORT ═══════════════════════

async def handle_report(patient: dict, lang: str) -> str:
    patient_id = str(patient["_id"])
    name = patient.get("name", "Patient")
    surgery_type = patient.get("surgery_type", "N/A")
    day = _calculate_day(patient)
    status = patient.get("current_status", "green").upper()

    score = 50
    try:
        from app.services.symptom_analyzer import get_recovery_score
        score = await get_recovery_score(patient_id)
    except Exception:
        pass

    checkins = []
    cursor = checkins_collection.find({"patient_id": patient_id}).sort("created_at", -1).limit(10)
    async for c in cursor:
        checkins.append(c)

    pain_scores = [c.get("pain_score") for c in checkins if c.get("pain_score") is not None]
    avg_pain = round(sum(pain_scores) / len(pain_scores), 1) if pain_scores else 0

    med_taken = sum(1 for c in checkins if c.get("medicine_taken") is True)
    med_adherence = round((med_taken / len(checkins)) * 100) if checkins else 0

    latest = checkins[0].get("ai_assessment", {}) if checkins else {}

    return get_template("report_summary", lang,
        name=name,
        surgery_type=surgery_type,
        day=day,
        status=status,
        score=score,
        avg_pain=avg_pain,
        med_adherence=med_adherence,
        checkin_count=len(checkins),
        ai_reasoning=latest.get("reasoning", "No recent assessment"),
        recommendation=latest.get("recommended_action", "Continue following doctor's advice"),
    )


# ═══════════════════════ APPOINTMENTS ═══════════════════════

async def handle_appointment(patient: dict, lang: str) -> str:
    patient_id = str(patient["_id"])

    alert = {
        "patient_id": patient_id,
        "doctor_id": patient.get("doctor_id", ""),
        "level": 1,
        "title": f"{patient['name']} requested an appointment",
        "description": "Patient wants to book a follow-up appointment",
        "ai_reasoning": "Patient explicitly requested appointment",
        "symptoms": [],
        "status": "new",
        "type": "appointment_request",
        "created_at": utc_now(),
    }
    await alerts_collection.insert_one(alert)

    try:
        from app.main import sio
        await sio.emit("appointment_request", {
            "patient_id": patient_id,
            "patient_name": patient["name"],
            "message": f"{patient['name']} requested an appointment",
        })
    except Exception:
        pass

    await set_state(patient_id, ConversationState.AWAITING_URGENCY)

    doctor_name = await _get_doctor_name(patient.get("doctor_id", ""))
    return get_template("appointment_request", lang, doctor_name=doctor_name)


async def handle_urgency_response(patient: dict, body: str, lang: str) -> str:
    patient_id = str(patient["_id"])
    is_urgent = body.strip() in ["1", "yes", "urgent", "हां", "అవును"]

    if is_urgent:
        await alerts_collection.update_one(
            {"patient_id": patient_id, "type": "appointment_request", "status": "new"},
            {"$set": {"level": 2, "title": f"URGENT: {patient['name']} needs appointment"}},
        )

    await set_state(patient_id, ConversationState.IDLE)
    return get_template("appointment_confirmed", lang)


# ═══════════════════════ CALLBACKS ═══════════════════════

async def handle_callback_ai(patient: dict, lang: str) -> str:
    patient_id = str(patient["_id"])
    try:
        from app.services.voice_call import initiate_callback
        await initiate_callback(patient_id)
    except Exception as e:
        logger.error("AI callback failed: %s", e)
    return get_template("callback_confirm", lang)


async def handle_callback_hospital(patient: dict, lang: str) -> str:
    patient_id = str(patient["_id"])

    callback_request = {
        "type": "hospital",
        "status": "pending",
        "created_at": utc_now(),
        "completed_at": None,
    }
    await patients_collection.update_one(
        {"_id": patient["_id"]},
        {"$push": {"callback_requests": callback_request}},
    )

    alert = {
        "patient_id": patient_id,
        "doctor_id": patient.get("doctor_id", ""),
        "level": 1,
        "title": f"{patient['name']} requested hospital callback",
        "description": "Patient wants a call from the hospital staff",
        "ai_reasoning": "Patient explicitly requested hospital callback",
        "symptoms": [],
        "status": "new",
        "type": "hospital_callback",
        "created_at": utc_now(),
    }
    await alerts_collection.insert_one(alert)

    try:
        from app.main import sio
        await sio.emit("hospital_callback", {
            "patient_id": patient_id,
            "patient_name": patient["name"],
            "message": f"{patient['name']} requested a hospital callback",
        })
    except Exception:
        pass

    day = _calculate_day(patient)
    return get_template("hospital_callback", lang,
        hospital_name=patient.get("hospital", "the hospital"),
        name=patient["name"],
        surgery_type=patient.get("surgery_type", ""),
        day=day,
    )


# ═══════════════════════ DOCTOR INTERACTION ═══════════════════════

async def handle_doctor_request(patient: dict, lang: str) -> str:
    patient_id = str(patient["_id"])

    alert = {
        "patient_id": patient_id,
        "doctor_id": patient.get("doctor_id", ""),
        "level": 2,
        "title": f"{patient['name']} wants to talk to a doctor",
        "description": "Patient requested direct conversation with doctor",
        "ai_reasoning": "Patient explicitly requested doctor interaction",
        "symptoms": [],
        "status": "new",
        "type": "doctor_request",
        "created_at": utc_now(),
    }
    await alerts_collection.insert_one(alert)

    try:
        from app.main import sio
        await sio.emit("doctor_request", {
            "patient_id": patient_id,
            "patient_name": patient["name"],
            "message": f"{patient['name']} wants to speak with you directly",
        })
        # Also emit new_alert so the frontend alerts UI refreshes
        await sio.emit("new_alert", {
            "patient_id": patient_id,
            "patient_name": patient["name"],
            "level": 2,
            "title": f"{patient['name']} wants to talk to a doctor",
            "type": "doctor_request",
            "timestamp": utc_now().isoformat(),
        })
    except Exception:
        pass

    doctor_name = await _get_doctor_name(patient.get("doctor_id", ""))
    return get_template("doctor_request", lang, doctor_name=doctor_name)


async def handle_doctor_mode_message(patient: dict, body: str) -> str | None:
    """In doctor mode, save message and emit socket — don't auto-reply."""
    patient_id = str(patient["_id"])

    detected_lang = "en"
    try:
        from app.services.translator import detect_language
        detected_lang = detect_language(body)
    except Exception:
        pass

    await conversations_collection.update_one(
        {"patient_id": patient_id},
        {
            "$push": {"messages": {
                "role": "patient",
                "content": body,
                "content_type": "text",
                "language": detected_lang,
                "timestamp": utc_now(),
            }},
            "$set": {"updated_at": utc_now()},
        },
        upsert=True,
    )

    try:
        from app.main import sio
        await sio.emit("new_message", {
            "patient_id": patient_id,
            "patient_name": patient.get("name", ""),
            "content": body,
            "content_type": "text",
            "timestamp": utc_now().isoformat(),
        })
    except Exception:
        pass

    return None  # No auto-reply — doctor will respond


# ═══════════════════════ GENERAL AI CONVERSATION ═══════════════════════

async def handle_general_conversation(patient: dict, message: str, lang: str) -> str:
    """Free-form message → AI brain → save → reply."""
    patient_id = str(patient["_id"])
    name = patient.get("name", "there")

    # Track conversation turns
    ctx = patient.get("agent_context", {})
    turn_count = ctx.get("conversation_turns", 0) + 1
    await update_context(patient_id, {"conversation_turns": turn_count})
    await set_state(patient_id, ConversationState.IN_CONVERSATION)

    # Translate to English for AI if needed
    detected_lang = "en"
    english_text = message
    try:
        from app.services.translator import detect_language, translate
        detected_lang = detect_language(message)
        if detected_lang != "en":
            english_text = translate(message, detected_lang, "en")
    except Exception:
        pass

    # Process with AI brain
    try:
        from app.services.ai_brain import process_message
        ai_response = await process_message(patient_id, english_text, "text")
    except Exception as e:
        logger.error("AI brain failed: %s", e)
        fallback = {
            "en": f"Hi {name}! How are you feeling right now? Any pain, swelling, or fever?",
            "hi": f"नमस्ते {name}! आप अभी कैसा महसूस कर रहे हैं? कोई दर्द, सूजन या बुखार?",
            "te": f"హాయ్ {name}! మీరు ఇప్పుడు ఎలా ఫీల్ అవుతున్నారు? ఏమైనా నొప్పి, వాపు లేదా జ్వరం?",
        }
        ai_response = {
            "reply_to_patient": fallback.get(lang, fallback["en"]),
            "detected_symptoms": [],
            "risk_level": "green",
            "risk_score": 0,
            "reasoning": f"AI processing error: {e}",
            "escalation_needed": False,
            "escalation_level": 0,
        }

    reply = ai_response.get("reply_to_patient", "")

    # Reject generic/fallback replies
    generic = ["doctor will review", "noted your response", "doctor has been notified", "thank you for your update"]
    if any(p in reply.lower() for p in generic) or not reply.strip():
        fb = {
            "en": f"Hi {name}! How are you feeling right now? Please describe your symptoms so I can help.",
            "hi": f"नमस्ते {name}! आप अभी कैसा महसूस कर रहे हैं? कृपया अपने लक्षण बताएं।",
            "te": f"హాయ్ {name}! మీరు ఇప్పుడు ఎలా ఫీల్ అవుతున్నారు? దయచేసి మీ లక్షణాలు చెప్పండి.",
        }
        reply = fb.get(lang, fb["en"])
        ai_response["reply_to_patient"] = reply

    # Translate AI reply if needed
    if lang != "en" and reply:
        try:
            from app.services.translator import detect_language as dl, translate as tr
            if dl(reply) == "en":
                reply = tr(reply, "en", lang)
                ai_response["reply_to_patient"] = reply
        except Exception:
            pass

    # Save conversation
    await _save_conversation(patient_id, message, reply, "text", None, detected_lang, lang)

    # Save check-in if health-related data was detected
    day_num = _calculate_day(patient)
    checkin_doc = {
        "patient_id": patient_id,
        "day_number": day_num,
        "type": "patient_initiated",
        "questions_asked": [],
        "responses": [{
            "question": "",
            "answer": message,
            "answer_type": "text",
            "original_language": detected_lang,
            "translated_answer": english_text,
            "timestamp": utc_now(),
        }],
        "pain_score": ai_response.get("pain_score"),
        "symptoms_detected": ai_response.get("detected_symptoms", []),
        "medicine_taken": ai_response.get("medicine_taken"),
        "ai_assessment": {
            "risk_level": ai_response.get("risk_level", "green"),
            "risk_score": ai_response.get("risk_score", 0),
            "reasoning": ai_response.get("reasoning", ""),
            "recommended_action": ai_response.get("recommended_action", ""),
        },
        "escalation_triggered": ai_response.get("escalation_needed", False),
        "escalation_level": ai_response.get("escalation_level", 0),
        "created_at": utc_now(),
    }
    await checkins_collection.insert_one(checkin_doc)

    # Update patient status
    new_status = ai_response.get("risk_level", "green")
    await patients_collection.update_one(
        {"_id": patient["_id"]},
        {"$set": {
            "current_status": new_status,
            "risk_score": ai_response.get("risk_score", 0),
            "updated_at": utc_now(),
        }},
    )

    # Escalation
    if ai_response.get("escalation_needed"):
        try:
            from app.services.escalation import evaluate_and_escalate
            await evaluate_and_escalate(patient_id, checkin_doc)
        except Exception as e:
            logger.error("Escalation failed: %s", e)

    # Socket events
    try:
        from app.main import sio
        await sio.emit("new_checkin", {
            "patient_id": patient_id,
            "patient_name": name,
            "status": new_status,
            "message": message[:100],
            "timestamp": utc_now().isoformat(),
        })
        if new_status in ["red", "critical"]:
            await sio.emit("new_alert", {
                "patient_id": patient_id,
                "patient_name": name,
                "level": ai_response.get("escalation_level", 2),
                "title": f"Status changed to {new_status.upper()}",
                "timestamp": utc_now().isoformat(),
            })
    except Exception:
        pass

    # After 2+ turns, add "end" hint so conversation doesn't go on forever
    if turn_count >= 2:
        end_hint = {
            "en": "\n\n_Reply *end* when you're done chatting._",
            "hi": "\n\n_बातचीत खत्म करने के लिए *end* भेजें।_",
            "te": "\n\n_చాట్ పూర్తయితే *end* పంపండి._",
        }
        reply += end_hint.get(lang, end_hint["en"])

    return reply


async def handle_end_conversation(patient: dict, lang: str) -> str:
    """End the conversation, generate a short summary for the patient + detailed report for doctor."""
    patient_id = str(patient["_id"])
    name = patient.get("name", "there")

    # Reset conversation state
    await set_state(patient_id, ConversationState.IDLE, context={})

    # Get recent conversation for summary
    conv = await conversations_collection.find_one({"patient_id": patient_id})
    messages = conv.get("messages", []) if conv else []
    recent = messages[-20:]  # Last 20 messages

    convo_text = "\n".join([f"[{m.get('role', '?')}]: {m.get('content', '')}" for m in recent])

    # Generate short summary for patient
    short_summary = {
        "en": f"Thank you for chatting, {name}! Take care and don't hesitate to reach out anytime. Your doctor has been updated.",
        "hi": f"बातचीत के लिए धन्यवाद, {name}! अपना ख्याल रखें और कभी भी संपर्क करें। आपके डॉक्टर को अपडेट कर दिया गया है।",
        "te": f"చాట్ చేసినందుకు ధన్యవాదాలు, {name}! జాగ్రత్తగా ఉండండి. మీ డాక్టర్‌కు అప్‌డేట్ చేయబడింది.",
    }

    # Generate detailed AI report for the doctor dashboard
    try:
        import anthropic
        from app.config import get_settings
        settings_obj = get_settings()
        client = anthropic.AsyncAnthropic(api_key=settings_obj.ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model="claude-haiku-4-5-20241022",
            max_tokens=800,
            messages=[{"role": "user", "content": f"""Summarize this patient conversation for the doctor. Be concise.
Patient: {name}
Surgery: {patient.get('surgery_type', 'N/A')}
Status: {patient.get('current_status', 'unknown')}

Conversation:
{convo_text}

Provide:
1. Key concerns raised
2. Symptoms mentioned
3. Overall mood/status
4. Action items for doctor"""}],
        )
        detailed_report = response.content[0].text
    except Exception as e:
        logger.error("End conversation report failed: %s", e)
        detailed_report = f"Conversation with {name} ended. {len(recent)} messages exchanged. Please review in the conversations tab."

    # Emit conversation report to doctor dashboard
    try:
        from app.main import sio
        await sio.emit("conversation_ended", {
            "patient_id": patient_id,
            "patient_name": name,
            "report": detailed_report,
            "message_count": len(recent),
            "timestamp": utc_now().isoformat(),
        })
        # Also emit as alert so doctor sees it
        await sio.emit("new_alert", {
            "patient_id": patient_id,
            "patient_name": name,
            "level": 1,
            "title": f"Conversation ended with {name}",
            "type": "conversation_report",
            "timestamp": utc_now().isoformat(),
        })
    except Exception:
        pass

    # Save report as an alert in DB for doctor
    alert = {
        "patient_id": patient_id,
        "doctor_id": patient.get("doctor_id", ""),
        "level": 1,
        "title": f"Conversation report: {name}",
        "description": detailed_report,
        "ai_reasoning": detailed_report,
        "symptoms": [],
        "status": "new",
        "type": "conversation_report",
        "created_at": utc_now(),
    }
    await alerts_collection.insert_one(alert)

    # Save the end message in conversation
    await _save_conversation(patient_id, "end", short_summary.get(lang, short_summary["en"]), "text", None, lang, lang)

    return short_summary.get(lang, short_summary["en"])


# ═══════════════════════ UTILITY HANDLERS ═══════════════════════

async def handle_help(patient: dict, lang: str) -> str:
    return get_template("help", lang)


async def handle_language_change(patient: dict, lang: str) -> str:
    patient_id = str(patient["_id"])
    await patients_collection.update_one(
        {"_id": patient["_id"]},
        {"$set": {"onboarding_complete": False, "updated_at": utc_now()}},
    )
    await set_state(patient_id, ConversationState.AWAITING_LANGUAGE)
    surgery_type = patient.get("surgery_type", "surgery")
    return get_template("welcome", "en", name=patient["name"], surgery_type=surgery_type)


async def handle_stop(patient: dict, lang: str) -> str:
    await patients_collection.update_one(
        {"_id": patient["_id"]},
        {"$set": {"is_active": False, "updated_at": utc_now()}},
    )
    return get_template("stop_confirm", lang)
