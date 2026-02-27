from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CheckinResponse(BaseModel):
    question: str
    answer: str
    answer_type: str = "text"  # text/voice/photo
    original_language: str = "en"
    translated_answer: str = ""
    timestamp: Optional[datetime] = None


class WoundAnalysis(BaseModel):
    description: str = ""
    risk_level: str = "normal"  # normal/mild_concern/infection_risk
    confidence: float = 0.0


class AIAssessment(BaseModel):
    risk_level: str = "green"
    risk_score: int = 0
    reasoning: str = ""
    recommended_action: str = ""


class CheckinCreate(BaseModel):
    patient_id: str
    day_number: int = 0
    type: str = "scheduled"  # scheduled/patient_initiated/callback
    questions_asked: List[str] = []
    responses: List[CheckinResponse] = []
    pain_score: Optional[int] = None
    symptoms_detected: List[str] = []
    wound_photo_url: Optional[str] = None
    wound_analysis: Optional[WoundAnalysis] = None
    medicine_taken: Optional[bool] = None
    ai_assessment: AIAssessment = AIAssessment()
    escalation_triggered: bool = False
    escalation_level: Optional[int] = None


class CheckinOut(BaseModel):
    id: str = ""
    patient_id: str = ""
    day_number: int = 0
    type: str = "scheduled"
    questions_asked: List[str] = []
    responses: List[CheckinResponse] = []
    pain_score: Optional[int] = None
    symptoms_detected: List[str] = []
    wound_photo_url: Optional[str] = None
    wound_analysis: Optional[WoundAnalysis] = None
    medicine_taken: Optional[bool] = None
    ai_assessment: AIAssessment = AIAssessment()
    escalation_triggered: bool = False
    escalation_level: Optional[int] = None
    created_at: Optional[datetime] = None
