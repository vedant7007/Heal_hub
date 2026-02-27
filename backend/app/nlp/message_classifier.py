"""
Message Topic Classifier — Uses TF-IDF + Cosine Similarity.
Classifies patient messages into medical topics WITHOUT an LLM.
This is a classic ML text classification approach.
"""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


# Training corpus: examples for each topic (our domain knowledge)
TOPIC_CORPUS = {
    "pain_report": [
        "I have severe pain in my wound area",
        "pain is getting worse today",
        "my pain level is 8 out of 10",
        "it hurts a lot when I move",
        "the pain is unbearable since morning",
        "sharp pain near the stitches",
        "dull ache in the operated area",
        "pain increases at night",
        "took painkiller but still hurting",
    ],
    "wound_concern": [
        "my wound is looking red and swollen",
        "there is discharge from the surgical site",
        "wound is not healing properly",
        "stitches area has pus",
        "wound is bleeding again",
        "the incision site looks infected",
        "wound smells bad",
        "skin around wound is warm and red",
    ],
    "fever_report": [
        "I have fever since yesterday",
        "my temperature is 102 degrees",
        "feeling feverish and chills",
        "fever is not going down with medicine",
        "body temperature keeps fluctuating",
        "high fever with body ache",
    ],
    "medicine_query": [
        "should I take the antibiotic with food",
        "I missed my morning medicine dose",
        "when should I take the painkiller",
        "can I stop the antibiotics",
        "medicine is causing nausea",
        "what time should I take my tablet",
        "ran out of medicines need prescription",
    ],
    "recovery_query": [
        "when can I start walking normally",
        "how long until I fully recover",
        "can I go back to work",
        "is my recovery normal",
        "when can I exercise again",
        "can I take a shower now",
        "when are the stitches removed",
    ],
    "emergency": [
        "heavy bleeding from wound help",
        "I think the wound is seriously infected",
        "can't breathe properly chest pain",
        "feeling very dizzy about to faint",
        "vomiting blood please help",
        "sudden severe pain emergency",
    ],
    "emotional_support": [
        "I am feeling very worried about my recovery",
        "scared that something is wrong",
        "feeling depressed since the surgery",
        "can't sleep because of anxiety",
        "I feel helpless and alone",
        "very stressed about the healing",
    ],
    "appointment_request": [
        "I need to see the doctor",
        "can I schedule a follow up visit",
        "when is my next appointment",
        "I want to come to the hospital",
        "need doctor consultation",
    ],
    "gratitude": [
        "thank you doctor for your help",
        "I am feeling much better now thanks",
        "grateful for the care and treatment",
        "everything is going well thank you",
    ],
}

# Build TF-IDF model at module load time
_all_texts = []
_all_labels = []
for _label, _texts in TOPIC_CORPUS.items():
    _all_texts.extend(_texts)
    _all_labels.extend([_label] * len(_texts))

vectorizer = TfidfVectorizer(max_features=500, ngram_range=(1, 2), stop_words='english')
tfidf_matrix = vectorizer.fit_transform(_all_texts)


def classify_message_topic(message: str) -> dict:
    """
    Classify a patient message into medical topics using TF-IDF similarity.
    Returns top 3 most likely topics with confidence scores.
    """
    msg_vector = vectorizer.transform([message.lower()])
    similarities = cosine_similarity(msg_vector, tfidf_matrix)[0]

    # Average similarity per topic
    topic_scores = {}
    idx = 0
    for label, texts in TOPIC_CORPUS.items():
        topic_sims = similarities[idx : idx + len(texts)]
        topic_scores[label] = {
            "avg_similarity": float(np.mean(topic_sims)),
            "max_similarity": float(np.max(topic_sims)),
            "best_match": texts[int(np.argmax(topic_sims))],
        }
        idx += len(texts)

    sorted_topics = sorted(topic_scores.items(), key=lambda x: x[1]["avg_similarity"], reverse=True)

    top_topic = sorted_topics[0][0]
    top_confidence = sorted_topics[0][1]["avg_similarity"]

    return {
        "predicted_topic": top_topic,
        "confidence": round(top_confidence, 3),
        "top_3": [
            {"topic": t[0], "confidence": round(t[1]["avg_similarity"], 3)}
            for t in sorted_topics[:3]
        ],
        "is_medical": top_topic not in ["gratitude", "appointment_request"],
        "is_emergency": top_topic == "emergency" and top_confidence > 0.15,
        "needs_escalation": top_topic in ["emergency", "wound_concern", "fever_report"] and top_confidence > 0.2,
    }
