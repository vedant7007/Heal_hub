from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from app.config import get_settings
from app.database import doctors_collection
from app.models.doctor import DoctorRegister, DoctorLogin, DoctorResponse
from app.utils.helpers import utc_now, objectid_to_str

router = APIRouter()
settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def create_token(doctor_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    payload = {"sub": doctor_id, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


async def get_current_doctor(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(
            credentials.credentials, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        doctor_id = payload.get("sub")
        if not doctor_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    doctor = await doctors_collection.find_one({"_id": ObjectId(doctor_id)})
    if not doctor:
        raise HTTPException(status_code=401, detail="Doctor not found")
    return objectid_to_str(doctor)


def require_roles(*allowed_roles: str):
    allowed = set(allowed_roles)

    async def _checker(doctor=Depends(get_current_doctor)):
        if doctor.get("role", "doctor") not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return doctor

    return _checker


@router.post("/register")
async def register(data: DoctorRegister):
    existing = await doctors_collection.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    doc = {
        "name": data.name,
        "email": data.email,
        "password": pwd_context.hash(data.password),
        "phone": data.phone,
        "specialization": data.specialization,
        "hospital": data.hospital,
        "role": data.role,
        "created_at": utc_now(),
    }
    result = await doctors_collection.insert_one(doc)
    token = create_token(str(result.inserted_id))
    return {
        "token": token,
        "doctor": {
            "id": str(result.inserted_id),
            "name": data.name,
            "email": data.email,
            "role": data.role,
        },
    }


@router.post("/login")
async def login(data: DoctorLogin):
    doctor = await doctors_collection.find_one({"email": data.email})
    if not doctor or not pwd_context.verify(data.password, doctor["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(str(doctor["_id"]))
    doc = objectid_to_str(doctor)
    doc.pop("password", None)
    return {"token": token, "doctor": doc}


@router.get("/me")
async def get_me(doctor=Depends(get_current_doctor)):
    doctor.pop("password", None)
    return doctor
