import logging

from flask import Blueprint, jsonify, request

from auth_utils import token_required
from db.connection import db_cursor, get_db_connection
from services.resultado_campana_service import (
    guardar_resultado_campana,
    obtener_resultado_campana,
    validar_resultado_campana,
)


resultado_campana_bp = Blueprint("resultado_campana", __name__)


def _puede_publicar_resultado(cursor, publicacion):
    if request.usuario_rol == "administrador":
        return True
    if request.usuario_rol != "intermediario":
        return False

    cursor.execute(
        """
        SELECT 1
        FROM intermediario
        WHERE id_usuario = %s AND id_organizacion = %s
        """,
        (request.usuario_id, publicacion["id_organizacion"])
    )
    return cursor.fetchone() is not None


@resultado_campana_bp.route(
    "/publicaciones/<int:id_publicacion>/resultado",
    methods=["GET"]
)
def consultar_resultado(id_publicacion):
    try:
        with db_cursor(connection_factory=get_db_connection) as (_, cursor):
            resultado = obtener_resultado_campana(cursor, id_publicacion)
            if not resultado:
                return jsonify({"error": "Resultado no publicado"}), 404
            return jsonify(resultado), 200
    except Exception:
        logging.exception("Error al consultar resultado de campaña %s", id_publicacion)
        return jsonify({"error": "No se pudo consultar el resultado"}), 500


@resultado_campana_bp.route(
    "/publicaciones/<int:id_publicacion>/resultado",
    methods=["POST", "PUT"]
)
@token_required
def publicar_resultado(id_publicacion):
    payload, errores = validar_resultado_campana(request.get_json(silent=True))
    if errores:
        return jsonify({"error": next(iter(errores.values())), "errors": errores}), 400

    try:
        with db_cursor(connection_factory=get_db_connection) as (conn, cursor):
            cursor.execute(
                """
                SELECT id_publicacion, id_organizacion, estado
                FROM publicacion
                WHERE id_publicacion = %s
                """,
                (id_publicacion,)
            )
            publicacion = cursor.fetchone()
            if not publicacion:
                return jsonify({"error": "Publicación no encontrada"}), 404
            if publicacion["estado"] != "finalizada":
                return jsonify({
                    "error": "Solo se pueden publicar resultados de campañas finalizadas"
                }), 409
            if not _puede_publicar_resultado(cursor, publicacion):
                return jsonify({"error": "No tienes permiso para publicar este resultado"}), 403

            guardar_resultado_campana(cursor, id_publicacion, request.usuario_id, payload)
            conn.commit()
            resultado = obtener_resultado_campana(cursor, id_publicacion)
            return jsonify({
                "message": "Resultados publicados correctamente",
                "resultado": resultado
            }), 200
    except Exception:
        logging.exception("Error al publicar resultado de campaña %s", id_publicacion)
        return jsonify({"error": "No se pudo publicar el resultado"}), 500
