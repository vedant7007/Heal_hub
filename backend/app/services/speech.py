import logging
import traceback

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def speech_to_text(audio_bytes: bytes, language: str = "en") -> str:
    """Convert audio to text using Deepgram."""
    logger.info("speech_to_text called (bytes=%s, lang=%s)", len(audio_bytes), language)

    if not settings.DEEPGRAM_API_KEY:
        logger.warning("Deepgram API key missing; STT disabled")
        return ""

    try:
        import asyncio
        from deepgram import DeepgramClient, PrerecordedOptions

        client = DeepgramClient(settings.DEEPGRAM_API_KEY)

        lang_map = {"en": "en-IN", "hi": "hi", "te": "te"}
        dg_lang = lang_map.get(language, "en-IN")

        options = PrerecordedOptions(
            model="nova-2",
            language=dg_lang,
            smart_format=True,
        )

        payload = {"buffer": audio_bytes, "mimetype": "audio/ogg"}

        def _sync_transcribe():
            return client.listen.rest.v("1").transcribe_file(payload, options)

        response = await asyncio.to_thread(_sync_transcribe)

        transcript = response.results.channels[0].alternatives[0].transcript
        confidence = response.results.channels[0].alternatives[0].confidence
        logger.info("Deepgram transcript received (confidence=%s)", confidence)

        if transcript and transcript.strip():
            return transcript.strip()
        logger.warning("Deepgram transcript empty")
        return ""

    except Exception as e:
        logger.error("Deepgram STT failed: %s", type(e).__name__)
        traceback.print_exc()
        return ""


async def text_to_speech(text: str, language: str = "en") -> bytes:
    """Convert text to speech using ElevenLabs."""
    logger.info("text_to_speech called (chars=%s)", len(text))

    if not settings.ELEVENLABS_API_KEY:
        logger.warning("ElevenLabs API key missing; TTS disabled")
        return b""

    try:
        import asyncio

        voice_id = settings.ELEVENLABS_VOICE_ID or "21m00Tcm4TlvDq8ikWAM"

        def _sync_tts():
            from elevenlabs.client import ElevenLabs

            client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)
            return client.text_to_speech.convert(
                voice_id=voice_id,
                text=text,
                model_id="eleven_multilingual_v2",
            )

        audio = await asyncio.to_thread(_sync_tts)

        if isinstance(audio, bytes):
            audio_bytes = audio
        else:
            audio_bytes = b""
            for chunk in audio:
                audio_bytes += chunk

        logger.info("ElevenLabs audio generated (bytes=%s)", len(audio_bytes))
        return audio_bytes

    except Exception as e:
        logger.error("ElevenLabs TTS failed: %s", type(e).__name__)
        traceback.print_exc()
        return b""
