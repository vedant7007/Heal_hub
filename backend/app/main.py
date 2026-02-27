import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from app.config import get_settings
from app.database import ping_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

# Socket.IO server
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

app = FastAPI(
    title="Heal Hub API",
    description="Autonomous Patient Follow-up AI Agent",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Socket.IO
socket_app = socketio.ASGIApp(sio, other_app=app)


@app.get("/")
async def root():
    return {"message": "Heal Hub API is running", "status": "ok"}


@app.get("/health")
async def health_check():
    db_ok = await ping_db()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
    }


# Import and register routers
from app.routes import doctors, patients, checkins, alerts, analytics, webhook, voice

app.include_router(doctors.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])
app.include_router(checkins.router, prefix="/api/checkins", tags=["Check-ins"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(webhook.router, prefix="/api/webhook", tags=["Webhooks"])
app.include_router(voice.router, prefix="/api/webhook/voice", tags=["Voice"])


@app.on_event("startup")
async def startup_event():
    logger.info("Heal Hub starting up...")
    db_ok = await ping_db()
    if db_ok:
        logger.info("MongoDB connected successfully")
    else:
        logger.warning("MongoDB connection failed - running in degraded mode")

    # Start scheduler
    try:
        from app.services.scheduler import start_scheduler
        start_scheduler()
        logger.info("Scheduler started")
    except Exception as e:
        logger.warning(f"Scheduler failed to start: {e}")


@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")


@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
