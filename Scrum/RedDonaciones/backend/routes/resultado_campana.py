import logging

from flask import Blueprint, jsonify, request

from auth_utils import token_required, autorizar_lectura_institucional
from db.connection import db_cursor, get_db_connection
from services.publicacion_service import organizacion_verificada
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
    pertenece = cursor.fetchone() is not None
    return pertenece and organizacion_verificada(cursor, publicacion["id_organizacion"])


@resultado_campana_bp.route(
    "/publicaciones/<int:id_publicacion>/resultado",
    methods=["GET"]
)
def consultar_resultado(id_publicacion):
    try:
        with db_cursor(connection_factory=get_db_connection) as (_, cursor):
            cursor.execute(
                """
                SELECT p.id_organizacion, o.estado_verificacion,
                    CASE
                        WHEN COALESCE(p.estado, 'activa') = 'activa'
                             AND p.fecha_limite IS NOT NULL AND p.fecha_limite < CURDATE()
                        THEN 'cancelada'
                        ELSE COALESCE(p.estado, 'activa')
                    END AS estado
                FROM publicacion p
                INNER JOIN organizacion o ON o.id_organizacion = p.id_organizacion
                WHERE p.id_publicacion = %s
                """,
                (id_publicacion,),
            )
            publicacion = cursor.fetchone()
            if not publicacion:
                return jsonify({"error": "Resultado no publicado"}), 404
            # Pendientes y archivadas nunca son públicas. Para verificadas,
            # respetar también la visibilidad actual de la campaña.
            requiere_autorizacion = (
                publicacion["estado_verificacion"] in ("pendiente", "archivada")
                or (publicacion["estado_verificacion"] == "verificada"
                    and publicacion["estado"] not in ("activa", "finalizada"))
            )
            if requiere_autorizacion:
                error = autorizar_lectura_institucional(
                    cursor, publicacion["id_organizacion"], publicacion["estado_verificacion"],
                    "Resultado no publicado",
                )
                if error:
                    return error
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
