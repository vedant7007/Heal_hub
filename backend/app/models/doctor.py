from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class DoctorRegister(BaseModel):
    name: str
    email: str
    password: str
    phone: str = ""
    specialization: str = ""
    hospital: str = ""


class DoctorLogin(BaseModel):
    email: str
    password: str


class DoctorResponse(BaseModel):
    id: str = Field(alias="_id", default="")
    name: str
    email: str
    phone: str = ""
    specialization: str = ""
    hospital: str = ""
    created_at: Optional[datetime] = None

    class Config:
        populate_by_name = True


class DoctorInDB(BaseModel):
    name: str
    email: str
    password: str
    phone: str = ""
    specialization: str = ""
    hospital: str = ""
    created_at: datetime = None
