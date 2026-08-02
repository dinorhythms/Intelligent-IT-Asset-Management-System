from flask import Blueprint, jsonify, request

from services.predictive_service import predict

predict_bp = Blueprint("predict", __name__)


@predict_bp.post("/predict")
def predict_route():
    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({"error": "Request body required"}), 400
    return jsonify(predict(payload))
