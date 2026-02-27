from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017/healhub"

    # Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_NUMBER: str = "whatsapp:+14155238886"
    TWILIO_PHONE_NUMBER: str = ""

    # Google Gemini
    GEMINI_API_KEY: str = ""

    # Anthropic
    ANTHROPIC_API_KEY: str = ""

    # Deepgram
    DEEPGRAM_API_KEY: str = ""

    # ElevenLabs
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = ""

    # App Config
    APP_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"
    APP_TIMEZONE: str = "Asia/Kolkata"
    CORS_ORIGINS: str = "http://localhost:3000"
    SOCKET_CORS_ORIGINS: str = "http://localhost:3000"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 72
    PORT: int = 8000

    def get_cors_origins(self) -> list[str]:
        return [s.strip() for s in self.CORS_ORIGINS.split(",") if s.strip()]

    def get_socket_cors_origins(self) -> list[str]:
        return [s.strip() for s in self.SOCKET_CORS_ORIGINS.split(",") if s.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
