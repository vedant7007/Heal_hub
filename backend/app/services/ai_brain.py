import json
import logging
from datetime import datetime
from bson import ObjectId
from app.config import get_settings
from app.database import patients_collection, checkins_collection, conversations_collection
from app.utils.helpers import days_since, utc_now

logger = logging.getLogger(__name__)
settings = get_settings()

SYSTEM_PROMPT = """You are Heal Hub AI, a caring and professional post-surgery follow-up nurse assistant.

Patient Info:
- Name: {name}
- Surgery: {surgery_type} on {surgery_date} ({days_since} days ago)
- Language: {language}
- Current Status: {status}
- Known symptoms: {symptoms}
- Pain trend: {pain_scores}
- Medicines: {medicines}

Previous check-in summary:
{previous_checkin_summary}

Your tasks:
1. Understand the patient's message and detect any symptoms: pain, swelling, fever, bleeding, redness, discharge, nausea, breathlessness
2. Score the risk: green (normal recovery), yellow (needs monitoring), red (alert doctor), critical (emergency)
3. Provide your reasoning for the risk assessment
4. Reply to the patient in {language} — be warm, empathetic, not robotic
5. If they ask medical questions, answer carefully with disclaimers

ALWAYS respond in this exact JSON format (no markdown, no code blocks):
{{
  "reply_to_patient": "string (in patient's language)",
  "detected_symptoms": ["array of symptoms"],
  "pain_score": null,
  "medicine_taken": null,
  "risk_level": "green",
  "risk_score": 0,
  "reasoning": "string (in English, explain WHY this risk level)",
  "recommended_action": "string (what should happen next)",
  "escalation_needed": false,
  "escalation_level": 0,
  "next_question": null
}}"""


async def _get_patient_context(patient_id: str) -> dict:
    patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return {}

    # Get recent check-ins
    checkins = []
    cursor = checkins_collection.find({"patient_id": patient_id}).sort("created_at", -1).limit(5)
    async for c in cursor:
        checkins.append(c)

    pain_scores = [c.get("pain_score") for c in checkins if c.get("pain_score") is not None]
    all_symptoms = []
    for c in checkins:
        all_symptoms.extend(c.get("symptoms_detected", []))

    # Build check-in summary
    summaries = []
    for c in checkins[:3]:
        assessment = c.get("ai_assessment", {})
        summaries.append(
            f"Day {c.get('day_number', '?')}: Risk={assessment.get('risk_level', 'unknown')}, "
            f"Pain={c.get('pain_score', 'N/A')}, Symptoms={c.get('symptoms_detected', [])}"
        )

    medicines_str = ", ".join(
        [f"{m['name']} ({m['dosage']})" for m in patient.get("medicines", [])]
    ) or "None listed"

    surgery_date = patient.get("surgery_date", utc_now())
    return {
        "name": patient.get("name", "Patient"),
        "surgery_type": patient.get("surgery_type", "General"),
        "surgery_date": surgery_date.strftime("%Y-%m-%d") if surgery_date else "Unknown",
        "days_since": days_since(surgery_date) if surgery_date else 0,
        "language": patient.get("language_preference", "en"),
        "status": patient.get("current_status", "green"),
        "symptoms": list(set(all_symptoms))[:10] or ["None reported"],
        "pain_scores": pain_scores[:5] or ["No data"],
        "medicines": medicines_str,
        "previous_checkin_summary": "\n".join(summaries) or "No previous check-ins",
    }


