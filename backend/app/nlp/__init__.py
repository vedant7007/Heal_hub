"""
Heal Hub NLP Pipeline — Unified interface for all 7 NLP modules.
This runs BEFORE the LLM sees the message.
The LLM gets enriched data from our NLP modules.
"""
from datetime import datetime, timezone

from app.nlp.medical_ner import extract_medical_entities, extract_multilingual_symptoms
from app.nlp.pain_extractor import extract_pain_score, extract_pain_trend
from app.nlp.sentiment_analyzer import analyze_patient_sentiment
from app.nlp.text_preprocessor import preprocess_message
from app.nlp.risk_classifier import classify_risk
from app.nlp.recovery_predictor import calculate_recovery_score
from app.nlp.message_classifier import classify_message_topic


async def run_nlp_pipeline(
    message: str,
    language: str,
    patient: dict,
    pain_history: list = None,
    symptoms_history: list = None,
) -> dict:
    """
    Run ALL 7 NLP modules on a patient message.
    Returns comprehensive NLP analysis BEFORE any LLM call.
    """

    # Step 1: Preprocess
    preprocessed = preprocess_message(message, language)
    clean_text = preprocessed["cleaned"]

    # Step 2: Medical NER
    if language == "en":
        entities = extract_medical_entities(clean_text)
    else:
        multilingual_symptoms = extract_multilingual_symptoms(message, language)
        entities = extract_medical_entities(clean_text)
        entities["symptoms"].extend(multilingual_symptoms)
        entities["symptoms"] = list(set(entities["symptoms"]))

    # Step 3: Pain extraction
    pain_result = extract_pain_score(message)  # Use original (handles Hindi/Telugu)

    # Step 4: Pain trend
    trend = extract_pain_trend(pain_history or [])

    # Step 5: Sentiment analysis
    sentiment = analyze_patient_sentiment(clean_text)

    # Step 6: Topic classification
    topic = classify_message_topic(clean_text)

    # Step 7: Risk classification
    days = 0
    if patient.get("surgery_date"):
        surgery = patient["surgery_date"]
        if isinstance(surgery, str):
            surgery = datetime.fromisoformat(surgery)
        now = datetime.now(timezone.utc)
        if surgery.tzinfo is None:
            surgery = surgery.replace(tzinfo=timezone.utc)
        days = (now - surgery).days

    risk = classify_risk(
        symptoms=entities["symptoms"],
        pain_score=pain_result["score"],
        pain_history=pain_history or [],
        medicine_taken=None,
        days_since_surgery=days,
        sentiment=sentiment,
    )

    return {
        "preprocessed": preprocessed,
        "entities": entities,
        "pain": pain_result,
        "pain_trend": trend,
        "sentiment": sentiment,
        "topic": topic,
        "risk": risk,
        "pipeline_version": "1.0.0",
        "modules_run": 7,
    }
