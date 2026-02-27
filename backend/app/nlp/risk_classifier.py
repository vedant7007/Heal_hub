"""
Custom Risk Classifier — Rule-based ML scoring system.
Calculates risk using weighted features, no LLM needed.
This is essentially a custom classification model.
"""
from typing import Optional


# Feature weights (tuned by us — this IS our model)
WEIGHTS = {
    # Symptom severity weights
    "bleeding": 25,
    "infection": 25,
    "pus": 25,
    "discharge": 20,
    "fever": 20,
    "high_fever": 30,
    "blood": 20,
    "chest_pain": 30,
    "breathlessness": 25,
    "swelling": 10,
    "redness": 10,
    "nausea": 8,
    "vomiting": 12,
    "dizziness": 10,
    "weakness": 8,
    "pain": 5,

    # Modifiers
    "pain_per_point_above_5": 5,
    "consecutive_pain_increase": 15,
    "post_day3_fever": 20,
    "no_response_48h": 25,
    "medicine_not_taken": 10,
    "multiple_symptoms": 10,

    # Protective factors (reduce risk)
    "improving_pain": -15,
    "medicine_taken": -10,
    "day_over_14_green": -10,
    "positive_sentiment": -5,
}

THRESHOLDS = {
    "green": (0, 25),
    "yellow": (26, 50),
    "red": (51, 75),
    "critical": (76, 100),
}


def classify_risk(
    symptoms: list,
    pain_score: Optional[int],
    pain_history: list,
    medicine_taken: Optional[bool],
    days_since_surgery: int,
    sentiment: dict,
    last_response_hours: float = 0,
) -> dict:
    """
    Custom risk classification using weighted feature scoring.
    Returns: risk_level, risk_score, contributing_factors, explanation.
    """
    total_score = 0
    factors = []

    # 1. Symptom scoring
    for symptom in symptoms:
        symptom_lower = symptom.lower()
        for key, weight in WEIGHTS.items():
            if key in symptom_lower:
                total_score += weight
                factors.append(f"+{weight}: {symptom} detected")
                break

    # 2. Pain scoring
    if pain_score is not None:
        if pain_score > 5:
            extra = (pain_score - 5) * WEIGHTS["pain_per_point_above_5"]
            total_score += extra
            factors.append(f"+{extra}: Pain {pain_score}/10 (above threshold)")
        elif pain_score <= 3:
            total_score -= 5
            factors.append(f"-5: Low pain ({pain_score}/10)")

    # 3. Pain trend analysis
    if len(pain_history) >= 3:
        last3 = pain_history[-3:]
        if all(last3[i] < last3[i + 1] for i in range(2)):
            total_score += WEIGHTS["consecutive_pain_increase"]
            factors.append(f"+{WEIGHTS['consecutive_pain_increase']}: 3 consecutive pain increases ({last3})")
        elif all(last3[i] > last3[i + 1] for i in range(2)):
            total_score += WEIGHTS["improving_pain"]
            factors.append(f"{WEIGHTS['improving_pain']}: Pain improving ({last3})")

    # 4. Post-day-3 fever check (classic infection indicator)
    if days_since_surgery > 3 and "fever" in [s.lower() for s in symptoms]:
        total_score += WEIGHTS["post_day3_fever"]
        factors.append(f"+{WEIGHTS['post_day3_fever']}: Post-day-3 fever (possible infection)")

    # 5. Medicine adherence
    if medicine_taken is False:
        total_score += WEIGHTS["medicine_not_taken"]
        factors.append(f"+{WEIGHTS['medicine_not_taken']}: Medicine not taken")
    elif medicine_taken is True:
        total_score += WEIGHTS["medicine_taken"]
        factors.append(f"{WEIGHTS['medicine_taken']}: Medicine taken regularly")

    # 6. Multiple symptoms penalty
    if len(symptoms) >= 3:
        total_score += WEIGHTS["multiple_symptoms"]
        factors.append(f"+{WEIGHTS['multiple_symptoms']}: Multiple symptoms ({len(symptoms)})")

    # 7. Non-response check
    if last_response_hours > 48:
        total_score += WEIGHTS["no_response_48h"]
        factors.append(f"+{WEIGHTS['no_response_48h']}: No response for {int(last_response_hours)}h")

    # 8. Sentiment modifier
    if sentiment and sentiment.get("compound_score", 0) > 0.3:
        total_score += WEIGHTS["positive_sentiment"]
        factors.append(f"{WEIGHTS['positive_sentiment']}: Positive patient sentiment")

    # 9. Recovery stage bonus
    if days_since_surgery > 14 and total_score < 25:
        total_score += WEIGHTS["day_over_14_green"]
        factors.append(f"{WEIGHTS['day_over_14_green']}: Past 2 weeks, stable recovery")

    total_score = max(0, min(100, total_score))

    risk_level = "green"
    for level, (low, high) in THRESHOLDS.items():
        if low <= total_score <= high:
            risk_level = level
            break

    explanation = _generate_explanation(risk_level, total_score, factors, symptoms, pain_score, days_since_surgery)

    return {
        "risk_level": risk_level,
        "risk_score": total_score,
        "contributing_factors": factors,
        "explanation": explanation,
        "feature_count": len(factors),
        "danger_symptoms": [s for s in symptoms if s.lower() in {"bleeding", "infection", "pus", "fever", "blood", "discharge"}],
        "concern_symptoms": [s for s in symptoms if s.lower() in {"swelling", "redness", "nausea", "vomiting", "dizziness"}],
    }


def _generate_explanation(level, score, factors, symptoms, pain, days):
    if level == "green":
        return f"Patient is recovering normally on day {days}. Risk score {score}/100. No immediate concerns."
    elif level == "yellow":
        return f"Patient needs monitoring on day {days}. Risk score {score}/100. Symptoms: {', '.join(symptoms) if symptoms else 'none reported'}. Pain: {pain or 'not reported'}/10."
    elif level == "red":
        return f"ATTENTION NEEDED. Day {days}, risk score {score}/100. Concerning symptoms: {', '.join(symptoms)}. Pain: {pain or 'N/A'}/10. Doctor review recommended."
    else:
        return f"CRITICAL - IMMEDIATE ACTION. Day {days}, risk score {score}/100. Danger symptoms: {', '.join(symptoms)}. Pain: {pain or 'N/A'}/10. Emergency protocol activated."
