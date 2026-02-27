from app.config import Settings
from app.models.patient import PatientCreate


def test_patient_create_mutable_defaults_are_not_shared():
    a = PatientCreate(
        name="A",
        phone="+10000000001",
        age=30,
        surgery_type="Test",
        surgery_date="2026-01-01T00:00:00Z",
    )
    b = PatientCreate(
        name="B",
        phone="+10000000002",
        age=31,
        surgery_type="Test",
        surgery_date="2026-01-01T00:00:00Z",
    )

    a.family_contacts.append({"name": "X", "phone": "+10000000003", "relation": "spouse"})
    assert len(b.family_contacts) == 0


def test_settings_parse_csv_origins():
    s = Settings(
        JWT_SECRET="test-secret",
        CORS_ORIGINS="http://localhost:3000,https://healhub.app",
        SOCKET_CORS_ORIGINS="http://localhost:3000,https://healhub.app",
    )
    assert s.get_cors_origins() == ["http://localhost:3000", "https://healhub.app"]
    assert s.get_socket_cors_origins() == ["http://localhost:3000", "https://healhub.app"]
