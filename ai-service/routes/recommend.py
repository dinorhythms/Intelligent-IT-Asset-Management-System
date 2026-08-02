from flask import Blueprint, jsonify, request

from services.recommendation_service import recommend

recommend_bp = Blueprint("recommend", __name__)


@recommend_bp.post("/recommend")
def recommend_route():
    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({"error": "Request body required"}), 400
    return jsonify(recommend(payload))
