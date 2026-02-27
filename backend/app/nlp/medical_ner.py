"""
Custom Medical NER — Extracts medical entities from patient messages.
Uses spaCy EntityRuler with our own post-surgical medical vocabulary.
This is NOT an LLM call. This is pattern-based NLP built by us.
"""
import spacy

nlp = spacy.load("en_core_web_sm")

# ============================================================
# CUSTOM MEDICAL VOCABULARY — Domain-specific knowledge
# ============================================================

MEDICAL_PATTERNS = [
    # SYMPTOMS — Pain types
    {"label": "SYMPTOM", "pattern": "pain"},
    {"label": "SYMPTOM", "pattern": "severe pain"},
    {"label": "SYMPTOM", "pattern": "mild pain"},
    {"label": "SYMPTOM", "pattern": "sharp pain"},
    {"label": "SYMPTOM", "pattern": "throbbing pain"},
    {"label": "SYMPTOM", "pattern": "burning pain"},
    {"label": "SYMPTOM", "pattern": "dull ache"},
    {"label": "SYMPTOM", "pattern": "soreness"},
    {"label": "SYMPTOM", "pattern": "tenderness"},
    {"label": "SYMPTOM", "pattern": "discomfort"},
    {"label": "SYMPTOM", "pattern": "stiffness"},
    {"label": "SYMPTOM", "pattern": "cramping"},

    # SYMPTOMS — Post-surgical complications
    {"label": "SYMPTOM", "pattern": "swelling"},
    {"label": "SYMPTOM", "pattern": "redness"},
    {"label": "SYMPTOM", "pattern": "fever"},
    {"label": "SYMPTOM", "pattern": "high fever"},
    {"label": "SYMPTOM", "pattern": "temperature"},
    {"label": "SYMPTOM", "pattern": "chills"},
    {"label": "SYMPTOM", "pattern": "bleeding"},
    {"label": "SYMPTOM", "pattern": "blood"},
    {"label": "SYMPTOM", "pattern": "discharge"},
    {"label": "SYMPTOM", "pattern": "pus"},
    {"label": "SYMPTOM", "pattern": "infection"},
    {"label": "SYMPTOM", "pattern": "wound infection"},
    {"label": "SYMPTOM", "pattern": "nausea"},
    {"label": "SYMPTOM", "pattern": "vomiting"},
    {"label": "SYMPTOM", "pattern": "dizziness"},
    {"label": "SYMPTOM", "pattern": "breathlessness"},
    {"label": "SYMPTOM", "pattern": "shortness of breath"},
    {"label": "SYMPTOM", "pattern": "fatigue"},
    {"label": "SYMPTOM", "pattern": "weakness"},
    {"label": "SYMPTOM", "pattern": "numbness"},
    {"label": "SYMPTOM", "pattern": "tingling"},
    {"label": "SYMPTOM", "pattern": "itching"},
    {"label": "SYMPTOM", "pattern": "bruising"},
    {"label": "SYMPTOM", "pattern": "swollen"},
    {"label": "SYMPTOM", "pattern": "inflamed"},
    {"label": "SYMPTOM", "pattern": "hot to touch"},
    {"label": "SYMPTOM", "pattern": "loss of appetite"},
    {"label": "SYMPTOM", "pattern": "constipation"},
    {"label": "SYMPTOM", "pattern": "difficulty sleeping"},
    {"label": "SYMPTOM", "pattern": "headache"},

    # BODY PARTS — Surgical sites
    {"label": "BODY_PART", "pattern": "wound"},
    {"label": "BODY_PART", "pattern": "incision"},
    {"label": "BODY_PART", "pattern": "stitches"},
    {"label": "BODY_PART", "pattern": "sutures"},
    {"label": "BODY_PART", "pattern": "surgical site"},
    {"label": "BODY_PART", "pattern": "operated area"},
    {"label": "BODY_PART", "pattern": "abdomen"},
    {"label": "BODY_PART", "pattern": "knee"},
    {"label": "BODY_PART", "pattern": "hip"},
    {"label": "BODY_PART", "pattern": "shoulder"},
    {"label": "BODY_PART", "pattern": "chest"},
    {"label": "BODY_PART", "pattern": "back"},
    {"label": "BODY_PART", "pattern": "leg"},
    {"label": "BODY_PART", "pattern": "arm"},
    {"label": "BODY_PART", "pattern": "stomach"},
    {"label": "BODY_PART", "pattern": "heart"},
    {"label": "BODY_PART", "pattern": "eye"},
    {"label": "BODY_PART", "pattern": "spine"},

    # MEDICATIONS — Common post-surgical
    {"label": "MEDICATION", "pattern": "paracetamol"},
    {"label": "MEDICATION", "pattern": "ibuprofen"},
    {"label": "MEDICATION", "pattern": "antibiotics"},
    {"label": "MEDICATION", "pattern": "antibiotic"},
    {"label": "MEDICATION", "pattern": "painkiller"},
    {"label": "MEDICATION", "pattern": "painkillers"},
    {"label": "MEDICATION", "pattern": "medicine"},
    {"label": "MEDICATION", "pattern": "tablet"},
    {"label": "MEDICATION", "pattern": "capsule"},
    {"label": "MEDICATION", "pattern": "injection"},
    {"label": "MEDICATION", "pattern": "dressing"},
    {"label": "MEDICATION", "pattern": "bandage"},
    {"label": "MEDICATION", "pattern": "ointment"},
    {"label": "MEDICATION", "pattern": "cream"},
    {"label": "MEDICATION", "pattern": "syrup"},
    {"label": "MEDICATION", "pattern": "drip"},
    {"label": "MEDICATION", "pattern": "saline"},
    {"label": "MEDICATION", "pattern": "amoxicillin"},
    {"label": "MEDICATION", "pattern": "metformin"},
    {"label": "MEDICATION", "pattern": "omeprazole"},
    {"label": "MEDICATION", "pattern": "aspirin"},
    {"label": "MEDICATION", "pattern": "cefixime"},
    {"label": "MEDICATION", "pattern": "diclofenac"},

    # SEVERITY indicators
    {"label": "SEVERITY", "pattern": "very"},
    {"label": "SEVERITY", "pattern": "too much"},
    {"label": "SEVERITY", "pattern": "a lot"},
    {"label": "SEVERITY", "pattern": "extremely"},
    {"label": "SEVERITY", "pattern": "unbearable"},
    {"label": "SEVERITY", "pattern": "terrible"},
    {"label": "SEVERITY", "pattern": "worse"},
    {"label": "SEVERITY", "pattern": "getting worse"},
    {"label": "SEVERITY", "pattern": "increasing"},
    {"label": "SEVERITY", "pattern": "slightly"},
    {"label": "SEVERITY", "pattern": "a little"},
    {"label": "SEVERITY", "pattern": "improving"},
    {"label": "SEVERITY", "pattern": "better"},
    {"label": "SEVERITY", "pattern": "much better"},

    # TIME expressions
    {"label": "TIME_REF", "pattern": "today"},
    {"label": "TIME_REF", "pattern": "yesterday"},
    {"label": "TIME_REF", "pattern": "last night"},
    {"label": "TIME_REF", "pattern": "this morning"},
    {"label": "TIME_REF", "pattern": "since morning"},
    {"label": "TIME_REF", "pattern": "for 2 days"},
    {"label": "TIME_REF", "pattern": "for 3 days"},
    {"label": "TIME_REF", "pattern": "since surgery"},
    {"label": "TIME_REF", "pattern": "after eating"},

    # NEGATION
    {"label": "NEGATION", "pattern": "no"},
    {"label": "NEGATION", "pattern": "not"},
    {"label": "NEGATION", "pattern": "don't have"},
    {"label": "NEGATION", "pattern": "no longer"},
    {"label": "NEGATION", "pattern": "stopped"},
    {"label": "NEGATION", "pattern": "gone away"},
    {"label": "NEGATION", "pattern": "resolved"},
]

