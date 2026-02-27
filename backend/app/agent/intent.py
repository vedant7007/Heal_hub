"""
AI Intent Detector — Uses Claude Haiku 4.5 to classify patient intent
instead of keyword matching.  Falls back to regex if AI is unavailable.
"""
import json
import logging
import asyncio
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

INTENT_PROMPT = """You are an intent classifier for a medical recovery WhatsApp bot.

The patient said: "{message}"

Classify the intent into EXACTLY ONE of these categories:
- "greeting" — hi, hello, hey, namaste, any greeting
- "report_symptoms" — describing how they feel, pain, discomfort, any health update
- "send_photo" — wants to send or is asking about sending a wound photo
- "check_medicines" — asking about their medicines, dosage, schedule
- "get_report" — wants recovery report, progress, status
- "book_appointment" — wants to see the doctor, book a visit, schedule meeting
- "request_callback_ai" — wants the AI to call them back
- "request_callback_hospital" — wants the hospital or a human to call them
- "talk_to_doctor" — wants to speak directly to the doctor right now
- "change_language" — wants to switch language
- "help" — asking for help, what can you do, commands
- "show_menu" — wants to see options, menu
- "affirmative" — yes, ok, sure, haan, avunu, confirming something
- "negative" — no, nahi, ledu, declining something
- "number_response" — replied with just a number (1,2,3 etc)
- "pain_report" — specifically reporting a pain level number
- "stop" — wants to stop receiving messages
- "general_chat" — casual conversation, questions, anything else

Also detect the language: "en", "hi", or "te"

Respond with ONLY this JSON (no markdown):
{{"intent": "...", "language": "...", "extracted_number": null, "confidence": 0.95}}

If the message contains a number, put it in extracted_number.
"""


async def detect_intent(message: str) -> dict:
    """Use AI to detect patient's intent from their message."""
    if not settings.ANTHROPIC_API_KEY:
        return _fallback_intent(message)

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = await asyncio.to_thread(
            client.messages.create,
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": INTENT_PROMPT.format(message=message[:500]),
            }],
        )
        text = response.content[0].text.strip()

        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()

        result = json.loads(text)
        logger.info("Intent detected: %s (confidence=%.2f)", result.get("intent"), result.get("confidence", 0))
        return result
    except Exception as e:
        logger.warning("AI intent detection failed, using fallback: %s", e)
        return _fallback_intent(message)


def _fallback_intent(message: str) -> dict:
    """Keyword-based intent when AI is unavailable."""
    msg = message.lower().strip()
    base = {"language": "en", "extracted_number": None, "confidence": 0.7}

    # Pure number
    if msg.isdigit():
        return {**base, "intent": "number_response", "extracted_number": int(msg)}

    # Greetings
    greetings = [
        "hi", "hello", "hey", "hii", "hiii", "namaste", "namaskar",
        "నమస్కారం", "నమస్తే", "नमस्ते", "start",
    ]
    if msg in greetings or any(msg.startswith(g + " ") for g in greetings):
        return {**base, "intent": "greeting"}

    # Menu
    if msg in ["menu", "मेनू", "మెనూ", "options"]:
        return {**base, "intent": "show_menu"}

    # Stop
    if msg == "stop":
        return {**base, "intent": "stop"}

    # Call me (AI callback)
    call_words = [
        "call me", "call karo", "mujhe call", "call cheyyi",
        "నాకు కాల్", "कॉल", "phone karo", "call kar do",
    ]
    if any(w in msg for w in call_words):
        return {**base, "intent": "request_callback_ai"}

    # Hospital callback
    if ("hospital" in msg and "call" in msg) or msg in ["hospital call", "hospital callback", "अस्पताल कॉल", "ఆస్పత్రి కాల్"]:
        return {**base, "intent": "request_callback_hospital"}

    # Doctor
    doctor_words = ["doctor", "talk to doctor", "डॉक्टर", "డాక్టర్"]
    if msg in doctor_words or any(w in msg for w in ["talk to doctor"]):
        return {**base, "intent": "talk_to_doctor"}

    # Appointment
    if msg in ["appointment", "book appointment", "अपॉइंटमेंट", "అపాయింట్‌మెంట్"]:
        return {**base, "intent": "book_appointment"}

    # Photo
    if msg in ["photo", "wound photo", "फोटो", "ఫోటో"]:
        return {**base, "intent": "send_photo"}

    # Medicines
    if msg in ["medicines", "medicine", "my medicines", "दवाइयां", "మందులు"]:
        return {**base, "intent": "check_medicines"}

    # Report
    if msg in ["report", "my report", "रिपोर्ट", "రిపోర్ట్"]:
        return {**base, "intent": "get_report"}

    # Symptoms
    if msg in ["symptoms", "report symptoms", "लक्षण", "లక్షణాలు"]:
        return {**base, "intent": "report_symptoms"}

    # Language
    if msg in ["language", "भाषा", "భాష", "change language"]:
        return {**base, "intent": "change_language"}

    # Help
    if msg in ["help", "मदद", "సహాయం"]:
        return {**base, "intent": "help"}

    # Affirmative
    if msg in ["yes", "ok", "sure", "haan", "ha", "avunu", "हां", "అవును", "okay"]:
        return {**base, "intent": "affirmative"}

    # Negative
    if msg in ["no", "nahi", "nope", "ledu", "नहीं", "లేదు"]:
        return {**base, "intent": "negative"}

    return {**base, "intent": "general_chat", "confidence": 0.4}
