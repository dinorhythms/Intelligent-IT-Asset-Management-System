"""Route blueprints for the AI microservice."""
from .anomaly import anomaly_bp
from .health import health_bp
from .maintenance_schedule import maintenance_bp
from .predict import predict_bp
from .recommend import recommend_bp

__all__ = [
    "health_bp",
    "predict_bp",
    "anomaly_bp",
    "recommend_bp",
    "maintenance_bp",
]
