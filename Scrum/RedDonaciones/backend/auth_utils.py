# backend/auth_utils.py

import logging
import os
from datetime import datetime, timedelta, timezone
from functools import wraps
import jwt
from flask import jsonify, request
from db.connection import get_db_connection


def _get_secret_key():
    secret_key = os.environ.get("JWT_SECRET_KEY")

    if not secret_key:
        raise ValueError(
            "JWT_SECRET_KEY es obligatoria y no puede estar vacia"
        )

    return secret_key

# Genera un JWT válido por 7 días.

# id_organizacion se mantiene por compatibilidad,  pero las rutas de intermediario no deben utilizar este valor como fuente de verdad

def generate_token(
    id_usuario,
    rol,
    id_organizacion=None
):
    secret_key = _get_secret_key()

    now = datetime.now(timezone.utc)

    payload = {
        "id_usuario": id_usuario,
        "rol": rol,
        "id_organizacion": id_organizacion,
        "exp": now + timedelta(days=7),
        "iat": now
    }

    return jwt.encode(
        payload,
        secret_key,
        algorithm="HS256"
    )

#Para verificar y decodificar un JWT
#Retorna el payload o None si el token es inválido o expiró.

def verify_token(token):
    try:
        return jwt.decode(
            token,
            _get_secret_key(),
            algorithms=["HS256"]
        )
    except jwt.ExpiredSignatureError:
        return None

    except jwt.InvalidTokenError:
        return None


def _get_bearer_token():
    auth_header = request.headers.get(
        "Authorization",
        ""
    )
    parts = auth_header.split()
    if (
        len(parts) != 2
        or parts[0] != "Bearer"
    ):
        return None
    return parts[1]

# Valida el JWT y coloca en request únicamente la información de identidad/autorización base
# id_organizacion puede venir en el JWT por compatibilidad, pero no debe considerarse información actual de la BD
  

def _autenticar_request():
    token = _get_bearer_token()

    if not token:
        return None, (
            jsonify({
                "error": (
                    "Token no proporcionado o malformado"
                )
            }),
            401
        )
    payload = verify_token(token)
    if not payload:
        return None, (
            jsonify({
                "error": "Token inválido o expirado"
            }),
            401
        )

    try:
        request.usuario_id = payload["id_usuario"]
        request.usuario_rol = payload["rol"]

        # Se conserva temporalmente por compatibilidad.
        # intermediario_required lo reemplaza con el valor actual consultado desde la BD
        request.id_organizacion = payload.get(
            "id_organizacion"
        )

    except KeyError:
        return None, (
            jsonify({
                "error": "Token invalido"
            }),
            401
        )

    return payload, None

# Consulta directamente la BD para obtener la organización ACTUAL del intermediario
#    El JWT no se utiliza como fuente de verdad.
def _obtener_organizacion_actual_intermediario(
    id_usuario
):
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id_organizacion
            FROM intermediario
            WHERE id_usuario = %s
            """,
            (id_usuario,)
        )
        intermediario = cursor.fetchone()
        if not intermediario:
            return None
        return intermediario["id_organizacion"]
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def token_required(f):
    """
    Decorador que exige un JWT válido.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        _, error_response = _autenticar_request()

        if error_response:
            return error_response

        return f(*args, **kwargs)

    return decorated


def admin_required(f):
    """
    Decorador que exige rol administrador.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        _, error_response = _autenticar_request()

        if error_response:
            return error_response

        if request.usuario_rol != "administrador":
            return jsonify({
                "error": (
                    "Acceso denegado: "
                    "requiere rol administrador"
                )
            }), 403

        return f(*args, **kwargs)

    return decorated


def intermediario_required(f):
    """
    Decorador que exige rol intermediario

    Además consulta la organización actual del
    intermediario directamente desde la BD para
    evitar utilizar un id_organizacion obsoleto
    almacenado en el JWT
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        _, error_response = _autenticar_request()

        if error_response:
            return error_response

        if request.usuario_rol != "intermediario":
            return jsonify({
                "error": "Acceso denegado"
            }), 403

        try:
            id_organizacion_actual = (
                _obtener_organizacion_actual_intermediario(
                    request.usuario_id
                )
            )

        except Exception:
            logging.exception(
                "Error al consultar la organizacion "
                "actual del intermediario %s",
                request.usuario_id
            )

            return jsonify({
                "error": (
                    "No se pudo validar la organización "
                    "del intermediario"
                )
            }), 500

        if id_organizacion_actual is None:
            return jsonify({
                "error": (
                    "El usuario no está asociado "
                    "a una organización"
                )
            }), 403

        # IMPORTANTE:
        # sobrescribe cualquier organización que estuviera almacenada en el JWT
        request.id_organizacion = (
            id_organizacion_actual
        )

        return f(*args, **kwargs)

    return decorated