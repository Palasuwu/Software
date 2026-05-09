import os
from datetime import datetime, timedelta
from functools import wraps

import jwt
from flask import current_app, jsonify, request


def _get_secret_key():
    secret_key = None

    try:
        secret_key = current_app.config.get("JWT_SECRET_KEY")
    except RuntimeError:
        secret_key = None

    if not secret_key:
        secret_key = os.getenv("JWT_SECRET_KEY")

    if not secret_key:
        raise ValueError("JWT_SECRET_KEY es obligatoria y no puede estar vacia")

    return secret_key


def generate_token(id_usuario, rol):
    payload = {
        "id_usuario": id_usuario,
        "rol": rol,
        "exp": datetime.utcnow() + timedelta(days=7),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, _get_secret_key(), algorithm="HS256")


def verify_token(token):
    try:
        return jwt.decode(token, _get_secret_key(), algorithms=["HS256"])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def get_bearer_token():
    auth_header = request.headers.get("Authorization", "")
    parts = auth_header.split()

    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    return parts[1]


def get_token_payload_from_request():
    token = get_bearer_token()
    if not token:
        return None

    return verify_token(token)


def _has_malformed_authorization_header():
    return bool(request.headers.get("Authorization")) and not get_bearer_token()


def _attach_payload_to_request(payload):
    request.usuario_id = payload["id_usuario"]
    request.usuario_rol = payload["rol"]


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if _has_malformed_authorization_header():
            return jsonify({"error": "Token malformado"}), 401

        payload = get_token_payload_from_request()
        if not payload:
            return jsonify({"error": "Token invalido o expirado"}), 401

        _attach_payload_to_request(payload)
        return f(*args, **kwargs)

    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if _has_malformed_authorization_header():
            return jsonify({"error": "Token malformado"}), 401

        payload = get_token_payload_from_request()
        if not payload:
            return jsonify({"error": "Token invalido o expirado"}), 401

        if payload.get("rol") != "administrador":
            return jsonify({"error": "Acceso denegado: requiere rol administrador"}), 403

        _attach_payload_to_request(payload)
        return f(*args, **kwargs)

    return decorated
