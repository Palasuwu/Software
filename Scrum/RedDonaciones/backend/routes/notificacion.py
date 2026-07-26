import logging

from flask import Blueprint, jsonify, request

from auth_utils import token_required
from db.connection import get_db_connection
from db.notificaciones import asegurar_tabla_notificaciones


notificacion_bp = Blueprint("notificacion", __name__)


@notificacion_bp.route("/notificaciones", methods=["GET"])
@token_required
def listar_notificaciones():
    conn = None
    cursor = None

    try:
        limite = request.args.get("limite", 20, type=int)
        limite = max(1, min(limite, 50))

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        asegurar_tabla_notificaciones(cursor)

        cursor.execute(
            """
            SELECT
                id_notificacion,
                tipo,
                titulo,
                mensaje,
                enlace,
                leida,
                fecha_creacion,
                fecha_lectura
            FROM notificacion
            WHERE id_usuario = %s
            ORDER BY fecha_creacion DESC, id_notificacion DESC
            LIMIT %s
            """,
            (request.usuario_id, limite)
        )
        notificaciones = cursor.fetchall()

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM notificacion
            WHERE id_usuario = %s AND leida = 0
            """,
            (request.usuario_id,)
        )
        total_no_leidas = cursor.fetchone()["total"]
        conn.commit()

        return jsonify({
            "notificaciones": notificaciones,
            "total_no_leidas": total_no_leidas
        }), 200
    except Exception:
        logging.exception("Error al listar notificaciones")
        if conn:
            conn.rollback()
        return jsonify({"error": "No se pudieron obtener las notificaciones"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@notificacion_bp.route("/notificaciones/<int:id_notificacion>/leer", methods=["PATCH"])
@token_required
def marcar_notificacion_leida(id_notificacion):
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        asegurar_tabla_notificaciones(cursor)
        cursor.execute(
            """
            UPDATE notificacion
            SET leida = 1,
                fecha_lectura = COALESCE(fecha_lectura, CURRENT_TIMESTAMP)
            WHERE id_notificacion = %s AND id_usuario = %s
            """,
            (id_notificacion, request.usuario_id)
        )

        if cursor.rowcount == 0:
            conn.rollback()
            return jsonify({"error": "Notificacion no encontrada"}), 404

        conn.commit()
        return jsonify({"message": "Notificacion marcada como leida"}), 200
    except Exception:
        logging.exception("Error al marcar una notificacion como leida")
        if conn:
            conn.rollback()
        return jsonify({"error": "No se pudo actualizar la notificacion"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@notificacion_bp.route("/notificaciones/leer-todas", methods=["PATCH"])
@token_required
def marcar_todas_leidas():
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        asegurar_tabla_notificaciones(cursor)
        cursor.execute(
            """
            UPDATE notificacion
            SET leida = 1, fecha_lectura = CURRENT_TIMESTAMP
            WHERE id_usuario = %s AND leida = 0
            """,
            (request.usuario_id,)
        )
        actualizadas = cursor.rowcount
        conn.commit()

        return jsonify({
            "message": "Notificaciones marcadas como leidas",
            "actualizadas": actualizadas
        }), 200
    except Exception:
        logging.exception("Error al marcar todas las notificaciones como leidas")
        if conn:
            conn.rollback()
        return jsonify({"error": "No se pudieron actualizar las notificaciones"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