ruler = nlp.add_pipe("entity_ruler", before="ner")
ruler.add_patterns(MEDICAL_PATTERNS)


def extract_medical_entities(text: str) -> dict:
    """
    Extract medical entities from patient message.
    Returns structured medical data — NO LLM involved.
    """
    doc = nlp(text.lower())

    entities = {
        "symptoms": [],
        "body_parts": [],
        "medications": [],
        "severity_indicators": [],
        "time_references": [],
        "negations": [],
        "raw_entities": [],
    }

    for ent in doc.ents:
        entity_data = {
            "text": ent.text,
            "label": ent.label_,
            "start": ent.start_char,
            "end": ent.end_char,
        }
        entities["raw_entities"].append(entity_data)

        if ent.label_ == "SYMPTOM":
            entities["symptoms"].append(ent.text)
        elif ent.label_ == "BODY_PART":
            entities["body_parts"].append(ent.text)
        elif ent.label_ == "MEDICATION":
            entities["medications"].append(ent.text)
        elif ent.label_ == "SEVERITY":
            entities["severity_indicators"].append(ent.text)
        elif ent.label_ == "TIME_REF":
            entities["time_references"].append(ent.text)
        elif ent.label_ == "NEGATION":
            entities["negations"].append(ent.text)

    # Negation handling: if "no" appears before a symptom, remove it
    entities["symptoms"] = _apply_negation(doc, entities["symptoms"], entities["negations"])

    entities["symptoms"] = list(set(entities["symptoms"]))
    entities["body_parts"] = list(set(entities["body_parts"]))
    entities["medications"] = list(set(entities["medications"]))

    return entities


