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


def _obtener_usuario_actual(id_usuario):
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id_usuario, rol, activo
            FROM usuario
            WHERE id_usuario = %s
            """,
            (id_usuario,)
        )
        return cursor.fetchone()
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def _organizacion_en_estados(id_organizacion, estados):
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT estado_verificacion
            FROM organizacion
            WHERE id_organizacion = %s
            """,
            (id_organizacion,)
        )
        organizacion = cursor.fetchone()
        return bool(
            organizacion
            and organizacion["estado_verificacion"] in estados
        )
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def _organizacion_verificada(id_organizacion):
    return _organizacion_en_estados(id_organizacion, ("verificada",))


def _organizacion_permite_lectura(id_organizacion):
    return _organizacion_en_estados(id_organizacion, ("verificada", "archivada"))


def autorizar_lectura_institucional(cursor, id_organizacion, estado, mensaje):
    """Autoriza un recurso no público; no concede permisos de escritura."""
    no_encontrado = (jsonify({"error": mensaje}), 404)
    if not request.headers.get("Authorization"):
        return no_encontrado
    _, error = _autenticar_request()
    if error:
        return error
    if request.usuario_rol == "administrador":
        return None
    if request.usuario_rol != "intermediario" or estado not in ("verificada", "archivada"):
        return no_encontrado
    cursor.execute(
        """
        SELECT 1
        FROM intermediario i
        INNER JOIN organizacion o ON o.id_organizacion = i.id_organizacion
        WHERE i.id_usuario = %s AND i.id_organizacion = %s
          AND o.estado_verificacion IN ('verificada', 'archivada')
        """,
        (request.usuario_id, id_organizacion),
    )
    return None if cursor.fetchone() else no_encontrado


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
        usuario_id = payload["id_usuario"]
        rol_token = payload["rol"]
    except KeyError:
        return None, (
            jsonify({
                "error": "Token inválido"
            }),
            401
        )

    try:
        usuario = _obtener_usuario_actual(usuario_id)
    except Exception:
        logging.exception(
            "Error al validar la sesión del usuario %s",
            usuario_id
        )
        return None, (
            jsonify({
                "error": "No se pudo validar la sesión"
            }),
            500
        )

    if (
        not usuario
        or usuario.get("activo") != 1
        or usuario.get("rol") != rol_token
    ):
        return None, (
            jsonify({"error": "Token inválido o usuario no autorizado"}),
            401
        )

    request.usuario_id = usuario["id_usuario"]
    request.usuario_rol = usuario["rol"]

    # Se conserva temporalmente por compatibilidad.
    # intermediario_required lo reemplaza con el valor actual consultado desde la BD
    request.id_organizacion = payload.get(
        "id_organizacion"
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


def intermediario_lectura_required(f):
    """Lectura operativa de la organización actual, verificada o archivada."""
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if request.usuario_rol != "intermediario":
            return jsonify({"error": "Acceso denegado"}), 403
        try:
            id_organizacion = _obtener_organizacion_actual_intermediario(request.usuario_id)
            if id_organizacion is None:
                return jsonify({"error": "El usuario no está asociado a una organización"}), 403
            if not _organizacion_permite_lectura(id_organizacion):
                return jsonify({"error": "La organización no está verificada"}), 403
        except Exception:
            logging.exception("Error al consultar la organización actual del intermediario")
            return jsonify({"error": "No se pudo validar la organización del intermediario"}), 500
        request.id_organizacion = id_organizacion
        return f(*args, **kwargs)
    return decorated


def validar_admin_request():
    """Valida que la petición actual pertenezca a un administrador activo."""
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

    return None


def admin_required(f):
    """
    Decorador que exige rol administrador.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        error_response = validar_admin_request()

        if error_response:
            return error_response

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
                "Error al consultar la organización "
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

        if not _organizacion_verificada(id_organizacion_actual):
            return jsonify({
                "error": "La organización no está verificada"
            }), 403

        # IMPORTANTE:
        # sobrescribe cualquier organización que estuviera almacenada en el JWT
        request.id_organizacion = (
            id_organizacion_actual
        )

        return f(*args, **kwargs)

    return decorated
