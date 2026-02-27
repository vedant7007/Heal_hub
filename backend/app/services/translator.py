from langdetect import detect
from deep_translator import GoogleTranslator
import logging

logger = logging.getLogger(__name__)

SUPPORTED_LANGS = {"en", "hi", "te"}


def detect_language(text: str) -> str:
    """Detect language of text. Returns 'en', 'hi', or 'te'."""
    try:
        lang = detect(text)
        if lang in SUPPORTED_LANGS:
            return lang
        if lang == "mr" or lang == "ne":
            return "hi"  # Close enough for our purposes
        return "en"
    except Exception:
        return "en"


def translate(text: str, source_lang: str, target_lang: str) -> str:
    """Translate text between supported languages."""
    if source_lang == target_lang:
        return text
    try:
        # deep-translator uses ISO codes, Telugu = 'te'
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        result = translator.translate(text)
        return result or text
    except Exception as e:
        logger.error(f"Translation failed ({source_lang}->{target_lang}): {e}")
        return text
