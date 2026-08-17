# Rutas relacionadas con intermediarios

import logging
from flask import Blueprint, jsonify, request
from auth_utils import intermediario_required
from db.connection import get_db_connection, db_cursor
from services.publicacion_service import (articulo_existe, actualizar_estado_publicacion_db, crear_publicacion_db, editar_publicacion_db, organizacion_verificada, publicacion_pertenece_a_organizacion, validar_estado_publicacion, validar_publicacion_payload, )
from services.donacion_service import (validar_estado_donacion, cambiar_estado_donaciones_masivo, )

intermediario_bp = Blueprint("intermediario", __name__)

# LISTAR PUBLICACIONES DE LA ORGANIZACIÓN
@intermediario_bp.route(
    "/intermediario/publicaciones",
    methods=["GET"]
)
@intermediario_required
def obtener_publicaciones_intermediario():
    try:
        with db_cursor(
            connection_factory=get_db_connection
        ) as (conn, cursor):

            sql = """
                SELECT
                    p.id_publicacion,
                    p.titulo,
                    p.descripcion,
                    p.cantidad_necesaria,
                    p.cantidad_recibida,
                    p.fecha_publicacion,
                    p.fecha_limite,
                    p.estado,
                    p.imagen_url,
                    o.nombre AS organizacion,
                    a.nombre AS articulo
                FROM publicacion p
                INNER JOIN organizacion o
                    ON p.id_organizacion = o.id_organizacion
                INNER JOIN articulo a
                    ON p.id_articulo = a.id_articulo
                WHERE p.id_organizacion = %s
                ORDER BY p.fecha_publicacion DESC
            """
            cursor.execute(
                sql,
                (request.id_organizacion,)
            )

            publicaciones = cursor.fetchall()

            return jsonify(publicaciones), 200

    except Exception:
        logging.exception(
            "Error al obtener publicaciones del intermediario"
        )

        return jsonify({
            "error": "No se pudieron obtener las publicaciones"
        }), 500


# LISTAR INTERMEDIARIOS DE LA ORGANIZACIÓN
@intermediario_bp.route(
    "/intermediario/usuarios",
    methods=["GET"]
)
@intermediario_required
def obtener_intermediarios_organizacion():
    try:
        with db_cursor(
            connection_factory=get_db_connection
        ) as (conn, cursor):

            sql = """
                SELECT
                    u.id_usuario,
                    u.nombre,
                    u.correo,
                    u.telefono,
                    i.cargo
                FROM usuario u
                INNER JOIN intermediario i
                    ON u.id_usuario = i.id_usuario
                WHERE i.id_organizacion = %s
                ORDER BY u.nombre ASC
            """

            cursor.execute(
                sql,
                (request.id_organizacion,)
            )

            usuarios = cursor.fetchall()
            return jsonify(usuarios), 200

    except Exception:
        logging.exception(
            "Error al obtener intermediarios de la organización"
        )

        return jsonify({
            "error": "No se pudieron obtener los intermediarios"
        }), 500


# CAMBIAR ESTADO DE PUBLICACIÓN
@intermediario_bp.route(
    "/intermediario/publicaciones/<int:id_publicacion>/estado",
    methods=["PUT"]
)
@intermediario_required
def cambiar_estado_publicacion(id_publicacion):
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "error": "No se enviaron datos"
            }), 400

        estado = (data.get("estado") or "").strip().lower()

        if not validar_estado_publicacion(estado):
            return jsonify({
                "error": (
                    "Estado inválido. "
                    "Usa activa, finalizada o cancelada"
                )
            }), 400

        with db_cursor(
            connection_factory=get_db_connection
        ) as (conn, cursor):

            # El intermediario solamente puede modificar publicaciones de su organización
            if not publicacion_pertenece_a_organizacion(
                cursor,
                id_publicacion,
                request.id_organizacion
            ):
                return jsonify({
                    "error": "Publicación no encontrada"
                }), 404

            actualizar_estado_publicacion_db(
                cursor,
                id_publicacion,
                estado
            )

            conn.commit()

            return jsonify({
                "message": "Estado actualizado"
            }), 200

    except Exception:
        logging.exception(
            "Error al actualizar estado de publicación %s",
            id_publicacion
        )

        return jsonify({
            "error": "No se pudo actualizar el estado"
        }), 500


# CREAR PUBLICACIÓN
@intermediario_bp.route(
    "/intermediario/publicaciones",
    methods=["POST"]
)
@intermediario_required
def crear_publicacion_intermediario():
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "error": "No se enviaron datos"
            }), 400

        valido, errores, payload = validar_publicacion_payload(
            data,
            require_intermediario=False,
            require_organizacion=False,
            require_articulo=True
        )

        if not valido:
            return jsonify({
                "error": (
                    errores[0]
                    if errores
                    else "Datos invalidos"
                )
            }), 400

        payload["id_intermediario"] = request.usuario_id
        payload["id_organizacion"] = request.id_organizacion

        with db_cursor(
            connection_factory=get_db_connection
        ) as (conn, cursor):

            # La organización debe continuar verificada
            if not organizacion_verificada(
                cursor,
                request.id_organizacion
            ):
                return jsonify({
                    "error": "La organizacion debe estar verificada"
                }), 400

            # El artículo seleccionado debe existir
            if not articulo_existe(
                cursor,
                payload["id_articulo"]
            ):
                return jsonify({
                    "error": "El articulo seleccionado no existe"
                }), 400

            crear_publicacion_db(cursor, payload, request.usuario_id)

            conn.commit()

            return jsonify({
                "message": "Publicación creada"
            }), 201

    except Exception:
        logging.exception(
            "Error al crear publicación como intermediario"
        )

        return jsonify({
            "error": "No se pudo crear la publicación"
        }), 500


