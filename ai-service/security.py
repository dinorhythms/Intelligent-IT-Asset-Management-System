"""Authentication middleware for the AI microservice.

Only requests carrying a valid API key (X-API-Key header) or a valid JWT
(Bearer token signed with the shared JWT secret) are allowed through.
The /health endpoint stays public so the backend can poll liveness.
"""
import jwt
from flask import jsonify, request

from config import Config

PUBLIC_PATHS = {"/health", "/health/", "/"}


def _extract_api_key():
    return request.headers.get("X-API-Key") or request.headers.get("x-api-key")


def _extract_bearer():
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth.split(None, 1)[1].strip()
    return None


def _authorized() -> bool:
    api_key = _extract_api_key()
    if api_key and api_key == Config.API_KEY:
        return True

    token = _extract_bearer()
    if token:
        try:
            jwt.decode(
                token,
                Config.JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_sub": False},
            )
            return True
        except jwt.PyJWTError:
            return False

    return False


def register_security(app) -> None:
    @app.before_request
    def authenticate():
        if request.path in PUBLIC_PATHS:
            return None
        if not _authorized():
            app.logger.warning(
                "Unauthorized request to %s from %s",
                request.path,
                request.remote_addr,
            )
            return jsonify(
                {
                    "error": "Unauthorized",
                    "message": "A valid X-API-Key or JWT bearer token is required",
                }
            ), 401
        return None
