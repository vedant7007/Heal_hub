from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class DoctorRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str = ""
    specialization: str = ""
    hospital: str = ""
    role: Literal["doctor", "nurse"] = "doctor"


class DoctorLogin(BaseModel):
    email: EmailStr
    password: str


class DoctorResponse(BaseModel):
    id: str = Field(alias="_id", default="")
    name: str
    email: str
    phone: str = ""
    specialization: str = ""
    hospital: str = ""
    role: Literal["doctor", "nurse"] = "doctor"
    created_at: Optional[datetime] = None

    class Config:
        populate_by_name = True


class DoctorInDB(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str = ""
    specialization: str = ""
    hospital: str = ""
    role: Literal["doctor", "nurse"] = "doctor"
    created_at: datetime = None
