from flask import Blueprint, jsonify, request

from services.anomaly_service import detect

anomaly_bp = Blueprint("anomaly", __name__)


@anomaly_bp.post("/anomaly")
def anomaly_route():
    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({"error": "Request body required"}), 400
    return jsonify(detect(payload))
