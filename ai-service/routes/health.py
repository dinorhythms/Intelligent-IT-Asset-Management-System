import time

from flask import Blueprint, jsonify

from config import Config

health_bp = Blueprint("health", __name__)

_STARTED_AT = time.time()


@health_bp.get("/health")
def health():
    from services.predictive_service import _model_used

    return jsonify(
        {
            "status": "ok",
            "service": "it-asset-ai-service",
            "model": _model_used,
            "port": Config.PORT,
            "uptime_seconds": round(time.time() - _STARTED_AT, 2),
        }
    )
