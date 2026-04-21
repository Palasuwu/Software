# Utilidades de autenticacion: creacion y verificacion de tokens y middleware.
import os
from functools import wraps

from flask import jsonify, request
from itsdangerous import BadSignature, SignatureExpired, TimedSerializer

_TOKEN_MAX_AGE_SECONDS = int(os.getenv("AUTH_TOKEN_MAX_AGE", "86400"))
_TOKEN_SALT = "reddonaciones-auth"

# Lista simple de tokens revocados en memoria (para logout).
# En produccion se recomienda usar un almacenamiento persistente (Redis, DB).
_revoked_tokens = set()


def _serializer():
    secret = os.getenv("AUTH_SECRET_KEY") or os.getenv("SECRET_KEY") or "dev-secret-key-change-me"
    return TimedSerializer(secret, salt=_TOKEN_SALT)


def generate_token(payload):
    """Genera un token firmado con los datos del usuario."""
    return _serializer().dumps(payload)


def verify_token(token):
    """Devuelve el payload del token o None si es invalido, expirado o revocado."""
    if not token or token in _revoked_tokens:
        return None
    try:
        return _serializer().loads(token, max_age=_TOKEN_MAX_AGE_SECONDS)
    except SignatureExpired:
        return None
    except BadSignature:
        return None


def revoke_token(token):
    """Invalida un token (por ejemplo, al hacer logout)."""
    if token:
        _revoked_tokens.add(token)


def _extract_token():
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[len("Bearer "):].strip()
    return None


def token_required(fn):
    """Middleware que exige un token valido y adjunta request.user con el payload."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _extract_token()
        if not token:
            return jsonify({"error": "Token de autenticacion requerido"}), 401

        payload = verify_token(token)
        if not payload:
            return jsonify({"error": "Token invalido o expirado"}), 401

        request.user = payload
        request.token = token
        return fn(*args, **kwargs)

    return wrapper