# EDITAR PUBLICACIÓN
@intermediario_bp.route(
    "/intermediario/publicaciones/<int:id_publicacion>",
    methods=["PUT"]
)
@intermediario_required
def editar_publicacion_intermediario(id_publicacion):
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "error": "No se enviaron datos"
            }), 400
        valido, errores, payload = validar_publicacion_payload(
            data,
            require_intermediario=False,
            require_organizacion=False,
            require_articulo=True
        )
        if not valido:
            return jsonify({
                "error": (
                    errores[0]
                    if errores
                    else "Datos inválidos"
                )
            }), 400
        # Estos datos no pueden ser elegidos libremente por el intermediario
        payload["id_intermediario"] = request.usuario_id
        payload["id_organizacion"] = request.id_organizacion

        with db_cursor(
            connection_factory=get_db_connection
        ) as (conn, cursor):

            # Validar ownership de la publicación.
            if not publicacion_pertenece_a_organizacion(
                cursor,
                id_publicacion,
                request.id_organizacion
            ):
                return jsonify({
                    "error": "Publicación no encontrada"
                }), 404

            # Mantener la misma validación institucional utilizada durante la creación
            if not organizacion_verificada(
                cursor,
                request.id_organizacion
            ):
                return jsonify({
                    "error": "La organización debe estar verificada"
                }), 400

            if not articulo_existe(
                cursor,
                payload["id_articulo"]
            ):
                return jsonify({
                    "error": "El articulo seleccionado no existe"
                }), 400

            editar_publicacion_db(cursor, id_publicacion, payload)

            conn.commit()

            return jsonify({
                "message": "Publicación actualizada"
            }), 200

    except Exception:
        logging.exception(
            "Error al editar publicación %s",
            id_publicacion
        )

        return jsonify({
            "error": "No se pudo actualizar la publicación"
        }), 500


# LISTAR DONACIONES DE LA ORGANIZACIÓN
@intermediario_bp.route(
    "/intermediario/donaciones",
    methods=["GET"]
)
@intermediario_required
def obtener_donaciones_intermediario():
    try:
        with db_cursor(
            connection_factory=get_db_connection
        ) as (conn, cursor):

            sql = """
                SELECT
                    d.id_donacion,
                    d.id_publicacion,
                    d.nombre_contacto,
                    d.telefono_contacto,
                    d.cantidad_donada,
                    d.estado,
                    DATE_FORMAT(
                        d.fecha_donacion,
                        '%Y-%m-%d'
                    ) AS fecha_donacion,
                    p.titulo AS publicacion_titulo,
                    u.nombre AS donante_nombre
                FROM donacion d
                INNER JOIN publicacion p
                    ON p.id_publicacion = d.id_publicacion
                INNER JOIN usuario u
                    ON u.id_usuario = d.id_donante
                WHERE p.id_organizacion = %s
                ORDER BY
                    d.fecha_donacion DESC,
                    d.id_donacion DESC
            """

            cursor.execute(
                sql,
                (request.id_organizacion,)
            )

            donaciones = cursor.fetchall()

            return jsonify(donaciones), 200

    except Exception:
        logging.exception(
            "Error al obtener donaciones de la organización"
        )

        return jsonify({
            "error": "No se pudieron obtener las donaciones"
        }), 500


# ACTUALIZAR ESTADO DE VARIAS DONACIONES A LA VEZ
@intermediario_bp.route(
    "/intermediario/donaciones/estado",
    methods=["PUT"]
)
@intermediario_required
def actualizar_estado_donaciones_masivo():
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "error": "No se enviaron datos"
            }), 400

        ids_donacion = data.get("ids_donacion")
        nuevo_estado = validar_estado_donacion(data.get("estado"))

        if not isinstance(ids_donacion, list) or not ids_donacion:
            return jsonify({
                "error": "Debes indicar al menos una donación"
            }), 400

        try:
            ids_donacion = [
                int(id_donacion) for id_donacion in ids_donacion
            ]
        except (ValueError, TypeError):
            return jsonify({
                "error": "ids_donacion debe ser una lista de enteros"
            }), 400

        if not nuevo_estado:
            return jsonify({
                "error": (
                    "Estado inválido. Usa pendiente, "
                    "recibida, en_proceso, entregada "
                    "o rechazada"
                )
            }), 400

        with db_cursor(
            connection_factory=get_db_connection
        ) as (conn, cursor):

            actualizadas, omitidas = cambiar_estado_donaciones_masivo(
                cursor,
                ids_donacion,
                nuevo_estado,
                request.id_organizacion
            )

            conn.commit()

            return jsonify({
                "message": (
                    f"{len(actualizadas)} donación(es) actualizada(s)"
                ),
                "actualizadas": actualizadas,
                "omitidas": omitidas
            }), 200

    except Exception:
        logging.exception(
            "Error al actualizar estado de donaciones en bloque"
        )

        return jsonify({
            "error": (
                "No se pudo actualizar el estado de las donaciones"
            )
        }), 500