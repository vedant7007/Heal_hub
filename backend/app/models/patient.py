from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class FamilyContact(BaseModel):
    name: str
    phone: str
    relation: str  # son/daughter/spouse/parent


class Medicine(BaseModel):
    name: str
    dosage: str
    frequency: str
    taken_count: int = 0
    total_count: int = 0


class CheckinSchedule(BaseModel):
    days: List[int] = Field(default_factory=lambda: [1, 3, 5, 7, 14, 21, 30])
    time: str = "10:00"


class PatientCreate(BaseModel):
    name: str
    phone: str
    age: int
    gender: str = "male"
    language_preference: str = "en"
    surgery_type: str
    surgery_date: datetime
    hospital: str = ""
    additional_notes: str = ""
    family_contacts: List[FamilyContact] = Field(default_factory=list)
    checkin_schedule: CheckinSchedule = Field(default_factory=CheckinSchedule)
    medicines: List[Medicine] = Field(default_factory=list)
    onboarding_complete: bool = False
    active_checkin: Optional[dict] = None
    callback_requests: List[dict] = Field(default_factory=list)
    conversation_state: str = "new"
    agent_context: dict = Field(default_factory=dict)
    last_interaction_at: Optional[datetime] = None


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    language_preference: Optional[str] = None
    surgery_type: Optional[str] = None
    surgery_date: Optional[datetime] = None
    hospital: Optional[str] = None
    additional_notes: Optional[str] = None
    family_contacts: Optional[List[FamilyContact]] = None
    checkin_schedule: Optional[CheckinSchedule] = None
    current_status: Optional[str] = None
    risk_score: Optional[int] = None
    medicines: Optional[List[Medicine]] = None
    is_active: Optional[bool] = None
    onboarding_complete: Optional[bool] = None
    active_checkin: Optional[dict] = None
    callback_requests: Optional[List[dict]] = None
    conversation_state: Optional[str] = None
    agent_context: Optional[dict] = None
    last_interaction_at: Optional[datetime] = None


class PatientResponse(BaseModel):
    id: str = ""
    name: str
    phone: str
    age: int
    gender: str = "male"
    language_preference: str = "en"
    surgery_type: str
    surgery_date: Optional[datetime] = None
    hospital: str = ""
    doctor_id: str = ""
    family_contacts: List[FamilyContact] = Field(default_factory=list)
    checkin_schedule: CheckinSchedule = Field(default_factory=CheckinSchedule)
    current_status: str = "green"
    risk_score: int = 0
    medicines: List[Medicine] = Field(default_factory=list)
    is_active: bool = True
    onboarding_complete: bool = False
    active_checkin: Optional[dict] = None
    callback_requests: List[dict] = Field(default_factory=list)
    conversation_state: str = "new"
    agent_context: dict = Field(default_factory=dict)
    last_interaction_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    days_since_surgery: int = 0
