"""
Agent Router — The brain that decides what to do.
Takes (current_state, detected_intent) and routes to the right handler.
"""
import logging
from app.agent.state import ConversationState, get_state
from app.agent.intent import detect_intent
from app.agent.handlers import (
    handle_onboarding,
    handle_language_selection,
    handle_greeting,
    handle_menu,
    handle_report_symptoms,
    handle_checkin_step,
    handle_photo_request,
    handle_photo_received,
    handle_medicines,
    handle_report,
    handle_appointment,
    handle_callback_ai,
    handle_callback_hospital,
    handle_doctor_request,
    handle_doctor_mode_message,
    handle_help,
    handle_language_change,
    handle_general_conversation,
    handle_urgency_response,
    handle_stop,
    handle_medicine_confirmation,
    handle_end_conversation,
)
from app.services.templates import get_template

logger = logging.getLogger(__name__)


async def process_message(
    patient: dict,
    body: str,
    media_url: str = None,
    media_type: str = None,
) -> str | None:
    """
    Main agent entry point.  Processes any incoming WhatsApp message.
    Returns the reply string to send back, or None (doctor mode — no reply).
    """
    patient_id = str(patient["_id"])
    state_info = get_state(patient)
    current_state = state_info["state"]
    lang = state_info["language"]

    # ═══════════════════════════════════════════
    # STEP 1 — Handle media (voice / photo) FIRST
    # ═══════════════════════════════════════════
    if media_url and media_type:
        if "audio" in media_type or "ogg" in media_type:
            try:
                from app.services.speech import speech_to_text
                from app.services.whatsapp import download_media
                audio_bytes = await download_media(media_url)
                transcript = await speech_to_text(audio_bytes, lang)
                if transcript and transcript.strip():
                    body = transcript.strip()
                else:
                    return get_template("voice_fail", lang)
            except Exception as e:
                logger.error("STT failed: %s", e)
                return get_template("voice_fail", lang)

        elif "image" in media_type:
            return await handle_photo_received(patient, media_url, lang)

    # ═══════════════════════════════════════════
    # STEP 2 — Route by CURRENT STATE (stateful)
    # ═══════════════════════════════════════════

    # -- Onboarding --
    if current_state == ConversationState.NEW:
        return await handle_onboarding(patient, lang)

    if current_state == ConversationState.AWAITING_LANGUAGE:
        return await handle_language_selection(patient, body)

    # -- Legacy onboarding support (onboarding_complete flag) --
    if not patient.get("onboarding_complete") and current_state not in (
        ConversationState.AWAITING_LANGUAGE,
    ):
        return await handle_onboarding(patient, lang)

    # -- Doctor mode (bypass AI entirely) --
    if current_state == ConversationState.DOCTOR_MODE or patient.get("mode") == "doctor":
        return await handle_doctor_mode_message(patient, body)

    # -- Structured check-in steps --
    if current_state in (
        ConversationState.CHECKIN_PAIN,
        ConversationState.CHECKIN_SYMPTOMS,
        ConversationState.CHECKIN_MEDICINE,
        ConversationState.CHECKIN_OPEN,
    ):
        return await handle_checkin_step(patient, body, current_state, lang)

    # -- Legacy active_checkin support --
    if patient.get("active_checkin"):
        ac = patient["active_checkin"]
        step = ac.get("step", 1)
        state_map = {
            1: ConversationState.CHECKIN_PAIN,
            2: ConversationState.CHECKIN_SYMPTOMS,
            3: ConversationState.CHECKIN_MEDICINE,
            4: ConversationState.CHECKIN_OPEN,
        }
        mapped = state_map.get(step, ConversationState.CHECKIN_PAIN)
        return await handle_checkin_step(patient, body, mapped, lang)

    # -- Awaiting photo --
    if current_state == ConversationState.AWAITING_PHOTO:
        if not (media_url and media_type and "image" in media_type):
            return get_template("photo_prompt", lang)

    # -- Awaiting urgency response (appointment follow-up) --
    if current_state == ConversationState.AWAITING_URGENCY:
        return await handle_urgency_response(patient, body, lang)

    # -- Medicine confirmation (patient replied 1 or 2 to reminder) --
    if patient.get("awaiting_medicine_confirmation") and body.strip() in ("1", "2"):
        return await handle_medicine_confirmation(patient, body, lang)

    # -- End conversation (patient said end/done/bye while in conversation) --
    end_words = {"end", "done", "bye", "quit", "exit", "stop chat", "end chat", "बंद", "ముగింపు"}
    if current_state == ConversationState.IN_CONVERSATION and body.strip().lower() in end_words:
        return await handle_end_conversation(patient, lang)

    # ═══════════════════════════════════════════
    # STEP 3 — Detect INTENT using AI
    # ═══════════════════════════════════════════
    intent_result = await detect_intent(body)
    intent = intent_result["intent"]
    detected_lang = intent_result.get("language", lang)
    extracted_number = intent_result.get("extracted_number")

    # Update patient language if AI detected a different one
    if detected_lang != lang and detected_lang in ("en", "hi", "te"):
        from app.database import patients_collection
        await patients_collection.update_one(
            {"_id": patient["_id"]},
            {"$set": {"language_preference": detected_lang}},
        )
        lang = detected_lang

    # ═══════════════════════════════════════════
    # STEP 4 — Route by INTENT
    # ═══════════════════════════════════════════

    # Numbered menu selections
    if intent == "number_response" and extracted_number:
        n = extracted_number
        menu_handlers = {
            1: lambda: handle_report_symptoms(patient, lang),
            2: lambda: handle_photo_request(patient, lang),
            3: lambda: handle_medicines(patient, lang),
            4: lambda: handle_report(patient, lang),
            5: lambda: handle_appointment(patient, lang),
            6: lambda: handle_callback_ai(patient, lang),
            7: lambda: handle_doctor_request(patient, lang),
            8: lambda: handle_help(patient, lang),
        }
        handler = menu_handlers.get(n)
        if handler:
            return await handler()

    # Intent-to-handler mapping
    intent_handlers = {
        "greeting": lambda: handle_greeting(patient, lang),
        "show_menu": lambda: handle_menu(patient, lang),
        "report_symptoms": lambda: handle_report_symptoms(patient, lang),
        "send_photo": lambda: handle_photo_request(patient, lang),
        "check_medicines": lambda: handle_medicines(patient, lang),
        "get_report": lambda: handle_report(patient, lang),
        "book_appointment": lambda: handle_appointment(patient, lang),
        "request_callback_ai": lambda: handle_callback_ai(patient, lang),
        "request_callback_hospital": lambda: handle_callback_hospital(patient, lang),
        "talk_to_doctor": lambda: handle_doctor_request(patient, lang),
        "change_language": lambda: handle_language_change(patient, lang),
        "help": lambda: handle_help(patient, lang),
        "stop": lambda: handle_stop(patient, lang),
    }

    handler = intent_handlers.get(intent)
    if handler:
        return await handler()

    # Pain report — route to symptom reporting with the message
    if intent == "pain_report":
        return await handle_report_symptoms(patient, lang, initial_message=body)

    # Default: free-form AI conversation
    return await handle_general_conversation(patient, body, lang)