def _parse_ai_response(text: str) -> dict:
    """Parse JSON from AI response, handling markdown code blocks."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in the text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass

    # Fallback
    return {
        "reply_to_patient": text[:500] if text else "Thank you for your update. Your doctor has been notified.",
        "detected_symptoms": [],
        "pain_score": None,
        "medicine_taken": None,
        "risk_level": "green",
        "risk_score": 10,
        "reasoning": "Could not parse AI response",
        "recommended_action": "Continue monitoring",
        "escalation_needed": False,
        "escalation_level": 0,
        "next_question": None,
    }


async def process_message(patient_id: str, message_text: str, message_type: str = "text") -> dict:
    """Core AI processing function. Calls Gemini, falls back to Claude."""
    context = await _get_patient_context(patient_id)
    if not context:
        return {
            "reply_to_patient": "Thank you for your message.",
            "detected_symptoms": [],
            "risk_level": "green",
            "risk_score": 0,
            "reasoning": "Patient not found",
            "escalation_needed": False,
            "escalation_level": 0,
        }

    prompt = SYSTEM_PROMPT.format(**context)
    user_msg = f"Patient message ({message_type}): {message_text}"

    # Try Gemini first
    try:
        result = await _call_gemini(prompt, user_msg)
        if result:
            return result
    except Exception as e:
        logger.error(f"Gemini failed: {e}")

    # Fallback to Claude
    try:
        result = await _call_claude(prompt, user_msg)
        if result:
            return result
    except Exception as e:
        logger.error(f"Claude failed: {e}")

    # Final fallback
    return {
        "reply_to_patient": "Thank you for your update. I've noted your response and your doctor will review it.",
        "detected_symptoms": [],
        "pain_score": None,
        "medicine_taken": None,
        "risk_level": "green",
        "risk_score": 10,
        "reasoning": "AI services temporarily unavailable",
        "recommended_action": "Continue monitoring",
        "escalation_needed": False,
        "escalation_level": 0,
    }


async def _call_gemini(system_prompt: str, user_message: str) -> dict:
    if not settings.GEMINI_API_KEY:
        return None

    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")

    response = model.generate_content(
        f"{system_prompt}\n\n{user_message}",
        generation_config=genai.types.GenerationConfig(
            temperature=0.3,
            max_output_tokens=1000,
        ),
    )
    return _parse_ai_response(response.text)


async def _call_claude(system_prompt: str, user_message: str) -> dict:
    if not settings.ANTHROPIC_API_KEY:
        return None

    import anthropic
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    response = client.messages.create(
        model="claude-3-5-haiku-20241022",
        max_tokens=1000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return _parse_ai_response(response.content[0].text)


async def generate_checkin_questions(patient_id: str, day_number: int) -> list:
    """Generate check-in questions based on surgery type and day."""
    patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return ["How are you feeling today?"]

    surgery = patient.get("surgery_type", "General")

    # Day-specific question templates
    questions_map = {
        1: [
            "How are you feeling after the surgery? Rate your pain from 1 to 10.",
            "Have you been able to eat and drink normally?",
            "Did you take your prescribed medicines today?",
        ],
        3: [
            "How is your pain compared to Day 1? (1-10)",
            "Is there any swelling, redness, or warmth near the surgical area?",
            "Can you send a photo of the surgical wound?",
            "Are you able to move/walk as instructed?",
        ],
        5: [
            "How is your pain today? (1-10)",
            "Any fever, chills, or unusual discharge from the wound?",
            "Are you following the diet plan given by your doctor?",
        ],
        7: [
            "How would you rate your overall recovery so far? (1-10)",
            "Any new symptoms this week?",
            "Please send an updated wound photo.",
            "Have you scheduled your follow-up appointment?",
        ],
        14: [
            "How are you feeling two weeks after surgery?",
            "Are you able to resume light daily activities?",
            "Any lingering pain or discomfort?",
        ],
        21: [
            "How is your recovery progressing?",
            "Any concerns you'd like to share with your doctor?",
        ],
        30: [
            "It's been a month since your surgery! How are you feeling?",
            "Rate your overall recovery: 1 (poor) to 10 (fully recovered)",
            "Any ongoing symptoms?",
        ],
    }

    # Find closest day
    closest = min(questions_map.keys(), key=lambda d: abs(d - day_number))
    return questions_map[closest]
