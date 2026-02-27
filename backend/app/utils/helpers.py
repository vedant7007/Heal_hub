from datetime import datetime, timezone
from bson import ObjectId


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def objectid_to_str(doc: dict) -> dict:
    """Convert ObjectId fields to strings for JSON serialization."""
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, list):
            result[key] = [
                objectid_to_str(item) if isinstance(item, dict) else
                str(item) if isinstance(item, ObjectId) else item
                for item in value
            ]
        elif isinstance(value, dict):
            result[key] = objectid_to_str(value)
        else:
            result[key] = value
    return result


def days_since(date: datetime) -> int:
    """Calculate days since a given date."""
    if date.tzinfo is None:
        now = datetime.utcnow()
    else:
        now = datetime.now(timezone.utc)
    return (now - date).days
