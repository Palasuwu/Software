# Rutas relacionadas con organizaciones
import logging
import re

from flask import Blueprint, jsonify, request

from db.connection import get_db_connection
from auth_utils import admin_required, verify_token

logging.basicConfig(level=logging.INFO)

organizacion_bp = Blueprint("organizacion", __name__)
EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
PHONE_REGEX = re.compile(r"^[0-9+\-()\s]{8,20}$")
ESTADOS_VALIDOS = ("pendiente", "verificada", "rechazada", "inactiva", "archivada")


def limpiar_espacios(value):
    return re.sub(r"\s+", " ", (value or "").strip())


def request_es_admin():
    auth_header = request.headers.get("Authorization", "")
    parts = auth_header.split()
    if len(parts) != 2 or parts[0] != "Bearer":
        return False

    payload = verify_token(parts[1])
    return payload and payload.get("rol") == "administrador"


def normalizar_organizacion_payload(data):
    nombre = limpiar_espacios(data.get("nombre"))
    descripcion = limpiar_espacios(data.get("descripcion"))
    direccion = limpiar_espacios(data.get("direccion"))
    telefono = (data.get("telefono") or "").strip()
    correo = (data.get("correo") or "").strip().lower()
    estado_verificacion = (data.get("estado_verificacion") or "pendiente").strip().lower()

    errores = {}
    if len(nombre) < 3:
        errores["nombre"] = "El nombre debe tener al menos 3 caracteres"
    if len(descripcion) < 10:
        errores["descripcion"] = "La descripcion debe tener al menos 10 caracteres"
    if len(direccion) < 8:
        errores["direccion"] = "La direccion debe ser mas especifica"
    if not PHONE_REGEX.match(telefono) or len(re.findall(r"\d", telefono)) < 8:
        errores["telefono"] = "El telefono debe ser valido"
    if not EMAIL_REGEX.match(correo):
        errores["correo"] = "El correo debe ser valido"
    if estado_verificacion not in ESTADOS_VALIDOS:
        errores["estado_verificacion"] = "Estado de verificacion no valido"

    return {
        "nombre": nombre,
        "descripcion": descripcion,
        "direccion": direccion,
        "telefono": telefono,
        "correo": correo,
        "estado_verificacion": estado_verificacion,
    }, errores


def obtener_organizacion(cursor, id_organizacion):
    cursor.execute(
        """
        SELECT id_organizacion, nombre, descripcion, direccion, telefono, correo, estado_verificacion
        FROM organizacion
        WHERE id_organizacion = %s
        """,
        (id_organizacion,),
    )
    return cursor.fetchone()


