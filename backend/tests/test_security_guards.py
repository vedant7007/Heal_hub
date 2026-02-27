import asyncio

import pytest
from fastapi import HTTPException
from twilio.request_validator import RequestValidator

from app.routes import analytics
from app.routes import patients as patients_routes
from app.routes import webhook as webhook_routes


class _FakeCheckinsCollection:
    def __init__(self):
        self.pipeline = None

    def aggregate(self, pipeline):
        self.pipeline = pipeline
        return self

    def __aiter__(self):
        async def _gen():
            yield {"_id": "scheduled", "count": 2}

        return _gen()


class _FakePatientsCollection:
    def __init__(self):
        self.last_query = None

    async def find_one(self, query):
        self.last_query = query
        return None


def _make_request(path: str, signature: str):
    scope = {
        "type": "http",
        "method": "POST",
        "scheme": "https",
        "server": ("testserver", 443),
        "client": ("127.0.0.1", 50000),
        "path": path,
        "raw_path": path.encode(),
        "query_string": b"",
        "headers": [(b"x-twilio-signature", signature.encode())],
    }

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    from starlette.requests import Request

    return Request(scope, receive)


def test_get_patient_enforces_doctor_ownership(monkeypatch):
    fake_patients = _FakePatientsCollection()
    monkeypatch.setattr(patients_routes, "patients_collection", fake_patients)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            patients_routes.get_patient(
                "507f1f77bcf86cd799439011",
                doctor={"_id": "doctor-A"},
            )
        )

    assert exc.value.status_code == 404
    assert fake_patients.last_query["doctor_id"] == "doctor-A"
    assert str(fake_patients.last_query["_id"]) == "507f1f77bcf86cd799439011"


def test_response_rates_pipeline_is_tenant_scoped(monkeypatch):
    fake_checkins = _FakeCheckinsCollection()
    monkeypatch.setattr(analytics, "checkins_collection", fake_checkins)

    result = asyncio.run(analytics.get_response_rates(doctor={"_id": "doctor-1", "role": "doctor"}))

    assert result == {"scheduled": 2}
    assert fake_checkins.pipeline is not None

    lookup = fake_checkins.pipeline[0]["$lookup"]
    assert lookup["from"] == "patients"
    lookup_match_expr = lookup["pipeline"][0]["$match"]["$expr"]["$and"]
    assert {"$eq": ["$doctor_id", "doctor-1"]} in lookup_match_expr


def test_webhook_signature_validation(monkeypatch):
    monkeypatch.setattr(webhook_routes.settings, "TWILIO_AUTH_TOKEN", "test-token")
    monkeypatch.setattr(webhook_routes.settings, "APP_URL", "https://testserver")

    params = {"From": "whatsapp:+1234567890", "Body": "hello"}
    url = "https://testserver/api/webhook/whatsapp"
    signature = RequestValidator("test-token").compute_signature(url, params)
    request = _make_request("/api/webhook/whatsapp", signature)

    assert webhook_routes._validate_twilio_signature(request, params) is True
    assert webhook_routes._validate_twilio_signature(request, {**params, "Body": "tampered"}) is False
