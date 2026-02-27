from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class Message(BaseModel):
    role: str  # ai/patient
    content: str
    content_type: str = "text"  # text/voice/image
    media_url: Optional[str] = None
    language: str = "en"
    timestamp: Optional[datetime] = None


class ConversationOut(BaseModel):
    id: str = ""
    patient_id: str = ""
    messages: List[Message] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
