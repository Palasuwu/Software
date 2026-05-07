# Rutas relacionadas con organizaciones
import logging

from flask import Blueprint, jsonify, request

from db.connection import get_db_connection

logging.basicConfig(level=logging.INFO)

organizacion_bp = Blueprint("organizacion", __name__)


def normalizar_organizacion_payload(data):
    nombre = (data.get("nombre") or "").strip()
    descripcion = (data.get("descripcion") or "").strip()
    direccion = (data.get("direccion") or "").strip()
    telefono = (data.get("telefono") or "").strip()
    correo = (data.get("correo") or "").strip().lower()
    estado_verificacion = (data.get("estado_verificacion") or "pendiente").strip().lower()

    errores = {}
    if len(nombre) < 3:
        errores["nombre"] = "El nombre debe tener al menos 3 caracteres"
    if len(descripcion) < 10:
        errores["descripcion"] = "La descripcion debe tener al menos 10 caracteres"
    if not direccion:
        errores["direccion"] = "La direccion es obligatoria"
    if not telefono:
        errores["telefono"] = "El telefono es obligatorio"
    if not correo or "@" not in correo:
        errores["correo"] = "El correo debe ser valido"
    if estado_verificacion not in ("pendiente", "verificada", "rechazada", "inactiva"):
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
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id_organizacion, nombre, descripcion, direccion, telefono, correo, estado_verificacion
            FROM organizacion
            ORDER BY FIELD(estado_verificacion, 'pendiente', 'verificada', 'rechazada', 'inactiva'), nombre
            """
        )
        organizaciones = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(organizaciones), 200

    except Exception:
        logging.exception("Error al listar organizaciones")
        return jsonify({"error": "Error al obtener organizaciones"}), 500


@organizacion_bp.route("/organizaciones", methods=["POST"])
def crear_organizacion():
    conn = None
    cursor = None

    try:
        payload, errores = normalizar_organizacion_payload(request.get_json() or {})
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

    except Exception:
        if conn:
            conn.rollback()
        logging.exception("Error al crear organizacion")
        return jsonify({"error": "No se pudo crear la organizacion"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@organizacion_bp.route("/organizaciones/<int:id_organizacion>", methods=["PUT"])
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

    except Exception:
        if conn:
            conn.rollback()
        logging.exception("Error al actualizar organizacion")
        return jsonify({"error": "No se pudo actualizar la organizacion"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@organizacion_bp.route("/organizaciones/<int:id_organizacion>", methods=["DELETE"])
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
