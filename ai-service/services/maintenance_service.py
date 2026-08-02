"""Maintenance scheduling service based on usage patterns and calendar cadence."""
from datetime import datetime, timedelta

from config import Config


def _metric(payload, key, default=0.0):
    try:
        return float(payload.get(key, default))
    except (TypeError, ValueError):
        return default


def _parse_date(raw):
    if raw:
        try:
            return datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        except ValueError:
            pass
    return datetime.utcnow()


def schedule(payload):
    usage_hours = _metric(payload, "usage_hours")
    interval_days = int(
        payload.get("maintenance_interval_days")
        or Config.MAINTENANCE_INTERVAL_DAYS
    )

    last_date = _parse_date(
        payload.get("last_maintenance_date")
        or payload.get("lastMaintenanceDate")
    )
    today = datetime.utcnow()

    days_since_last = max(0, (today - last_date).days)
    daily_usage = usage_hours / max(1, days_since_last)

    days_by_calendar = max(0, interval_days - days_since_last)
    hours_until_service = max(0.0, Config.SERVICE_HOURS_CYCLE - usage_hours)
    days_by_usage = hours_until_service / max(daily_usage, 0.1)

    estimated_days = int(round(max(0.0, min(days_by_calendar, days_by_usage))))
    next_maintenance_date = today + timedelta(days=estimated_days)

    return {
        "asset_id": payload.get("asset_id") or payload.get("assetId") or "unknown",
        "next_maintenance_date": next_maintenance_date.date().isoformat(),
        "estimated_days_until_maintenance": estimated_days,
        "days_since_last_maintenance": days_since_last,
        "estimated_daily_usage_hours": round(daily_usage, 2),
        "maintenance_interval_days": interval_days,
        "status": "ok",
    }
