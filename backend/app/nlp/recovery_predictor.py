"""
Recovery Score Calculator & Prediction Model.
Uses weighted algorithm + basic trend prediction.
This is our custom scoring MODEL — not an LLM.
"""
import math
from typing import List


def calculate_recovery_score(
    current_status: str,
    pain_scores: List[int],
    symptoms_per_checkin: List[List[str]],
    medicine_adherence: List[bool],
    days_since_surgery: int,
    total_checkins: int,
    wound_analyses: list = None,
) -> dict:
    """
    Comprehensive recovery scoring — multi-factor algorithm.
    Score = Base + Pain + Symptoms + Adherence + Time + Wound + Engagement
    """
    base = 50

    # ===== PAIN COMPONENT (max +/-25) =====
    pain_component = 0
    if pain_scores:
        latest_pain = pain_scores[-1]
        pain_component = 25 - (latest_pain * 2.5)

        if len(pain_scores) >= 3:
            trend = pain_scores[-1] - pain_scores[-3]
            if trend < 0:
                pain_component += min(5, abs(trend) * 2)
            elif trend > 0:
                pain_component -= min(10, trend * 3)

    # ===== SYMPTOM COMPONENT (max +/-20) =====
    symptom_component = 0
    danger_symptoms = {"bleeding", "infection", "pus", "fever", "blood", "discharge"}

    if symptoms_per_checkin:
        latest_symptoms = symptoms_per_checkin[-1] if symptoms_per_checkin[-1] else []

        if not latest_symptoms:
            symptom_component = 15
        else:
            symptom_component = -len(latest_symptoms) * 5
            for s in latest_symptoms:
                if s.lower() in danger_symptoms:
                    symptom_component -= 10

        if len(symptoms_per_checkin) >= 2:
            prev_count = len(symptoms_per_checkin[-2]) if symptoms_per_checkin[-2] else 0
            curr_count = len(latest_symptoms)
            if curr_count < prev_count:
                symptom_component += 5

    # ===== ADHERENCE COMPONENT (max +/-15) =====
    adherence_component = 0
    if medicine_adherence:
        adherence_rate = sum(1 for m in medicine_adherence if m) / len(medicine_adherence)
        adherence_component = (adherence_rate - 0.5) * 30

    # ===== TIME COMPONENT (max +10) =====
    time_component = 0
    if days_since_surgery > 0:
        time_component = min(10, math.log(days_since_surgery + 1) * 3)

    # ===== WOUND COMPONENT (max +/-10) =====
    wound_component = 0
    if wound_analyses:
        latest_wound = wound_analyses[-1]
        risk = latest_wound.get("risk_level", "normal")
        if risk == "normal":
            wound_component = 10
        elif risk == "mild_concern":
            wound_component = -5
        elif risk == "infection_risk":
            wound_component = -15

    # ===== CHECKIN ENGAGEMENT (max +5) =====
    engagement_component = 0
    expected_checkins = max(1, days_since_surgery // 3)
    if total_checkins >= expected_checkins:
        engagement_component = 5

    total = base + pain_component + symptom_component + adherence_component + time_component + wound_component + engagement_component
    total = max(0, min(100, round(total)))

    predicted_days = _predict_recovery_days(total, days_since_surgery)

    return {
        "recovery_score": total,
        "components": {
            "base": base,
            "pain": round(pain_component, 1),
            "symptoms": round(symptom_component, 1),
            "adherence": round(adherence_component, 1),
            "time": round(time_component, 1),
            "wound": round(wound_component, 1),
            "engagement": engagement_component,
        },
        "grade": _score_to_grade(total),
        "predicted_full_recovery_days": predicted_days,
        "summary": _generate_summary(total, days_since_surgery),
    }


def _score_to_grade(score: int) -> str:
    if score >= 85:
        return "A (Excellent Recovery)"
    elif score >= 70:
        return "B (Good Recovery)"
    elif score >= 55:
        return "C (Moderate Recovery)"
    elif score >= 40:
        return "D (Slow Recovery)"
    else:
        return "F (Needs Attention)"


def _predict_recovery_days(current_score, days_elapsed):
    if current_score >= 90:
        return max(0, 30 - days_elapsed)
    elif current_score >= 70:
        return max(0, 45 - days_elapsed)
    elif current_score >= 50:
        return max(0, 60 - days_elapsed)
    else:
        return max(0, 90 - days_elapsed)


def _generate_summary(score, days):
    if score >= 80:
        return f"Excellent recovery on day {days}. Patient is on track for a smooth recovery."
    elif score >= 60:
        return f"Good progress on day {days}. Some areas need monitoring but overall positive trajectory."
    elif score >= 40:
        return f"Recovery is slower than expected on day {days}. Recommend closer monitoring and follow-up."
    else:
        return f"Recovery needs attention on day {days}. Multiple risk factors identified. Recommend doctor review."
