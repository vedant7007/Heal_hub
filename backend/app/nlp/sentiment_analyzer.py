"""
Patient Sentiment & Emotional State Analyzer.
Uses VADER sentiment + custom medical anxiety patterns.
NOT an LLM — pure NLP.
"""
import re
from nltk.sentiment.vader import SentimentIntensityAnalyzer

sid = SentimentIntensityAnalyzer()

# Custom medical anxiety lexicon (added on top of VADER)
MEDICAL_ANXIETY_WORDS = {
    "worried": -2.5, "scared": -3.0, "afraid": -3.0, "anxious": -2.5,
    "terrified": -3.5, "panicking": -3.5, "concerned": -1.5,
    "nervous": -2.0, "stressed": -2.0, "helpless": -3.0,
    "confused": -1.5, "frustrated": -2.0, "angry": -2.5,
    "depressed": -3.0, "hopeless": -3.5, "crying": -2.5,
    "can't sleep": -2.0, "nightmare": -2.5,
    # Positive medical
    "better": 2.0, "improving": 2.5, "recovered": 3.0,
    "healing": 2.5, "comfortable": 2.0, "relieved": 3.0,
    "hopeful": 2.5, "grateful": 3.0, "thankful": 2.5,
}

sid.lexicon.update(MEDICAL_ANXIETY_WORDS)

URGENCY_PATTERNS = [
    (r'\b(help|emergency|urgent|please help|someone help)\b', 'high'),
    (r'\b(dying|can\'t breathe|chest pain|heart|unconscious)\b', 'critical'),
    (r'\b(worried|concerned|scared|nervous|anxious)\b', 'moderate'),
    (r'\b(okay|fine|good|better|improving|great)\b', 'low'),
]


def analyze_patient_sentiment(text: str) -> dict:
    """
    Analyze patient's emotional state from their message.
    Returns sentiment score, emotional state, urgency level, needs_empathy flag.
    """
    scores = sid.polarity_scores(text)
    compound = scores['compound']

    if compound >= 0.5:
        emotion = "positive"
        state = "calm_and_improving"
    elif compound >= 0.1:
        emotion = "slightly_positive"
        state = "stable"
    elif compound >= -0.1:
        emotion = "neutral"
        state = "stable"
    elif compound >= -0.5:
        emotion = "negative"
        state = "anxious_or_uncomfortable"
    else:
        emotion = "very_negative"
        state = "distressed_or_in_pain"

    # Urgency detection
    urgency = "low"
    for pattern, level in URGENCY_PATTERNS:
        if re.search(pattern, text.lower()):
            urgency = level
            break

    needs_empathy = compound < -0.3 or urgency in ["moderate", "high", "critical"]

    # Detect specific emotions
    emotions_detected = []
    emotion_keywords = {
        "fear": ["scared", "afraid", "terrified", "frightened", "panicking"],
        "anxiety": ["worried", "anxious", "nervous", "stressed", "concerned"],
        "frustration": ["frustrated", "angry", "annoyed", "irritated", "tired of"],
        "sadness": ["sad", "depressed", "crying", "hopeless", "lonely"],
        "relief": ["relieved", "better", "grateful", "thankful", "happy"],
        "confusion": ["confused", "don't understand", "what should", "why is"],
    }
    text_lower = text.lower()
    for emotion_type, keywords in emotion_keywords.items():
        if any(kw in text_lower for kw in keywords):
            emotions_detected.append(emotion_type)

    return {
        "compound_score": round(compound, 3),
        "positive": round(scores['pos'], 3),
        "negative": round(scores['neg'], 3),
        "neutral": round(scores['neu'], 3),
        "emotion": emotion,
        "patient_state": state,
        "urgency": urgency,
        "needs_empathy": needs_empathy,
        "emotions_detected": emotions_detected,
        "ai_tone_suggestion": _suggest_tone(emotion, urgency, needs_empathy),
    }


def _suggest_tone(emotion: str, urgency: str, needs_empathy: bool) -> str:
    if urgency == "critical":
        return "urgent_and_reassuring"
    elif urgency == "high":
        return "empathetic_and_action_oriented"
    elif needs_empathy:
        return "warm_and_supportive"
    elif emotion in ["positive", "slightly_positive"]:
        return "encouraging_and_cheerful"
    else:
        return "professional_and_caring"
