"""
Multilingual Text Preprocessing Pipeline.
Handles messy WhatsApp text: emojis, abbreviations, spelling mistakes, code-mixing.
Pure NLP preprocessing — no LLM.
"""
import re
import unicodedata


# WhatsApp abbreviation dictionary (Indian English + medical)
ABBREVIATIONS = {
    # Common WhatsApp
    "u": "you", "ur": "your", "r": "are", "b4": "before",
    "pls": "please", "plz": "please", "thx": "thanks",
    "msg": "message", "tmrw": "tomorrow", "yday": "yesterday",
    "gud": "good", "gd": "good", "bt": "but", "bcz": "because",
    "bcoz": "because", "hw": "how", "wht": "what", "abt": "about",
    "dnt": "don't", "cnt": "can't", "wnt": "won't", "shd": "should",
    "hv": "have", "nt": "not", "frm": "from", "2day": "today",
    "2dy": "today", "2mrw": "tomorrow", "k": "okay", "ok": "okay",
    "v": "we", "d": "the", "n": "and", "m": "am",

    # Medical abbreviations patients use
    "doc": "doctor", "dr": "doctor", "hosp": "hospital",
    "med": "medicine", "meds": "medicines", "tab": "tablet",
    "inj": "injection", "bp": "blood pressure", "temp": "temperature",
    "op": "operation", "surg": "surgery",

    # Hindi transliterated (common in WhatsApp)
    "dard": "pain", "bukhar": "fever", "sujan": "swelling",
    "khoon": "bleeding", "ulti": "vomiting", "chakkar": "dizziness",
    "kamzori": "weakness", "neend": "sleep", "bhook": "appetite",
    "dawai": "medicine", "goli": "tablet", "patti": "bandage",
    "doctor sahab": "doctor", "hospital jana": "go to hospital",

    # Telugu transliterated
    "noppi": "pain", "jwaram": "fever", "vapu": "swelling",
    "raktham": "bleeding", "vanti": "vomiting",
}

# Emoji to meaning mapping (medical context)
MEDICAL_EMOJIS = {
    "\U0001f915": "pain", "\U0001f912": "fever", "\U0001f637": "sick",
    "\U0001f92e": "vomiting", "\U0001f630": "worried", "\U0001f622": "sad",
    "\U0001f62d": "crying", "\U0001f623": "in pain", "\U0001fa78": "bleeding",
    "\U0001f48a": "medicine", "\U0001f3e5": "hospital", "\U0001f44d": "good",
    "\U0001f44e": "bad", "\u2705": "yes", "\u274c": "no",
    "\U0001f64f": "please", "\U0001f60a": "happy", "\U0001f610": "neutral",
}


def preprocess_message(text: str, language: str = "en") -> dict:
    """
    Full preprocessing pipeline for patient WhatsApp messages.
    Returns cleaned text + metadata.
    """
    original = text

    # Step 1: Extract and interpret emojis
    emojis_found = _extract_emojis(text)
    emoji_meanings = [MEDICAL_EMOJIS.get(e, "") for e in emojis_found]
    emoji_meanings = [m for m in emoji_meanings if m]

    # Step 2: Remove emojis from text
    text = _remove_emojis(text)

    # Step 3: Normalize unicode
    text = unicodedata.normalize("NFC", text)

    # Step 4: Expand abbreviations
    words = text.split()
    expanded = []
    for word in words:
        clean_word = word.lower().strip(".,!?;:")
        if clean_word in ABBREVIATIONS:
            expanded.append(ABBREVIATIONS[clean_word])
        else:
            expanded.append(word)
    text = " ".join(expanded)

    # Step 5: Remove excessive punctuation/repetition
    text = re.sub(r'(.)\1{3,}', r'\1\1', text)  # "painnnnn" -> "painn"
    text = re.sub(r'[!]{2,}', '!', text)
    text = re.sub(r'[?]{2,}', '?', text)

    # Step 6: Clean whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    # Step 7: Detect code-mixing (run on ORIGINAL text before expansion)
    code_mixed_symptoms = _detect_code_mixing(original)

    return {
        "original": original,
        "cleaned": text,
        "language": language,
        "emojis": emojis_found,
        "emoji_meanings": emoji_meanings,
        "code_mixed_symptoms": code_mixed_symptoms,
        "word_count": len(text.split()),
        "has_medical_content": bool(emoji_meanings or code_mixed_symptoms),
    }


def _extract_emojis(text: str) -> list:
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U0001F1E0-\U0001F1FF"
        "\U00002702-\U000027B0"
        "\U0001FA70-\U0001FAFF"
        "]+",
        flags=re.UNICODE,
    )
    return emoji_pattern.findall(text)


def _remove_emojis(text: str) -> str:
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U0001F1E0-\U0001F1FF"
        "\U00002702-\U000027B0"
        "\U0001FA70-\U0001FAFF"
        "]+",
        flags=re.UNICODE,
    )
    return emoji_pattern.sub('', text)


def _detect_code_mixing(text: str) -> list:
    """Detect Hindi/Telugu medical words written in English (transliterated)."""
    found = []
    text_lower = text.lower()
    transliterated_medical = {
        "dard": "pain", "bukhar": "fever", "sujan": "swelling",
        "khoon": "bleeding", "ulti": "vomiting", "patti": "bandage",
        "dawai": "medicine", "noppi": "pain", "jwaram": "fever",
    }
    for word, meaning in transliterated_medical.items():
        if word in text_lower:
            found.append({"original": word, "meaning": meaning})
    return found
