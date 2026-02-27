"""
WhatsApp Webhook — Thin security wrapper around the Agent Router.
Handles: Twilio signature validation, rate limiting, patient lookup.
All conversation logic lives in app/agent/.
"""
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import PlainTextResponse
from twilio.request_validator import RequestValidator
from app.database import patients_collection
from app.config import get_settings
from app.services.templates import get_template
from app.utils.rate_limit import SlidingWindowRateLimiter, get_client_ip
from app.utils.helpers import utc_now
import logging
import traceback

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()

XML_OK = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

MAX_BODY_CHARS = 4000
MAX_MEDIA_ITEMS = 3
IP_RATE_LIMIT_PER_MIN = 60
PHONE_RATE_LIMIT_PER_MIN = 20
_ip_limiter = SlidingWindowRateLimiter()
_phone_limiter = SlidingWindowRateLimiter()


def _validate_twilio_signature(request: Request, form_data: dict) -> bool:
    signature = request.headers.get("X-Twilio-Signature")
    if not signature or not settings.TWILIO_AUTH_TOKEN:
        return False

    validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)
    candidates = [str(request.url)]
    if settings.APP_URL:
        candidates.append(f"{settings.APP_URL.rstrip('/')}{request.url.path}")

    params = {k: str(v) for k, v in form_data.items()}
    return any(validator.validate(url, params, signature) for url in candidates)


async def _send_reply(phone: str, message: str):
    """Send a WhatsApp message via Twilio."""
    try:
        from app.services.whatsapp import send_message
        await send_message(phone, message)
    except Exception as e:
        logger.error("Reply send failed: %s", e)


@router.post("/whatsapp")
async def whatsapp_webhook(request: Request):
    """Handle incoming WhatsApp messages from Twilio."""
    try:
        # ── Rate-limit by IP ──
        client_ip = get_client_ip(request)
        if not await _ip_limiter.allow(f"whatsapp:ip:{client_ip}", IP_RATE_LIMIT_PER_MIN, 60):
            raise HTTPException(status_code=429, detail="Too many requests")

        # ── Parse & validate form ──
        form = await request.form()
        form_dict = dict(form)
        if not _validate_twilio_signature(request, form_dict):
            raise HTTPException(status_code=403, detail="Invalid signature")

        from_number = form.get("From", "")
        body = form.get("Body", "").strip()
        media_url = form.get("MediaUrl0")
        media_type = form.get("MediaContentType0", "")
        num_media = int(form.get("NumMedia", 0))

        if len(body) > MAX_BODY_CHARS:
            raise HTTPException(status_code=413, detail="Message too large")
        if num_media > MAX_MEDIA_ITEMS:
            raise HTTPException(status_code=413, detail="Too many media attachments")

        # ── Rate-limit by phone ──
        phone = from_number.replace("whatsapp:", "")
        phone_suffix = "".join(ch for ch in phone if ch.isdigit())[-10:] or phone
        if not await _phone_limiter.allow(f"whatsapp:phone:{phone_suffix}", PHONE_RATE_LIMIT_PER_MIN, 60):
            raise HTTPException(status_code=429, detail="Rate limit exceeded")

        logger.info("Incoming message from %s…%s", phone_suffix[:2], phone_suffix[-2:])

        # ── Patient lookup ──
        patient = await patients_collection.find_one({"phone": phone, "is_active": {"$ne": False}})
        if not patient:
            patient = await patients_collection.find_one({
                "phone": {"$regex": phone[-10:] + "$"},
                "is_active": {"$ne": False},
            })

        if not patient:
            logger.info("Patient not found for phone suffix %s", phone_suffix[-4:])
            return PlainTextResponse(XML_OK, media_type="text/xml")

        # ── Delegate to Agent Router ──
        from app.agent.router import process_message
        reply = await process_message(
            patient=patient,
            body=body,
            media_url=media_url if num_media > 0 else None,
            media_type=media_type if num_media > 0 else None,
        )

        # None means doctor mode — no auto-reply
        if reply:
            await _send_reply(phone, reply)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Webhook error: %s", e)

    return PlainTextResponse(XML_OK, media_type="text/xml")
