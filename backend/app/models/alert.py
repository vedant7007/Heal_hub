from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AlertCreate(BaseModel):
    patient_id: str
    doctor_id: str
    checkin_id: str = ""
    level: int = 1  # 1=mild, 2=serious, 3=high_risk, 4=emergency
    title: str
    description: str
    ai_reasoning: str = ""
    symptoms: List[str] = []
    status: str = "new"  # new/seen/acknowledged/resolved


class AlertUpdate(BaseModel):
    status: Optional[str] = None
    resolved_at: Optional[datetime] = None


class AlertOut(BaseModel):
    id: str = ""
    patient_id: str = ""
    doctor_id: str = ""
    checkin_id: str = ""
    level: int = 1
    title: str = ""
    description: str = ""
    ai_reasoning: str = ""
    symptoms: List[str] = []
    status: str = "new"
    resolved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    patient_name: str = ""
