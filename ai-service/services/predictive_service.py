"""Predictive scoring service backed by the trained Scikit-learn model."""
import numpy as np

from config import Config
from models.predictive_model import FEATURES, load_model

_model = None
_model_used = "not-loaded"


def _get_model():
    global _model, _model_used
    if _model is None:
        _model, from_file = load_model(Config.MODEL_PATH)
        _model_used = "saved-model" if from_file else "dummy-trained"
    return _model


def _vector(payload):
    vector = {}
    for key in FEATURES:
        try:
            vector[key] = float(payload.get(key))
        except (TypeError, ValueError):
            vector[key] = 0.0
    return vector


def predict(payload):
    model = _get_model()
    vector = _vector(payload)
    sample = np.array([[vector[key] for key in FEATURES]], dtype=float)

    rul_days = float(model.predict(sample)[0])
    rul_days = max(1.0, rul_days)

    predictive_score = float(
        np.clip(1 - rul_days / Config.MAX_RUL_DAYS, 0.02, 0.98)
    )

    provided = sum(1 for key in FEATURES if payload.get(key) is not None)
    confidence = round(provided / len(FEATURES), 4)

    return {
        "asset_id": payload.get("asset_id") or payload.get("assetId") or "unknown",
        "predictive_score": round(predictive_score, 4),
        "rul_days": round(rul_days, 2),
        "confidence": confidence,
        "model": _model_used,
        "status": "ok",
    }
