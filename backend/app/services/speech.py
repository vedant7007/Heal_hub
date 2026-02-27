import logging
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def speech_to_text(audio_bytes: bytes, language: str = "en") -> str:
    """Convert audio to text using Deepgram."""
    if not settings.DEEPGRAM_API_KEY:
        return "Voice note received (STT not configured)"

    try:
        from deepgram import DeepgramClient, PrerecordedOptions

        client = DeepgramClient(settings.DEEPGRAM_API_KEY)

        lang_map = {"en": "en-IN", "hi": "hi", "te": "te"}
        options = PrerecordedOptions(
            model="nova-2",
            language=lang_map.get(language, "en-IN"),
            smart_format=True,
        )

        response = client.listen.rest.v("1").transcribe_file(
            {"buffer": audio_bytes, "mimetype": "audio/ogg"},
            options,
        )

        transcript = response.results.channels[0].alternatives[0].transcript
        return transcript or "Could not transcribe audio"

    except Exception as e:
        logger.error(f"Deepgram STT failed: {e}")
        return "Voice note received (transcription failed)"


async def text_to_speech(text: str, language: str = "en") -> bytes:
    """Convert text to speech using ElevenLabs."""
    if not settings.ELEVENLABS_API_KEY:
        return b""

    try:
        from elevenlabs import ElevenLabs

        client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)
        voice_id = settings.ELEVENLABS_VOICE_ID or "21m00Tcm4TlvDq8ikWAM"

        audio = client.text_to_speech.convert(
            voice_id=voice_id,
            text=text,
            model_id="eleven_multilingual_v2",
        )

        # Collect audio bytes from generator
        audio_bytes = b""
        for chunk in audio:
            audio_bytes += chunk

        return audio_bytes

    except Exception as e:
        logger.error(f"ElevenLabs TTS failed: {e}")
        return b""
