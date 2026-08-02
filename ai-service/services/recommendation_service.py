"""Maintenance recommendation service driven by the predictive score."""
from .predictive_service import predict as compute_predictive_score


def _as_bool(value, default=False):
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    return str(value).strip().lower() in ("1", "true", "yes")


def recommend(payload):
    raw_score = payload.get("predictive_score") or payload.get(
        "predictiveScore"
    )
    if raw_score is None:
        prediction = compute_predictive_score(payload)
        score = float(prediction["predictive_score"])
    else:
        try:
            score = float(raw_score)
        except (TypeError, ValueError):
            score = 0.0

    anomaly = _as_bool(
        payload.get("anomaly_detected") or payload.get("anomalyDetected")
    )

    actions = []
    if anomaly:
        actions.append(
            {
                "action": "Inspect and diagnose the asset immediately",
                "priority": "critical",
                "category": "diagnostic",
            }
        )

    if score >= 0.8:
        actions.append(
            {
                "action": "Schedule immediate preventive maintenance or replacement",
                "priority": "critical",
                "category": "maintenance",
            }
        )
    elif score >= 0.6:
        actions.append(
            {
                "action": "Schedule preventive maintenance within 7 days",
                "priority": "high",
                "category": "maintenance",
            }
        )
    elif score >= 0.4:
        actions.append(
            {
                "action": "Schedule routine inspection within 30 days",
                "priority": "medium",
                "category": "inspection",
            }
        )
    else:
        actions.append(
            {
                "action": "Continue normal monitoring",
                "priority": "low",
                "category": "monitor",
            }
        )

    return {
        "asset_id": payload.get("asset_id") or payload.get("assetId") or "unknown",
        "predictive_score": round(score, 4),
        "anomaly_detected": anomaly,
        "recommended_actions": actions,
        "status": "ok",
    }
