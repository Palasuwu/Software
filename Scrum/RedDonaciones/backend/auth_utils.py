# backend/auth_utils.py
import os
from datetime import datetime, timedelta
from functools import wraps

import jwt
from flask import jsonify, request


def _get_secret_key():
    secret_key = os.environ.get("JWT_SECRET_KEY")
    if not secret_key:
        raise ValueError("JWT_SECRET_KEY es obligatoria y no puede estar vacia")

    return secret_key


def generate_token(id_usuario, rol, id_organizacion=None):
    """Genera un JWT token valido por 7 dias."""
    secret_key = _get_secret_key()

    payload = {
        "id_usuario": id_usuario,
        "rol": rol,
        "id_organizacion": id_organizacion,
        "exp": datetime.utcnow() + timedelta(days=7),
        "iat": datetime.utcnow()
    }
    token = jwt.encode(payload, secret_key, algorithm="HS256")
    return token


def verify_token(token):
    """Verifica y decodifica un JWT token. Retorna el payload o None si es invalido."""
    try:
        payload = jwt.decode(token, _get_secret_key(), algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def _get_bearer_token():
    auth_header = request.headers.get("Authorization", "")
    parts = auth_header.split()

    if len(parts) != 2 or parts[0] != "Bearer":
        return None

    return parts[1]


def _autenticar_request():
    token = _get_bearer_token()
    if not token:
        return None, (jsonify({"error": "Token no proporcionado o malformado"}), 401)

    payload = verify_token(token)
    if not payload:
        return None, (jsonify({"error": "Token invalido o expirado"}), 401)

    try:
        request.usuario_id = payload["id_usuario"]
        request.usuario_rol = payload["rol"]
        request.id_organizacion = payload.get("id_organizacion")
    except KeyError:
        return None, (jsonify({"error": "Token invalido"}), 401)

    return payload, None


def token_required(f):
    """Decorador para verificar que el request tenga un token JWT valido."""
    @wraps(f)
    def decorated(*args, **kwargs):
        _, error_response = _autenticar_request()
        if error_response:
            return error_response

        return f(*args, **kwargs)

    return decorated


def admin_required(f):
    """Decorador que exige que el usuario sea administrador."""
    @wraps(f)
    def decorated(*args, **kwargs):
        _, error_response = _autenticar_request()
        if error_response:
            return error_response

        if request.usuario_rol != "administrador":
            return jsonify({"error": "Acceso denegado: requiere rol administrador"}), 403

        return f(*args, **kwargs)

    return decorated
