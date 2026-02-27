import logging
import traceback
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def speech_to_text(audio_bytes: bytes, language: str = "en") -> str:
    """Convert audio to text using Deepgram."""
    print(f"[STT] speech_to_text called — {len(audio_bytes)} bytes, lang={language}")

    if not settings.DEEPGRAM_API_KEY:
        print(f"[STT] DEEPGRAM_API_KEY is empty — STT not configured!")
        return ""

    print(f"[STT] Deepgram key loaded: {settings.DEEPGRAM_API_KEY[:10]}...")

    try:
        from deepgram import DeepgramClient, PrerecordedOptions
        import asyncio

        client = DeepgramClient(settings.DEEPGRAM_API_KEY)

        lang_map = {"en": "en-IN", "hi": "hi", "te": "te"}
        dg_lang = lang_map.get(language, "en-IN")
        print(f"[STT] Using Deepgram language: {dg_lang}")

        options = PrerecordedOptions(
            model="nova-2",
            language=dg_lang,
            smart_format=True,
        )

        payload = {"buffer": audio_bytes, "mimetype": "audio/ogg"}

        # Deepgram SDK v3 — use sync in thread to avoid event loop issues
        def _sync_transcribe():
            return client.listen.rest.v("1").transcribe_file(payload, options)

        print(f"[STT] Calling Deepgram API...")
        response = await asyncio.to_thread(_sync_transcribe)

        transcript = response.results.channels[0].alternatives[0].transcript
        confidence = response.results.channels[0].alternatives[0].confidence
        print(f"[STT] Deepgram result: '{transcript}' (confidence={confidence})")

        if transcript and transcript.strip():
            return transcript.strip()
        else:
            print(f"[STT] Transcript was empty")
            return ""

    except Exception as e:
        print(f"[STT] Deepgram STT FAILED: {type(e).__name__}: {e}")
        traceback.print_exc()
        return ""


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
