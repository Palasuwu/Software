"""Inicio de sesion con Google a traves de Firebase.

Firebase solo verifica la identidad; a partir de ahi la sesion es la de
siempre: se emite el mismo JWT que genera el login por contrasena, y el rol
se sigue resolviendo contra la tabla usuario en cada peticion. Por eso los
decoradores de autorizacion y el frontend no cambian.

Flujo:
  POST /auth/google            -> correo conocido: devuelve token y usuario.
                                  correo nuevo: responde requiere_registro con
                                  los datos de Google para prellenar el alta.
  POST /auth/google/registro   -> completa el alta como donante con los datos
                                  que Google no entrega (telefono y direccion).

No se crea la cuenta en el primer paso a proposito: la tabla donante exige
departamento, municipio, zona y direccion_detalle, y esa direccion es la que
la organizacion necesita para coordinar la entrega. Rellenarla con marcadores
dejaria donaciones imposibles de coordinar.
"""
import logging
import secrets

import bcrypt
from flask import Blueprint, jsonify, request

from auth_utils import generate_token
from db.connection import db_cursor, get_db_connection
from services.firebase_auth import (
    FirebaseNoConfigurado,
    TokenGoogleInvalido,
    verificar_id_token,
)
from utils.validation import NAME_REGEX, limpiar_espacios, telefono_valido

auth_google_bp = Blueprint("auth_google", __name__)

logging.basicConfig(level=logging.INFO)


def _buscar_usuario_por_correo(cursor, correo):
    cursor.execute(
        """
        SELECT id_usuario, nombre, correo, telefono, rol, activo
        FROM usuario
        WHERE correo = %s
        """,
        (correo,),
    )
    return cursor.fetchone()


def _sesion_de(usuario):
    """Arma la misma respuesta que devuelve el login por contrasena."""
    id_organizacion = None
    if usuario["rol"] == "intermediario":
        with db_cursor() as (_, cursor):
            cursor.execute(
                "SELECT id_organizacion FROM intermediario WHERE id_usuario = %s",
                (usuario["id_usuario"],),
            )
            fila = cursor.fetchone()
            id_organizacion = fila["id_organizacion"] if fila else None

    token = generate_token(usuario["id_usuario"], usuario["rol"], id_organizacion)

    return {
        "message": "Login exitoso",
        "token": token,
        "usuario": {
            "id_usuario": usuario["id_usuario"],
            "nombre": usuario["nombre"],
            "correo": usuario["correo"],
            "telefono": usuario["telefono"],
            "rol": usuario["rol"],
            "id_organizacion": id_organizacion,
        },
    }


def _identidad_desde_peticion():
    """Verifica el ID token del cuerpo. Devuelve (identidad, respuesta_error)."""
    data = request.get_json(silent=True) or {}

    try:
        return verificar_id_token(data.get("id_token")), None
    except TokenGoogleInvalido as error:
        return None, (jsonify({"error": str(error)}), 401)
    except FirebaseNoConfigurado:
        logging.exception("Firebase no esta configurado en este entorno")
        return None, (
            jsonify({"error": "El inicio de sesión con Google no está disponible"}),
            503,
        )


@auth_google_bp.route("/auth/google", methods=["POST"])
def iniciar_sesion_con_google():
    identidad, error = _identidad_desde_peticion()
    if error:
        return error

    try:
        with db_cursor(connection_factory=get_db_connection) as (_, cursor):
            usuario = _buscar_usuario_por_correo(cursor, identidad["correo"])

        if not usuario:
            # Aun no existe: el frontend pedira los datos que faltan.
            return jsonify({
                "requiere_registro": True,
                "correo": identidad["correo"],
                "nombre": identidad["nombre"],
            }), 200

        if usuario["activo"] != 1:
            return jsonify({"error": "La cuenta esta desactivada"}), 403

        return jsonify(_sesion_de(usuario)), 200

    except Exception:
        logging.exception("Error al iniciar sesión con Google")
        return jsonify({"error": "No se pudo iniciar sesión con Google"}), 500


@auth_google_bp.route("/auth/google/registro", methods=["POST"])
def registrar_con_google():
    identidad, error = _identidad_desde_peticion()
    if error:
        return error

    data = request.get_json(silent=True) or {}
    correo = identidad["correo"]

    # El nombre puede venir de Google o corregirlo el usuario en el formulario.
    nombre = limpiar_espacios(data.get("nombre")) or identidad["nombre"]
    telefono = (data.get("telefono") or "").strip()

    errores = {}
    if len(nombre) < 3:
        errores["nombre"] = "El nombre debe tener al menos 3 caracteres"
    elif not NAME_REGEX.match(nombre):
        errores["nombre"] = "El nombre solo debe contener letras y espacios"
    if not telefono_valido(telefono):
        errores["telefono"] = "El teléfono debe ser válido"

    departamento = limpiar_espacios(data.get("departamento"))
    municipio = limpiar_espacios(data.get("municipio"))
    zona = (data.get("zona") or "").strip()
    direccion_detalle = limpiar_espacios(data.get("direccion_detalle"))

    if not departamento:
        errores["departamento"] = "El departamento es obligatorio"
    if not municipio:
        errores["municipio"] = "El municipio es obligatorio"
    if not zona.isdigit() or len(zona) > 2:
        errores["zona"] = "La zona debe ser un número válido"
    if len(direccion_detalle) < 8:
        errores["direccion_detalle"] = "La dirección debe ser más específica"

    if errores:
        return jsonify({"error": "Datos invalidos", "campos": errores}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Alguien pudo registrarse con ese correo entre los dos pasos.
        existente = _buscar_usuario_por_correo(cursor, correo)
        if existente:
            if existente["activo"] != 1:
                return jsonify({"error": "La cuenta esta desactivada"}), 403
            return jsonify(_sesion_de(existente)), 200

        # La cuenta entra por Google, no por contrasena: se guarda un hash de
        # un secreto aleatorio para respetar el NOT NULL de usuario.password
        # sin dejar una credencial utilizable. Si mas adelante se agrega
        # recuperacion por correo, el usuario podra fijar una propia.
        password_aleatoria = secrets.token_urlsafe(32)
        hash_password = bcrypt.hashpw(
            password_aleatoria.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        cursor.execute(
            """
            INSERT INTO usuario (nombre, correo, password, telefono, rol)
            VALUES (%s, %s, %s, %s, 'donante')
            """,
            (nombre, correo, hash_password, telefono),
        )
        id_usuario = cursor.lastrowid

        cursor.execute(
            """
            INSERT INTO donante (id_usuario, departamento, municipio, zona, direccion_detalle)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (id_usuario, departamento, municipio, zona, direccion_detalle),
        )
        conn.commit()

        usuario = {
            "id_usuario": id_usuario,
            "nombre": nombre,
            "correo": correo,
            "telefono": telefono,
            "rol": "donante",
            "activo": 1,
        }
        respuesta = _sesion_de(usuario)
        respuesta["message"] = "Cuenta creada"
        return jsonify(respuesta), 201

    except Exception as error:
        if conn:
            conn.rollback()
        if getattr(error, "errno", None) == 1062:
            return jsonify({"error": "Ya existe una cuenta con ese correo"}), 409
        logging.exception("Error al registrar con Google")
        return jsonify({"error": "No se pudo completar el registro"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