def _apply_negation(doc, symptoms: list, negations: list) -> list:
    """
    Custom negation detection — removes symptoms that are negated.
    E.g., "no fever" -> remove "fever" from symptoms
    """
    if not negations:
        return symptoms

    negated_symptoms = set()
    tokens = [t.text.lower() for t in doc]

    for i, token in enumerate(tokens):
        if token in ["no", "not", "don't", "doesn't", "haven't", "without", "gone", "stopped", "resolved"]:
            window = tokens[i + 1 : i + 4]
            for symptom in symptoms:
                if symptom.lower() in " ".join(window):
                    negated_symptoms.add(symptom)

    return [s for s in symptoms if s not in negated_symptoms]


# Multilingual keyword maps (for Hindi/Telugu messages)
HINDI_SYMPTOM_MAP = {
    "दर्द": "pain", "बुखार": "fever", "सूजन": "swelling",
    "खून": "bleeding", "उल्टी": "vomiting", "चक्कर": "dizziness",
    "कमजोरी": "weakness", "जलन": "burning", "खुजली": "itching",
    "सिरदर्द": "headache", "पेट दर्द": "stomach pain",
    "सांस लेने में तकलीफ": "breathlessness", "भूख नहीं": "loss of appetite",
}

TELUGU_SYMPTOM_MAP = {
    "నొప్పి": "pain", "జ్వరం": "fever", "వాపు": "swelling",
    "రక్తస్రావం": "bleeding", "వాంతి": "vomiting", "తలతిరుగుట": "dizziness",
    "బలహీనత": "weakness", "మంట": "burning", "దురద": "itching",
    "తలనొప్పి": "headache", "కడుపు నొప్పి": "stomach pain",
    "ఊపిరి ఆడకపోవడం": "breathlessness",
}


def extract_multilingual_symptoms(text: str, language: str) -> list:
    """Extract symptoms from Hindi/Telugu text using keyword mapping."""
    symptoms = []

    if language == "hi":
        for hindi_word, english_symptom in HINDI_SYMPTOM_MAP.items():
            if hindi_word in text:
                symptoms.append(english_symptom)
    elif language == "te":
        for telugu_word, english_symptom in TELUGU_SYMPTOM_MAP.items():
            if telugu_word in text:
                symptoms.append(english_symptom)

    # Also run English NER (handles mixed-language messages)
    english_entities = extract_medical_entities(text)
    symptoms.extend(english_entities["symptoms"])

    return list(set(symptoms))
