from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from app.database import appointments_collection, patients_collection
from app.routes.doctors import get_current_doctor
from app.utils.helpers import utc_now, objectid_to_str
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def format_appointment(doc: dict) -> dict:
    a = objectid_to_str(doc)
    a["id"] = a.pop("_id", "")
    return a


@router.get("")
async def list_appointments(doctor=Depends(get_current_doctor)):
    """List all appointments for the logged-in doctor."""
    doctor_id = str(doctor["_id"])
    cursor = appointments_collection.find({"doctor_id": doctor_id}).sort("date", 1)
    appointments = []
    async for doc in cursor:
        apt = format_appointment(doc)
        # Attach patient name
        if doc.get("patient_id"):
            try:
                patient = await patients_collection.find_one({"_id": ObjectId(doc["patient_id"])})
                apt["patient_name"] = patient["name"] if patient else "Unknown"
            except Exception:
                apt["patient_name"] = "Unknown"
        appointments.append(apt)
    return appointments


@router.post("")
async def create_appointment(body: dict, doctor=Depends(get_current_doctor)):
    """Create a new appointment."""
    patient_id = body.get("patient_id")
    date = body.get("date")
    time = body.get("time")
    apt_type = body.get("type", "follow-up")
    notes = body.get("notes", "")

    if not patient_id or not date or not time:
        raise HTTPException(400, "patient_id, date, and time are required")

    # Verify patient exists
    patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        raise HTTPException(404, "Patient not found")

    doc = {
        "patient_id": patient_id,
        "patient_name": patient["name"],
        "doctor_id": str(doctor["_id"]),
        "date": date,
        "time": time,
        "type": apt_type,
        "status": "confirmed",
        "notes": notes,
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }

    result = await appointments_collection.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Send WhatsApp notification to patient
    try:
        from app.services.whatsapp import send_message
        msg = (
            f"Hi {patient['name']}! Your {apt_type} appointment has been scheduled "
            f"for {date} at {time}. Please be on time. Reply 'help' for more options."
        )
        await send_message(patient["phone"], msg)
    except Exception as e:
        logger.warning(f"Failed to send appointment WhatsApp: {e}")

    return format_appointment(doc)


@router.put("/{appointment_id}")
async def update_appointment(appointment_id: str, body: dict, doctor=Depends(get_current_doctor)):
    """Update an appointment (status, date, time, notes)."""
    update_fields = {}
    for field in ["date", "time", "type", "status", "notes"]:
        if field in body:
            update_fields[field] = body[field]

    if not update_fields:
        raise HTTPException(400, "No fields to update")

    update_fields["updated_at"] = utc_now()

    result = await appointments_collection.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": update_fields},
    )

    if result.matched_count == 0:
        raise HTTPException(404, "Appointment not found")

    doc = await appointments_collection.find_one({"_id": ObjectId(appointment_id)})
    return format_appointment(doc)


@router.delete("/{appointment_id}")
async def delete_appointment(appointment_id: str, doctor=Depends(get_current_doctor)):
    """Delete an appointment."""
    result = await appointments_collection.delete_one({"_id": ObjectId(appointment_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Appointment not found")
    return {"message": "Appointment deleted"}
