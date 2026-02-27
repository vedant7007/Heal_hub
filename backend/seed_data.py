"""
Seed script to populate MongoDB with demo data for Heal Hub.
Run: python seed_data.py
"""
import asyncio
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from bson import ObjectId

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Load settings
try:
    from app.config import get_settings
    settings = get_settings()
    MONGODB_URI = settings.MONGODB_URI
except Exception:
    import os
    from dotenv import load_dotenv
    load_dotenv()
    MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/healhub")


def utc_now():
    return datetime.now(timezone.utc)


def days_ago(n):
    return utc_now() - timedelta(days=n)


async def seed():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client.get_default_database("healhub")

    # Clear existing data
    for col in ["doctors", "patients", "checkins", "alerts", "conversations"]:
        await db[col].delete_many({})

    print("Cleared existing data")

    # ── Doctors ──
    doctor1_id = ObjectId()
    doctor2_id = ObjectId()

    doctors = [
        {
            "_id": doctor1_id,
            "name": "Dr. Priya Sharma",
            "email": "priya@healhub.com",
            "password": pwd_context.hash("doctor123"),
            "phone": "+919876543210",
            "specialization": "Orthopedic Surgery",
            "hospital": "Apollo Hospital, Hyderabad",
            "created_at": days_ago(30),
        },
        {
            "_id": doctor2_id,
            "name": "Dr. Ravi Reddy",
            "email": "ravi@healhub.com",
            "password": pwd_context.hash("doctor123"),
            "phone": "+919876543211",
            "specialization": "Cardiac Surgery",
            "hospital": "KIMS Hospital, Hyderabad",
            "created_at": days_ago(30),
        },
    ]
    await db["doctors"].insert_many(doctors)
    print("Seeded 2 doctors")

    # ── Patients ──
    patients = []
    patient_ids = [ObjectId() for _ in range(8)]

    # Patient 1: Ramesh - GREEN, smooth recovery
    patients.append({
        "_id": patient_ids[0],
        "name": "Ramesh Kumar",
        "phone": "+919900110001",
        "age": 45,
        "gender": "male",
        "language_preference": "en",
        "surgery_type": "Knee Replacement",
        "surgery_date": days_ago(7),
        "hospital": "Apollo Hospital, Hyderabad",
        "doctor_id": str(doctor1_id),
        "family_contacts": [
            {"name": "Sunita Kumar", "phone": "+919900220001", "relation": "spouse"},
        ],
        "checkin_schedule": {"days": [1, 3, 5, 7, 14, 21, 30], "time": "10:00"},
        "current_status": "green",
        "risk_score": 12,
        "medicines": [
            {"name": "Paracetamol", "dosage": "500mg", "frequency": "twice daily", "taken_count": 12, "total_count": 14},
            {"name": "Cefixime", "dosage": "200mg", "frequency": "twice daily", "taken_count": 13, "total_count": 14},
        ],
        "is_active": True,
        "created_at": days_ago(7),
        "updated_at": utc_now(),
    })

    # Patient 2: Lakshmi - YELLOW, increasing pain
    patients.append({
        "_id": patient_ids[1],
        "name": "Lakshmi Devi",
        "phone": "+919900110002",
        "age": 58,
        "gender": "female",
        "language_preference": "te",
        "surgery_type": "Hip Replacement",
        "surgery_date": days_ago(5),
        "hospital": "Apollo Hospital, Hyderabad",
        "doctor_id": str(doctor1_id),
        "family_contacts": [
            {"name": "Venkat Rao", "phone": "+919900220002", "relation": "son"},
        ],
        "checkin_schedule": {"days": [1, 3, 5, 7, 14, 21, 30], "time": "10:00"},
        "current_status": "yellow",
        "risk_score": 45,
        "medicines": [
            {"name": "Tramadol", "dosage": "50mg", "frequency": "as needed", "taken_count": 8, "total_count": 10},
            {"name": "Amoxicillin", "dosage": "500mg", "frequency": "three times daily", "taken_count": 12, "total_count": 15},
        ],
        "is_active": True,
        "created_at": days_ago(5),
        "updated_at": utc_now(),
    })

    # Patient 3: Suresh - RED, wound infection signs
    patients.append({
        "_id": patient_ids[2],
        "name": "Suresh Babu",
        "phone": "+919900110003",
        "age": 62,
        "gender": "male",
        "language_preference": "hi",
        "surgery_type": "Appendectomy",
        "surgery_date": days_ago(4),
        "hospital": "Apollo Hospital, Hyderabad",
        "doctor_id": str(doctor1_id),
        "family_contacts": [
            {"name": "Meena Babu", "phone": "+919900220003", "relation": "spouse"},
            {"name": "Raj Babu", "phone": "+919900220004", "relation": "son"},
        ],
        "checkin_schedule": {"days": [1, 3, 5, 7, 14, 21, 30], "time": "10:00"},
        "current_status": "red",
        "risk_score": 72,
        "medicines": [
            {"name": "Ceftriaxone", "dosage": "1g", "frequency": "once daily", "taken_count": 3, "total_count": 7},
            {"name": "Metronidazole", "dosage": "400mg", "frequency": "three times daily", "taken_count": 8, "total_count": 12},
        ],
        "is_active": True,
        "created_at": days_ago(4),
        "updated_at": utc_now(),
    })

    # Patient 4: Anjali - CRITICAL, no response for 2 days
    patients.append({
        "_id": patient_ids[3],
        "name": "Anjali Reddy",
        "phone": "+919900110004",
        "age": 70,
        "gender": "female",
        "language_preference": "te",
        "surgery_type": "Cardiac Bypass",
        "surgery_date": days_ago(6),
        "hospital": "KIMS Hospital, Hyderabad",
        "doctor_id": str(doctor2_id),
        "family_contacts": [
            {"name": "Srinivas Reddy", "phone": "+919900220005", "relation": "son"},
            {"name": "Padma Reddy", "phone": "+919900220006", "relation": "daughter"},
        ],
        "checkin_schedule": {"days": [1, 2, 3, 5, 7, 10, 14, 21, 30], "time": "10:00"},
        "current_status": "critical",
        "risk_score": 88,
        "medicines": [
            {"name": "Aspirin", "dosage": "75mg", "frequency": "once daily", "taken_count": 4, "total_count": 6},
            {"name": "Atorvastatin", "dosage": "40mg", "frequency": "once daily", "taken_count": 4, "total_count": 6},
            {"name": "Metoprolol", "dosage": "25mg", "frequency": "twice daily", "taken_count": 8, "total_count": 12},
        ],
        "is_active": True,
        "created_at": days_ago(6),
        "updated_at": days_ago(2),
    })

    # Patient 5: Ravi - GREEN
    patients.append({
        "_id": patient_ids[4],
        "name": "Ravi Teja",
        "phone": "+919900110005",
        "age": 35,
        "gender": "male",
        "language_preference": "en",
        "surgery_type": "ACL Reconstruction",
        "surgery_date": days_ago(14),
        "hospital": "Apollo Hospital, Hyderabad",
        "doctor_id": str(doctor1_id),
        "family_contacts": [
            {"name": "Preethi Teja", "phone": "+919900220007", "relation": "spouse"},
        ],
        "checkin_schedule": {"days": [1, 3, 5, 7, 14, 21, 30], "time": "10:00"},
        "current_status": "green",
        "risk_score": 8,
        "medicines": [
            {"name": "Ibuprofen", "dosage": "400mg", "frequency": "as needed", "taken_count": 5, "total_count": 14},
        ],
        "is_active": True,
        "created_at": days_ago(14),
        "updated_at": utc_now(),
    })

    # Patient 6: Padma - YELLOW
    patients.append({
        "_id": patient_ids[5],
        "name": "Padma Lakshmi",
        "phone": "+919900110006",
        "age": 50,
        "gender": "female",
        "language_preference": "hi",
        "surgery_type": "Gallbladder Removal",
        "surgery_date": days_ago(3),
        "hospital": "KIMS Hospital, Hyderabad",
        "doctor_id": str(doctor2_id),
        "family_contacts": [],
        "checkin_schedule": {"days": [1, 3, 7, 14], "time": "10:00"},
        "current_status": "yellow",
        "risk_score": 38,
        "medicines": [
            {"name": "Pantoprazole", "dosage": "40mg", "frequency": "once daily", "taken_count": 3, "total_count": 7},
        ],
        "is_active": True,
        "created_at": days_ago(3),
        "updated_at": utc_now(),
    })

    # Patient 7: Krishna - GREEN
    patients.append({
        "_id": patient_ids[6],
        "name": "Krishna Murthy",
        "phone": "+919900110007",
        "age": 55,
        "gender": "male",
        "language_preference": "te",
        "surgery_type": "Hernia Repair",
        "surgery_date": days_ago(10),
        "hospital": "Apollo Hospital, Hyderabad",
        "doctor_id": str(doctor1_id),
        "family_contacts": [
            {"name": "Savitri Murthy", "phone": "+919900220008", "relation": "spouse"},
        ],
        "checkin_schedule": {"days": [1, 3, 5, 7, 14, 21, 30], "time": "10:00"},
        "current_status": "green",
        "risk_score": 15,
        "medicines": [
            {"name": "Paracetamol", "dosage": "650mg", "frequency": "as needed", "taken_count": 6, "total_count": 10},
        ],
        "is_active": True,
        "created_at": days_ago(10),
        "updated_at": utc_now(),
    })

    # Patient 8: Fatima - GREEN
    patients.append({
        "_id": patient_ids[7],
        "name": "Fatima Begum",
        "phone": "+919900110008",
        "age": 42,
        "gender": "female",
        "language_preference": "hi",
        "surgery_type": "C-Section",
        "surgery_date": days_ago(21),
        "hospital": "KIMS Hospital, Hyderabad",
        "doctor_id": str(doctor2_id),
        "family_contacts": [
            {"name": "Ahmed Khan", "phone": "+919900220009", "relation": "spouse"},
        ],
        "checkin_schedule": {"days": [1, 3, 5, 7, 14, 21, 30], "time": "10:00"},
        "current_status": "green",
        "risk_score": 5,
        "medicines": [
            {"name": "Iron tablets", "dosage": "100mg", "frequency": "once daily", "taken_count": 20, "total_count": 30},
        ],
        "is_active": True,
        "created_at": days_ago(21),
        "updated_at": utc_now(),
    })

    await db["patients"].insert_many(patients)
    print(f"Seeded {len(patients)} patients")

    # ── Check-ins ──
    checkins = []

    # Ramesh check-ins (GREEN - smooth)
    for day, pain, status in [(1, 6, "green"), (3, 4, "green"), (5, 3, "green"), (7, 2, "green")]:
        checkins.append({
            "patient_id": str(patient_ids[0]),
            "day_number": day,
            "type": "scheduled",
            "questions_asked": ["How is your pain? (1-10)", "Did you take medicines?"],
            "responses": [
                {
                    "question": "How is your pain?",
                    "answer": f"Pain is {pain}/10, feeling better" if day > 1 else f"Pain is {pain}/10 but manageable",
                    "answer_type": "text",
                    "original_language": "en",
                    "translated_answer": f"Pain is {pain}/10",
                    "timestamp": days_ago(7 - day),
                }
            ],
            "pain_score": pain,
            "symptoms_detected": [] if day > 1 else ["mild pain"],
            "medicine_taken": True,
            "ai_assessment": {
                "risk_level": "green",
                "risk_score": max(5, 20 - day * 2),
                "reasoning": f"Day {day}: Pain decreasing from 6 to {pain}. Normal post-operative recovery. All vitals stable.",
                "recommended_action": "Continue current care plan",
            },
            "escalation_triggered": False,
            "escalation_level": 0,
            "created_at": days_ago(7 - day),
        })

    # Lakshmi check-ins (YELLOW - escalating pain)
    for day, pain, status in [(1, 4, "green"), (3, 6, "yellow"), (5, 7, "yellow")]:
        symptoms = ["pain"] if day == 3 else ["pain", "swelling"] if day == 5 else []
        checkins.append({
            "patient_id": str(patient_ids[1]),
            "day_number": day,
            "type": "scheduled",
            "questions_asked": ["Meeru ela feel avutunnaru?", "Pain score cheppandi"],
            "responses": [
                {
                    "question": "Pain score",
                    "answer": "Noppi ekkuva ayyindi" if day > 1 else "Noppi undi kaani bharistaanu",
                    "answer_type": "text",
                    "original_language": "te",
                    "translated_answer": f"Pain is increasing, now {pain}/10" if day > 1 else f"There is pain but I can bear it, {pain}/10",
                    "timestamp": days_ago(5 - day),
                }
            ],
            "pain_score": pain,
            "symptoms_detected": symptoms,
            "medicine_taken": True,
            "ai_assessment": {
                "risk_level": status,
                "risk_score": 20 + day * 8,
                "reasoning": f"Day {day}: Pain increasing from 4 to {pain}. {'Swelling reported. ' if 'swelling' in symptoms else ''}Needs close monitoring.",
                "recommended_action": "Increase check-in frequency" if status == "yellow" else "Continue monitoring",
            },
            "escalation_triggered": status == "yellow",
            "escalation_level": 1 if status == "yellow" else 0,
            "created_at": days_ago(5 - day),
        })

    # Suresh check-ins (RED - wound infection)
    for day, pain, status in [(1, 5, "green"), (3, 7, "yellow"), (4, 8, "red")]:
        symptoms = ["fever", "wound redness", "discharge"] if day == 4 else ["pain"] if day == 3 else []
        checkins.append({
            "patient_id": str(patient_ids[2]),
            "day_number": day,
            "type": "scheduled" if day < 4 else "patient_initiated",
            "questions_asked": ["Aap kaisa feel kar rahe hain?", "Wound ki photo bhejiye"],
            "responses": [
                {
                    "question": "How are you feeling?",
                    "answer": "Bukhar aa raha hai aur wound se kuch nikal raha hai" if day == 4 else "Dard zyada hai" if day == 3 else "Theek hoon",
                    "answer_type": "text",
                    "original_language": "hi",
                    "translated_answer": "Fever and discharge from wound" if day == 4 else "Pain is high" if day == 3 else "I'm okay",
                    "timestamp": days_ago(4 - day),
                }
            ],
            "pain_score": pain,
            "symptoms_detected": symptoms,
            "wound_photo_url": None,
            "wound_analysis": {
                "description": "Signs of infection visible — redness and possible discharge",
                "risk_level": "infection_risk",
                "confidence": 0.78,
            } if day == 4 else None,
            "medicine_taken": day < 4,
            "ai_assessment": {
                "risk_level": status,
                "risk_score": 30 + day * 12,
                "reasoning": f"Day {day}: {'CRITICAL - Fever + wound discharge detected. Possible surgical site infection. Immediate doctor review required.' if day == 4 else 'Pain increasing, monitor closely.' if day == 3 else 'Normal post-op day 1.'}",
                "recommended_action": "Immediate doctor consultation required" if day == 4 else "Continue monitoring",
            },
            "escalation_triggered": day >= 3,
            "escalation_level": 2 if day == 4 else 1 if day == 3 else 0,
            "created_at": days_ago(4 - day),
        })

    # Anjali check-ins (CRITICAL - no response)
    for day, pain, status in [(1, 5, "green"), (2, 6, "yellow"), (3, 7, "yellow")]:
        checkins.append({
            "patient_id": str(patient_ids[3]),
            "day_number": day,
            "type": "scheduled",
            "questions_asked": ["Meeru ela unnaru?", "Medicines theesukunnara?"],
            "responses": [
                {
                    "question": "How are you feeling?",
                    "answer": "Baagunnanu kaani chest lo konchum noppi undi" if day > 1 else "Operation tarvata weak ga undi",
                    "answer_type": "text",
                    "original_language": "te",
                    "translated_answer": "I'm okay but having some chest pain" if day > 1 else "Feeling weak after operation",
                    "timestamp": days_ago(6 - day),
                }
            ],
            "pain_score": pain,
            "symptoms_detected": ["chest pain", "weakness"] if day > 1 else ["weakness"],
            "medicine_taken": True,
            "ai_assessment": {
                "risk_level": status,
                "risk_score": 40 + day * 15,
                "reasoning": f"Day {day}: Post-cardiac bypass patient reporting {'chest pain — concerning for cardiac patient. ' if day > 1 else 'weakness — expected post-op. '}{'No response for 2+ days after day 3 — CRITICAL escalation.' if day == 3 else ''}",
                "recommended_action": "Urgent assessment needed" if day > 1 else "Continue monitoring",
            },
            "escalation_triggered": day > 1,
            "escalation_level": 2 if day == 3 else 1 if day == 2 else 0,
            "created_at": days_ago(6 - day),
        })

    # Ravi check-ins (GREEN - good recovery)
    for day, pain in [(1, 5), (3, 4), (5, 3), (7, 2), (14, 1)]:
        checkins.append({
            "patient_id": str(patient_ids[4]),
            "day_number": day,
            "type": "scheduled",
            "questions_asked": ["How's the knee?", "Can you bend it?"],
            "responses": [
                {
                    "question": "How's the knee?",
                    "answer": f"Getting better! Pain is {pain}/10. Started physiotherapy.",
                    "answer_type": "text",
                    "original_language": "en",
                    "translated_answer": f"Getting better, pain {pain}/10",
                    "timestamp": days_ago(14 - day),
                }
            ],
            "pain_score": pain,
            "symptoms_detected": [],
            "medicine_taken": True,
            "ai_assessment": {
                "risk_level": "green",
                "risk_score": max(3, 15 - day),
                "reasoning": f"Day {day}: Excellent recovery trajectory. Pain consistently decreasing. Following physiotherapy.",
                "recommended_action": "Continue current plan",
            },
            "escalation_triggered": False,
            "escalation_level": 0,
            "created_at": days_ago(14 - day),
        })

    await db["checkins"].insert_many(checkins)
    print(f"Seeded {len(checkins)} check-ins")

    # ── Alerts ──
    alerts = [
        {
            "patient_id": str(patient_ids[1]),
            "doctor_id": str(doctor1_id),
            "checkin_id": "",
            "level": 1,
            "title": "Increasing pain — Lakshmi Devi",
            "description": "Pain score has increased from 4 to 7 over 5 days. Swelling reported.",
            "ai_reasoning": "Pain trend is upward over 3 consecutive check-ins. Swelling in surgical area reported on day 5. Recommend closer monitoring and possible medication adjustment.",
            "symptoms": ["pain", "swelling"],
            "status": "new",
            "resolved_at": None,
            "created_at": days_ago(0),
        },
        {
            "patient_id": str(patient_ids[2]),
            "doctor_id": str(doctor1_id),
            "checkin_id": "",
            "level": 2,
            "title": "Possible wound infection — Suresh Babu",
            "description": "Patient reporting fever and wound discharge on day 4 post-appendectomy.",
            "ai_reasoning": "Fever onset after day 3 combined with wound discharge is a strong indicator of surgical site infection. Wound photo analysis shows redness and possible pus formation. Immediate antibiotic review needed.",
            "symptoms": ["fever", "wound redness", "discharge"],
            "status": "new",
            "resolved_at": None,
            "created_at": days_ago(0),
        },
        {
            "patient_id": str(patient_ids[3]),
            "doctor_id": str(doctor2_id),
            "checkin_id": "",
            "level": 3,
            "title": "CRITICAL: No response — Anjali Reddy",
            "description": "Post-cardiac bypass patient has not responded for 2 days. Last reported chest pain.",
            "ai_reasoning": "Cardiac bypass patient reported chest pain on day 2-3, then stopped responding. No response to 2 scheduled check-ins and 1 reminder. This is a high-risk situation — patient may be unable to respond. Emergency callback initiated.",
            "symptoms": ["chest pain", "no response"],
            "status": "new",
            "resolved_at": None,
            "created_at": days_ago(0),
        },
        {
            "patient_id": str(patient_ids[5]),
            "doctor_id": str(doctor2_id),
            "checkin_id": "",
            "level": 1,
            "title": "Mild nausea — Padma Lakshmi",
            "description": "Patient reported nausea after gallbladder removal surgery.",
            "ai_reasoning": "Nausea on day 3 post-cholecystectomy is common but should be monitored. May be medication side effect. Recommend dietary adjustment.",
            "symptoms": ["nausea"],
            "status": "acknowledged",
            "resolved_at": None,
            "created_at": days_ago(1),
        },
    ]
    await db["alerts"].insert_many(alerts)
    print(f"Seeded {len(alerts)} alerts")

    # ── Conversations ──
    conversations = [
        {
            "patient_id": str(patient_ids[0]),
            "messages": [
                {"role": "ai", "content": "Hello Ramesh! I'm Heal Hub, your AI post-surgery care assistant. How are you feeling after your Knee Replacement?", "content_type": "text", "language": "en", "timestamp": days_ago(7)},
                {"role": "patient", "content": "Hi, pain is about 6/10 but manageable. Took all my medicines.", "content_type": "text", "language": "en", "timestamp": days_ago(7)},
                {"role": "ai", "content": "That's normal for day 1 after knee replacement. Keep taking your medicines and try to rest. I'll check on you again on day 3!", "content_type": "text", "language": "en", "timestamp": days_ago(7)},
                {"role": "ai", "content": "Hi Ramesh! Day 3 check-in: How is your pain compared to Day 1?", "content_type": "text", "language": "en", "timestamp": days_ago(4)},
                {"role": "patient", "content": "Much better! Pain is 4/10 now. Started walking with support.", "content_type": "text", "language": "en", "timestamp": days_ago(4)},
                {"role": "ai", "content": "Great progress! Walking with support is exactly what you should be doing. Keep it up. Your recovery is on track.", "content_type": "text", "language": "en", "timestamp": days_ago(4)},
                {"role": "ai", "content": "Hi Ramesh! Day 7 — one week since surgery. How would you rate your overall recovery?", "content_type": "text", "language": "en", "timestamp": days_ago(0)},
                {"role": "patient", "content": "Pain is down to 2/10! Can walk without much support now. Feeling good.", "content_type": "text", "language": "en", "timestamp": days_ago(0)},
                {"role": "ai", "content": "Excellent recovery! You're doing wonderfully. Keep following your physiotherapy exercises. Your next check-in is on day 14.", "content_type": "text", "language": "en", "timestamp": days_ago(0)},
            ],
            "created_at": days_ago(7),
            "updated_at": utc_now(),
        },
        {
            "patient_id": str(patient_ids[1]),
            "messages": [
                {"role": "ai", "content": "Namaskaram Lakshmi garu! Nenu Heal Hub, mee surgery tarvata care assistant. Meeru ela feel avutunnaru?", "content_type": "text", "language": "te", "timestamp": days_ago(5)},
                {"role": "patient", "content": "Noppi undi kaani bharistaanu", "content_type": "text", "language": "te", "timestamp": days_ago(5)},
                {"role": "ai", "content": "Day 1 lo noppi undadam normal andi. Medicines time ki theesukondhi. Rest theesukondhi.", "content_type": "text", "language": "te", "timestamp": days_ago(5)},
                {"role": "ai", "content": "Namaskaram Lakshmi garu! Day 3 check-in. Noppi ela undi?", "content_type": "text", "language": "te", "timestamp": days_ago(2)},
                {"role": "patient", "content": "Noppi ekkuva ayyindi, 6/10. Konchum vaapu kuda undi.", "content_type": "text", "language": "te", "timestamp": days_ago(2)},
                {"role": "ai", "content": "Noppi ekkuva avvadam konchum concerning. Vaapu undi ante doctor ki cheptanu. Medicines continue cheyandi. Resting position lo undandi.", "content_type": "text", "language": "te", "timestamp": days_ago(2)},
                {"role": "ai", "content": "Lakshmi garu, Day 5 check-in. Noppi ippudu ela undi?", "content_type": "text", "language": "te", "timestamp": days_ago(0)},
                {"role": "patient", "content": "Noppi inka ekkuvaindhi 7/10. Walk cheyaleka pothunna.", "content_type": "text", "language": "te", "timestamp": days_ago(0)},
                {"role": "ai", "content": "Meeru cheppindi vinnaanu. Pain continuously increasing avuthundi, idi monitor cheyali. Mee doctor ki notify chesthunna. Please rest theesukondhi, medicines time ki theesukondi.", "content_type": "text", "language": "te", "timestamp": days_ago(0)},
            ],
            "created_at": days_ago(5),
            "updated_at": utc_now(),
        },
        {
            "patient_id": str(patient_ids[2]),
            "messages": [
                {"role": "ai", "content": "Namaste Suresh ji! Main Heal Hub hoon. Aapki appendectomy ke baad main aapka khayal rakhungi. Aap kaisa feel kar rahe hain?", "content_type": "text", "language": "hi", "timestamp": days_ago(4)},
                {"role": "patient", "content": "Theek hoon, thoda dard hai lekin manage ho raha hai", "content_type": "text", "language": "hi", "timestamp": days_ago(4)},
                {"role": "ai", "content": "Accha hai. Day 1 mein dard normal hai. Medicines time pe lena mat bhuliye. Kal fir check karungi.", "content_type": "text", "language": "hi", "timestamp": days_ago(4)},
                {"role": "ai", "content": "Namaste Suresh ji! Day 3 check-in. Kaisa hai dard aaj?", "content_type": "text", "language": "hi", "timestamp": days_ago(1)},
                {"role": "patient", "content": "Dard zyada hai aaj, 7/10. Wound ke paas laal bhi ho raha hai.", "content_type": "text", "language": "hi", "timestamp": days_ago(1)},
                {"role": "ai", "content": "Suresh ji, wound ke paas laal hona concerning hai. Kya bukhar bhi hai? Wound ki photo bhej sakte hain?", "content_type": "text", "language": "hi", "timestamp": days_ago(1)},
                {"role": "patient", "content": "Haan bukhar aa raha hai aur wound se kuch nikal raha hai. Bahut tension ho rahi hai.", "content_type": "text", "language": "hi", "timestamp": days_ago(0)},
                {"role": "ai", "content": "Suresh ji, aapke symptoms sunke maine aapke doctor ko turant alert bhej diya hai. Bukhar aur wound discharge — doctor ko dekhna zaroori hai. Ghabrayiye mat, aapke doctor jaldi response karenge. Medicines continue rakhiye.", "content_type": "text", "language": "hi", "timestamp": days_ago(0)},
            ],
            "created_at": days_ago(4),
            "updated_at": utc_now(),
        },
        {
            "patient_id": str(patient_ids[3]),
            "messages": [
                {"role": "ai", "content": "Namaskaram Anjali garu! Nenu Heal Hub. Mee cardiac bypass surgery tarvata nenu daily check chesthanu. Meeru ela unnaru?", "content_type": "text", "language": "te", "timestamp": days_ago(6)},
                {"role": "patient", "content": "Operation tarvata chaala weak ga undi", "content_type": "text", "language": "te", "timestamp": days_ago(6)},
                {"role": "ai", "content": "Cardiac surgery tarvata weakness normal andi. Rest theesukondhi, medicines theesukondhi. Roju konchum konchum walk cheyandi.", "content_type": "text", "language": "te", "timestamp": days_ago(6)},
                {"role": "ai", "content": "Anjali garu, Day 2 check-in. Ela unnaru eeroju?", "content_type": "text", "language": "te", "timestamp": days_ago(4)},
                {"role": "patient", "content": "Chest lo konchum noppi undi, breathlessness kuda undi", "content_type": "text", "language": "te", "timestamp": days_ago(4)},
                {"role": "ai", "content": "Anjali garu, chest pain mariyu breathlessness cardiac surgery tarvata monitor cheyali. Mee doctor ki inform chesthunna. Please rest theesukondhi. Emergency aithe 108 ki call cheyandi.", "content_type": "text", "language": "te", "timestamp": days_ago(4)},
                {"role": "ai", "content": "Anjali garu, Day 3 check-in. Meeru ela feel avutunnaru? Chest pain ela undi?", "content_type": "text", "language": "te", "timestamp": days_ago(3)},
                {"role": "patient", "content": "Baagunnanu kaani chest lo konchum noppi undi", "content_type": "text", "language": "te", "timestamp": days_ago(3)},
                {"role": "ai", "content": "Anjali garu, meeru reply ichhinanduku thanks. Chest pain continue avuthundi, doctor ki report chesthunna. Medicines time ki theesukondhi.", "content_type": "text", "language": "te", "timestamp": days_ago(3)},
                {"role": "ai", "content": "Anjali garu, Day 5 check-in. Ela unnaru? Please reply ivvandi.", "content_type": "text", "language": "te", "timestamp": days_ago(1)},
                {"role": "ai", "content": "Anjali garu, mee response raledu. Meeru okay na? Please reply cheyandi leda 'call me' ani pamapandi.", "content_type": "text", "language": "te", "timestamp": days_ago(0)},
            ],
            "created_at": days_ago(6),
            "updated_at": days_ago(0),
        },
    ]
    await db["conversations"].insert_many(conversations)
    print(f"Seeded {len(conversations)} conversations")

    print("\n✅ Seed data complete!")
    print(f"\nLogin credentials:")
    print(f"  Dr. Priya Sharma: priya@healhub.com / doctor123")
    print(f"  Dr. Ravi Reddy:   ravi@healhub.com / doctor123")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
