from flask import Blueprint, jsonify, request

from services.maintenance_service import schedule

maintenance_bp = Blueprint("maintenance", __name__)


@maintenance_bp.post("/maintenance_schedule")
def maintenance_route():
    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({"error": "Request body required"}), 400
    return jsonify(schedule(payload))