@organizacion_bp.route("/organizaciones", methods=["GET"])
def listar_organizaciones():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        incluir_todas = request.args.get("vista") == "admin"
        if incluir_todas and not request_es_admin():
            return jsonify({"error": "Acceso denegado: requiere rol administrador"}), 403

        where_sql = "" if incluir_todas else "WHERE estado_verificacion = 'verificada'"

        cursor.execute(
            f"""
            SELECT id_organizacion, nombre, descripcion, direccion, telefono, correo, estado_verificacion
            FROM organizacion
            {where_sql}
            ORDER BY FIELD(estado_verificacion, 'pendiente', 'verificada', 'rechazada', 'inactiva', 'archivada'), nombre
            """
        )
        organizaciones = cursor.fetchall()

        return jsonify(organizaciones), 200

    except Exception:
        logging.exception("Error al listar organizaciones")
        return jsonify({"error": "Error al obtener organizaciones"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Para el detalle
@organizacion_bp.route("/organizaciones/<int:id_organizacion>", methods=["GET"])
def obtener_detalle_organizacion(id_organizacion):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id_organizacion, nombre, descripcion, direccion, telefono, correo, estado_verificacion
            FROM organizacion
            WHERE id_organizacion = %s AND estado_verificacion = 'verificada'
            """,
            (id_organizacion,),
        )
        organizacion = cursor.fetchone()

        if not organizacion:
            return jsonify({"error": "Organización no encontrada"}), 404

        cursor.execute(
            """
            SELECT id_publicacion, titulo, descripcion, cantidad_necesaria, cantidad_recibida, estado
            FROM publicacion
            WHERE id_organizacion = %s
            ORDER BY fecha_publicacion DESC
            """,
            (id_organizacion,),
        )
        publicaciones = cursor.fetchall()

        return jsonify({
            "organizacion": organizacion,
            "publicaciones": publicaciones
        }), 200

    except Exception:
        logging.exception("Error al obtener detalles de organización")
        return jsonify({"error": "Error al obtener detalles"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Rutas de admin
@organizacion_bp.route("/organizaciones", methods=["POST"])
@admin_required
def crear_organizacion():
    conn = None
    cursor = None

    try:
        data = request.get_json() or {}
        payload, errores = normalizar_organizacion_payload(data)
        if errores:
            return jsonify({"error": "Datos invalidos", "campos": errores}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            INSERT INTO organizacion (nombre, descripcion, direccion, telefono, correo, estado_verificacion)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                payload["nombre"],
                payload["descripcion"],
                payload["direccion"],
                payload["telefono"],
                payload["correo"],
                payload["estado_verificacion"],
            ),
        )
        id_organizacion = cursor.lastrowid
        conn.commit()

        return jsonify({
            "message": "Organizacion creada",
            "organizacion": obtener_organizacion(cursor, id_organizacion),
        }), 201

    except Exception as error:
        if conn:
            conn.rollback()
        if getattr(error, "errno", None) == 1062:
            return jsonify({"error": "Ya existe una organizacion con ese correo o telefono"}), 409
        logging.exception("Error al crear organizacion")
        return jsonify({"error": "No se pudo crear la organizacion"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@organizacion_bp.route("/organizaciones/<int:id_organizacion>", methods=["PUT"])
@admin_required
def actualizar_organizacion(id_organizacion):
    conn = None
    cursor = None

    try:

        payload, errores = normalizar_organizacion_payload(request.get_json() or {})
        if errores:
            return jsonify({"error": "Datos invalidos", "campos": errores}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if not obtener_organizacion(cursor, id_organizacion):
            return jsonify({"error": "Organizacion no encontrada"}), 404

        cursor.execute(
            """
            UPDATE organizacion
            SET nombre = %s,
                descripcion = %s,
                direccion = %s,
                telefono = %s,
                correo = %s,
                estado_verificacion = %s
            WHERE id_organizacion = %s
            """,
            (
                payload["nombre"],
                payload["descripcion"],
                payload["direccion"],
                payload["telefono"],
                payload["correo"],
                payload["estado_verificacion"],
                id_organizacion,
            ),
        )
        conn.commit()

        return jsonify({
            "message": "Organizacion actualizada",
            "organizacion": obtener_organizacion(cursor, id_organizacion),
        }), 200

    except Exception as error:
        if conn:
            conn.rollback()
        if getattr(error, "errno", None) == 1062:
            return jsonify({"error": "Ya existe una organizacion con ese correo o telefono"}), 409
        logging.exception("Error al actualizar organizacion")
        return jsonify({"error": "No se pudo actualizar la organizacion"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@organizacion_bp.route("/organizaciones/<int:id_organizacion>", methods=["DELETE"])
@admin_required
def desactivar_organizacion(id_organizacion):
    conn = None
    cursor = None

    try:

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if not obtener_organizacion(cursor, id_organizacion):
            return jsonify({"error": "Organizacion no encontrada"}), 404

        cursor.execute(
            "UPDATE organizacion SET estado_verificacion = 'inactiva' WHERE id_organizacion = %s",
            (id_organizacion,),
        )
        conn.commit()

        return jsonify({"message": "Organizacion desactivada"}), 200

    except Exception:
        if conn:
            conn.rollback()
        logging.exception("Error al desactivar organizacion")
        return jsonify({"error": "No se pudo desactivar la organizacion"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@organizacion_bp.route("/organizaciones/<int:id_organizacion>/archivar", methods=["PUT"])
@admin_required
def archivar_organizacion(id_organizacion):
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if not obtener_organizacion(cursor, id_organizacion):
            return jsonify({"error": "Organizacion no encontrada"}), 404

        cursor.execute(
            "UPDATE organizacion SET estado_verificacion = 'archivada' WHERE id_organizacion = %s",
            (id_organizacion,),
        )
        conn.commit()

        return jsonify({"message": "Organizacion archivada"}), 200

    except Exception:
        if conn:
            conn.rollback()
        logging.exception("Error al archivar organizacion")
        return jsonify({"error": "No se pudo archivar la organizacion"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
