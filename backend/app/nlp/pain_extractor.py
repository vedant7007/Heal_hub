"""
Custom Pain Score Extractor — Uses regex patterns and NLP rules.
Extracts numerical pain scores from free text in any format.
This is rule-based NLP, not an LLM call.
"""
import re


PAIN_PATTERNS = [
    # Direct numbers: "pain is 7", "7/10 pain", "pain 8"
    (r'pain\s*(?:is|=|:)?\s*(\d{1,2})\s*(?:/\s*10)?', 'direct'),
    (r'(\d{1,2})\s*/\s*10\s*(?:pain)?', 'scale'),
    (r'(?:level|score)\s*(?:is|=|:)?\s*(\d{1,2})', 'level'),

    # Descriptive: "severe pain", "mild discomfort"
    (r'\b(no|zero|none)\b.*?(?:pain|discomfort|ache)', 'word_none'),
    (r'\b(mild|slight|little|minor)\b.*?(?:pain|discomfort|ache)', 'word_mild'),
    (r'\b(moderate|medium|some|manageable)\b.*?(?:pain|discomfort|ache)', 'word_moderate'),
    (r'\b(severe|bad|strong|terrible|horrible|intense)\b.*?(?:pain|discomfort|ache)', 'word_severe'),
    (r'\b(extreme|unbearable|worst|excruciating|agonizing|10)\b.*?(?:pain|discomfort|ache)', 'word_extreme'),

    # Reverse order: "pain is severe"
    (r'(?:pain|discomfort|ache).*?\b(no|zero|none|gone|resolved)\b', 'word_none'),
    (r'(?:pain|discomfort|ache).*?\b(mild|slight|little|less|reducing)\b', 'word_mild'),
    (r'(?:pain|discomfort|ache).*?\b(moderate|medium|some|okay|ok)\b', 'word_moderate'),
    (r'(?:pain|discomfort|ache).*?\b(severe|bad|strong|terrible|worse|increasing)\b', 'word_severe'),
    (r'(?:pain|discomfort|ache).*?\b(extreme|unbearable|worst|excruciating)\b', 'word_extreme'),

    # Hindi patterns
    (r'दर्द.*?(\d{1,2})', 'hindi_number'),
    (r'(हल्का|थोड़ा)\s*दर्द', 'hindi_mild'),
    (r'(बहुत|तेज़?|ज़्यादा)\s*दर्द', 'hindi_severe'),
    (r'(असहनीय|बर्दाश्त\s*नहीं)\s*दर्द', 'hindi_extreme'),

    # Telugu patterns
    (r'నొప్పి.*?(\d{1,2})', 'telugu_number'),
    (r'(తేలికపాటి|కొద్దిగా)\s*నొప్పి', 'telugu_mild'),
    (r'(చాలా|తీవ్రమైన|ఎక్కువ)\s*నొప్పి', 'telugu_severe'),
]

WORD_TO_SCORE = {
    'word_none': 0, 'word_mild': 3, 'word_moderate': 5,
    'word_severe': 7, 'word_extreme': 9,
    'hindi_mild': 3, 'hindi_severe': 7, 'hindi_extreme': 9,
    'telugu_mild': 3, 'telugu_severe': 7,
}


def extract_pain_score(text: str) -> dict:
    """
    Extract pain score from any format of text input.
    Returns: {"score": int|None, "confidence": float, "method": str, "raw_match": str}
    """
    text_lower = text.lower().strip()

    for pattern, pattern_type in PAIN_PATTERNS:
        search_text = text_lower if pattern_type.startswith(('direct', 'scale', 'level', 'word')) else text
        match = re.search(pattern, search_text)
        if match:
            if pattern_type in ('direct', 'scale', 'level', 'hindi_number', 'telugu_number'):
                score = max(0, min(10, int(match.group(1))))
                return {
                    "score": score,
                    "confidence": 0.95,
                    "method": f"regex_{pattern_type}",
                    "raw_match": match.group(0),
                }
            elif pattern_type in WORD_TO_SCORE:
                return {
                    "score": WORD_TO_SCORE[pattern_type],
                    "confidence": 0.75,
                    "method": f"keyword_{pattern_type}",
                    "raw_match": match.group(0),
                }

    # Last resort: bare number 0-10
    if text_lower.strip().isdigit():
        score = int(text_lower.strip())
        if 0 <= score <= 10:
            return {"score": score, "confidence": 0.9, "method": "bare_number", "raw_match": text_lower}

    return {"score": None, "confidence": 0.0, "method": "none", "raw_match": ""}


def extract_pain_trend(pain_history: list) -> dict:
    """
    Analyze pain score trend over multiple check-ins.
    Returns trend analysis — pure math, no AI.
    """
    if len(pain_history) < 2:
        return {"trend": "insufficient_data", "direction": "unknown", "alert": False}

    recent = pain_history[-3:]

    if all(recent[i] < recent[i + 1] for i in range(len(recent) - 1)):
        direction = "increasing"
        alert = True
    elif all(recent[i] > recent[i + 1] for i in range(len(recent) - 1)):
        direction = "decreasing"
        alert = False
    elif recent[-1] == recent[0]:
        direction = "stable"
        alert = recent[-1] >= 7
    else:
        direction = "fluctuating"
        alert = max(recent) >= 8

    change_rate = (recent[-1] - recent[0]) / len(recent)

    # Spike detection (sudden jump of 3+)
    spike = False
    for i in range(1, len(pain_history)):
        if pain_history[i] - pain_history[i - 1] >= 3:
            spike = True
            break

    return {
        "trend": direction,
        "direction": "worsening" if direction == "increasing" else "improving" if direction == "decreasing" else direction,
        "change_rate": round(change_rate, 2),
        "current": recent[-1],
        "previous": recent[0],
        "spike_detected": spike,
        "alert": alert,
        "consecutive_increases": _count_consecutive_increases(pain_history),
        "days_above_7": sum(1 for p in pain_history if p >= 7),
    }


def _count_consecutive_increases(scores: list) -> int:
    count = 0
    max_count = 0
    for i in range(1, len(scores)):
        if scores[i] > scores[i - 1]:
            count += 1
            max_count = max(max_count, count)
        else:
            count = 0
    return max_count
