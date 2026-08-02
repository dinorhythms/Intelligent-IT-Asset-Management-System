"""Centralised configuration loaded from the ai-service .env file."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _bool(value) -> bool:
    return str(value).strip().lower() in ("1", "true", "yes", "on")


class Config:
    HOST = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
    PORT = int(os.getenv("AI_SERVICE_PORT", "5001"))
    DEBUG = _bool(os.getenv("AI_SERVICE_DEBUG", "false"))
    LOG_LEVEL = os.getenv("AI_SERVICE_LOG_LEVEL", "INFO").upper()

    MODEL_PATH = os.getenv(
        "AI_MODEL_PATH", str(BASE_DIR / "models" / "predictive_model.joblib")
    )

    # Security
    API_KEY = os.getenv("AI_SERVICE_API_KEY", "ai-service-dev-key")
    JWT_SECRET = os.getenv("AI_SERVICE_JWT_SECRET", "dev-secret")

    # Predictive maintenance parameters
    MAX_RUL_DAYS = float(os.getenv("AI_MAX_RUL_DAYS", "400"))
    MAINTENANCE_INTERVAL_DAYS = int(
        os.getenv("MAINTENANCE_INTERVAL_DAYS", "90")
    )
    SERVICE_HOURS_CYCLE = float(os.getenv("SERVICE_HOURS_CYCLE", "500"))

    # Anomaly thresholds
    TEMPERATURE_THRESHOLD = float(os.getenv("TEMPERATURE_THRESHOLD", "80"))
    CPU_THRESHOLD = float(os.getenv("CPU_THRESHOLD", "90"))
    VIBRATION_THRESHOLD = float(os.getenv("VIBRATION_THRESHOLD", "5.0"))
