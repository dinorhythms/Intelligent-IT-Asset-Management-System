"""IT Asset AI microservice.

Run locally:  python app.py
Endpoints:
  GET  /health                 - service status (public)
  POST /predict                - predictive score from asset telemetry
  POST /anomaly                - anomaly detection on metrics
  POST /recommend              - maintenance recommendations
  POST /maintenance_schedule   - next maintenance date
All non-health endpoints require X-API-Key or a valid JWT bearer token.
"""
import logging

from flask import Flask, jsonify, request

from config import Config
from routes import (
    anomaly_bp,
    health_bp,
    maintenance_bp,
    predict_bp,
    recommend_bp,
)
from security import register_security


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    _register_logging(app)
    register_security(app)

    app.register_blueprint(health_bp)
    app.register_blueprint(predict_bp)
    app.register_blueprint(anomaly_bp)
    app.register_blueprint(recommend_bp)
    app.register_blueprint(maintenance_bp)

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not found", "message": str(error)}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"error": "Method not allowed", "message": str(error)}), 405

    @app.errorhandler(Exception)
    def handle_unexpected(error):
        app.logger.error("Unhandled error on %s: %s", request.path, error, exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

    return app


def _register_logging(app) -> None:
    level = getattr(logging, Config.LOG_LEVEL, logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    )

    @app.before_request
    def log_request():
        app.logger.info("--> %s %s", request.method, request.path)

    @app.after_request
    def log_response(response):
        app.logger.info("<-- %s %s -> %s", request.method, request.path, response.status_code)
        return response


app = create_app()

# if __name__ == "__main__":
#     app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
if __name__ == "__main__":
    import os
    app.run(
        host=Config.HOST,
        port=int(os.environ.get("PORT", Config.PORT)),
        debug=Config.DEBUG
    )