from fastapi import APIRouter, Request, Response
from fastapi.responses import PlainTextResponse
from app.database import patients_collection, conversations_collection, checkins_collection
from app.utils.helpers import utc_now, objectid_to_str
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/whatsapp")
async def whatsapp_webhook(request: Request):
    """Handle incoming WhatsApp messages from Twilio."""
    try:
        form = await request.form()
        from_number = form.get("From", "")
        body = form.get("Body", "").strip()
        media_url = form.get("MediaUrl0")
        media_type = form.get("MediaContentType0", "")
        num_media = int(form.get("NumMedia", 0))

        logger.info(f"WhatsApp from {from_number}: {body[:50]}...")

        # Clean phone number
        phone = from_number.replace("whatsapp:", "")

        # Look up patient
        patient = await patients_collection.find_one({"phone": phone})
        if not patient:
            # Try without country code variations
            patient = await patients_collection.find_one(
                {"phone": {"$regex": phone[-10:]}}
            )

        if not patient:
            logger.warning(f"Unknown sender: {phone}")
            return PlainTextResponse(
                '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
                media_type="text/xml",
            )

        patient_id = str(patient["_id"])
        language = patient.get("language_preference", "en")

        # Handle media messages
        message_text = body
        message_type = "text"

        if num_media > 0 and media_url:
            if "audio" in media_type or "ogg" in media_type:
                # Voice note - transcribe
                message_type = "voice"
                try:
                    from app.services.speech import speech_to_text
                    from app.services.whatsapp import download_media
                    audio_bytes = await download_media(media_url)
                    message_text = await speech_to_text(audio_bytes, language)
                    logger.info(f"Transcribed voice: {message_text[:50]}")
                except Exception as e:
                    logger.error(f"STT failed: {e}")
                    message_text = body or "Voice note received"

            elif "image" in media_type:
                # Photo - analyze wound
                message_type = "image"
                try:
                    from app.services.whatsapp import download_media
                    from app.services.wound_analyzer import analyze_wound
                    image_bytes = await download_media(media_url)
                    analysis = await analyze_wound(image_bytes)
                    message_text = f"[Photo sent] Wound analysis: {analysis.get('description', 'Image received')}"
                    logger.info(f"Wound analysis: {analysis}")
                except Exception as e:
                    logger.error(f"Wound analysis failed: {e}")
                    message_text = body or "Photo received"

        # Check for special commands
        lower_text = (message_text or "").lower().strip()
        if lower_text in ["call me", "mujhe call karo", "call cheyyi"]:
            try:
                from app.services.voice_call import initiate_callback
                await initiate_callback(patient_id)
                from app.services.whatsapp import send_message
                await send_message(patient["phone"], "We're calling you now. Please pick up!")
            except Exception as e:
                logger.error(f"Callback failed: {e}")
            return PlainTextResponse(
                '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
                media_type="text/xml",
            )

        if lower_text == "help":
            help_text = (
                "Available commands:\n"
                "- Send 'call me' for an AI callback\n"
                "- Send 'my report' for your recovery summary\n"
                "- Send a photo for wound analysis\n"
                "- Send a voice note and I'll understand\n"
                "- Send 'stop' to pause check-ins"
            )
            try:
                from app.services.whatsapp import send_message
                await send_message(patient["phone"], help_text)
            except Exception as e:
                logger.error(f"Help send failed: {e}")
            return PlainTextResponse(
                '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
                media_type="text/xml",
            )

        if lower_text == "stop":
            await patients_collection.update_one(
                {"_id": patient["_id"]}, {"$set": {"is_active": False}}
            )
            try:
                from app.services.whatsapp import send_message
                await send_message(patient["phone"], "Check-ins paused. Send 'start' to resume. Get well soon!")
            except Exception as e:
                logger.error(f"Stop send failed: {e}")
            return PlainTextResponse(
                '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
                media_type="text/xml",
            )

        if lower_text == "my report":
            try:
                from app.services.symptom_analyzer import get_recovery_score
                score = await get_recovery_score(patient_id)
                report = (
                    f"Recovery Report for {patient['name']}:\n"
                    f"Surgery: {patient.get('surgery_type', 'N/A')}\n"
                    f"Status: {patient.get('current_status', 'green').upper()}\n"
                    f"Recovery Score: {score}/100\n"
                    f"Keep following your doctor's advice!"
                )
                from app.services.whatsapp import send_message
                await send_message(patient["phone"], report)
            except Exception as e:
                logger.error(f"Report failed: {e}")
            return PlainTextResponse(
                '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
                media_type="text/xml",
            )

        # Normal message - process with AI brain
        try:
            from app.services.translator import detect_language, translate
            detected_lang = detect_language(message_text)
            english_text = message_text
            if detected_lang != "en":
                english_text = translate(message_text, detected_lang, "en")
        except Exception:
            english_text = message_text
            detected_lang = "en"

        # Pass to AI brain
        try:
            from app.services.ai_brain import process_message
            ai_response = await process_message(patient_id, english_text, message_type)
        except Exception as e:
            logger.error(f"AI brain failed: {e}")
            ai_response = {
                "reply_to_patient": "Thank you for your message. Your doctor has been notified.",
                "detected_symptoms": [],
                "risk_level": "green",
                "risk_score": 0,
                "reasoning": "AI processing error",
                "escalation_needed": False,
                "escalation_level": 0,
            }

        reply = ai_response.get("reply_to_patient", "Thank you for your update.")

        # Save conversation
        await conversations_collection.update_one(
            {"patient_id": patient_id},
            {
                "$push": {
                    "messages": {
                        "$each": [
                            {
                                "role": "patient",
                                "content": message_text,
                                "content_type": message_type,
                                "media_url": media_url,
                                "language": detected_lang if 'detected_lang' in dir() else "en",
                                "timestamp": utc_now(),
                            },
                            {
                                "role": "ai",
                                "content": reply,
                                "content_type": "text",
                                "language": language,
                                "timestamp": utc_now(),
                            },
                        ]
                    }
                },
                "$set": {"updated_at": utc_now()},
            },
            upsert=True,
        )

        # Save check-in
        from app.utils.helpers import days_since
        day_num = days_since(patient.get("surgery_date", utc_now()))
        checkin_doc = {
            "patient_id": patient_id,
            "day_number": day_num,
            "type": "patient_initiated",
            "questions_asked": [],
            "responses": [{
                "question": "",
                "answer": message_text,
                "answer_type": message_type,
                "original_language": detected_lang if 'detected_lang' in dir() else "en",
                "translated_answer": english_text if 'english_text' in dir() else message_text,
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
        checkin_result = await checkins_collection.insert_one(checkin_doc)

        # Update patient status
        new_status = ai_response.get("risk_level", "green")
        await patients_collection.update_one(
            {"_id": patient["_id"]},
            {
                "$set": {
                    "current_status": new_status,
                    "risk_score": ai_response.get("risk_score", 0),
                    "updated_at": utc_now(),
                }
            },
        )

        # Run escalation if needed
        if ai_response.get("escalation_needed"):
            try:
                from app.services.escalation import evaluate_and_escalate
                await evaluate_and_escalate(patient_id, checkin_doc)
            except Exception as e:
                logger.error(f"Escalation failed: {e}")

        # Send reply
        try:
            from app.services.whatsapp import send_message
            await send_message(patient["phone"], reply)
        except Exception as e:
            logger.error(f"Reply send failed: {e}")

        # Emit socket event
        try:
            from app.main import sio
            await sio.emit("new_checkin", {
                "patient_id": patient_id,
                "patient_name": patient["name"],
                "status": new_status,
                "message": message_text[:100],
                "timestamp": utc_now().isoformat(),
            })
            if new_status in ["red", "critical"]:
                await sio.emit("new_alert", {
                    "patient_id": patient_id,
                    "patient_name": patient["name"],
                    "level": ai_response.get("escalation_level", 2),
                    "title": f"Status changed to {new_status.upper()}",
                    "timestamp": utc_now().isoformat(),
                })
        except Exception as e:
            logger.warning(f"Socket emit failed: {e}")

    except Exception as e:
        logger.error(f"Webhook error: {e}")

    return PlainTextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        media_type="text/xml",
    )
