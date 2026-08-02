"""Anomaly detection service based on configurable metric thresholds."""
from config import Config


def _metric(payload, key, default=0.0):
    try:
        return float(payload.get(key, default))
    except (TypeError, ValueError):
        return default


def detect(payload):
    temperature = _metric(payload, "temperature")
    cpu_usage = _metric(payload, "cpu_usage")
    vibration = _metric(payload, "vibration")

    checks = [
        ("temperature", temperature, Config.TEMPERATURE_THRESHOLD, "high"),
        ("cpu_usage", cpu_usage, Config.CPU_THRESHOLD, "high"),
        ("vibration", vibration, Config.VIBRATION_THRESHOLD, "high"),
    ]

    findings = [
        {
            "metric": name,
            "value": round(value, 2),
            "threshold": limit,
            "severity": severity,
        }
        for name, value, limit, severity in checks
        if value > limit
    ]

    ratios = [
        value / limit for _, value, limit, _ in checks if limit > 0
    ]
    anomaly_score = round(min(1.0, max(ratios, default=0.0) / 2.0), 4)

    return {
        "asset_id": payload.get("asset_id") or payload.get("assetId") or "unknown",
        "anomaly_detected": bool(findings),
        "anomaly_score": anomaly_score,
        "findings": findings,
        "status": "ok",
    }
