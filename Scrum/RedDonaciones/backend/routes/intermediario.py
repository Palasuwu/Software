# Rutas relacionadas con intermediarios

from datetime import datetime
import logging
from flask import Blueprint, jsonify, request
from auth_utils import (
    token_required,
    intermediario_required,
    _obtener_organizacion_actual_intermediario,
)
from db.connection import get_db_connection, db_cursor
from services.publicacion_service import (
    articulo_existe,
    actualizar_estado_publicacion_db,
    crear_publicacion_db,
    editar_publicacion_db,
    organizacion_verificada,
    publicacion_pertenece_a_organizacion,
    validar_estado_publicacion,
    validar_publicacion_payload,
)
from services.donacion_service import (
    validar_estado_donacion,
    cambiar_estado_donaciones_masivo,
    consultar_donaciones_recibidas_db,
)

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
@token_required
def obtener_donaciones_intermediario():
    if request.usuario_rol not in ("intermediario", "administrador"):
        return jsonify({
            "error": "Acceso denegado"
        }), 403

    try:
        id_organizacion = None

        if request.usuario_rol == "intermediario":
            id_organizacion = _obtener_organizacion_actual_intermediario(
                request.usuario_id
            )
            if id_organizacion is None:
                return jsonify({
                    "error": "El usuario no está asociado a una organización"
                }), 403
        elif request.usuario_rol == "administrador":
            org_param = request.args.get("id_organizacion")
            if org_param is not None and str(org_param).strip() != "":
                try:
                    id_organizacion = int(org_param)
                except (ValueError, TypeError):
                    return jsonify({
                        "error": "id_organizacion debe ser un entero"
                    }), 400

        estado = request.args.get("estado")
        id_publicacion = request.args.get("id_publicacion")
        fecha_desde = request.args.get("fecha_desde") or request.args.get("fecha_inicio")
        fecha_hasta = request.args.get("fecha_hasta") or request.args.get("fecha_fin")
        buscar = request.args.get("buscar") or request.args.get("donante") or request.args.get("q")

        estado_normalizado = None
        if estado and str(estado).strip():
            estado_normalizado = validar_estado_donacion(estado)
            if not estado_normalizado:
                return jsonify({
                    "error": "Estado inválido. Usa pendiente, recibida, en_proceso, entregada o rechazada"
                }), 400

        id_pub_int = None
        if id_publicacion is not None and str(id_publicacion).strip() != "":
            try:
                id_pub_int = int(id_publicacion)
            except (ValueError, TypeError):
                return jsonify({
                    "error": "id_publicacion debe ser un entero"
                }), 400

        fecha_desde_val = None
        if fecha_desde and str(fecha_desde).strip():
            try:
                datetime.strptime(str(fecha_desde).strip(), "%Y-%m-%d")
                fecha_desde_val = str(fecha_desde).strip()
            except ValueError:
                return jsonify({
                    "error": "fecha_desde debe tener formato YYYY-MM-DD"
                }), 400

        fecha_hasta_val = None
        if fecha_hasta and str(fecha_hasta).strip():
            try:
                datetime.strptime(str(fecha_hasta).strip(), "%Y-%m-%d")
                fecha_hasta_val = str(fecha_hasta).strip()
            except ValueError:
                return jsonify({
                    "error": "fecha_hasta debe tener formato YYYY-MM-DD"
                }), 400

        buscar_val = str(buscar).strip() if (buscar and str(buscar).strip()) else None

        with db_cursor(
            connection_factory=get_db_connection
        ) as (conn, cursor):
            donaciones = consultar_donaciones_recibidas_db(
                cursor=cursor,
                id_organizacion=id_organizacion,
                estado=estado_normalizado,
                id_publicacion=id_pub_int,
                fecha_desde=fecha_desde_val,
                fecha_hasta=fecha_hasta_val,
                buscar=buscar_val
            )

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


# OBTENER PERFIL INSTITUCIONAL DE LA ORGANIZACIÓN
@intermediario_bp.route(
    "/intermediario/organizacion",
    methods=["GET"]
)
@intermediario_required
def obtener_perfil_institucional():
    try:
        with db_cursor(
            connection_factory=get_db_connection
        ) as (conn, cursor):

            cursor.execute(
                """
                SELECT
                    id_organizacion,
                    nombre,
                    quienes_somos,
                    que_hacemos,
                    como_trabajamos,
                    donde_trabajamos,
                    url_logo,
                    imagen_portada
                FROM organizacion
                WHERE id_organizacion = %s
                """,
                (request.id_organizacion,)
            )

            organizacion = cursor.fetchone()

            if not organizacion:
                return jsonify({
                    "error": "Organización no encontrada"
                }), 404

            return jsonify(organizacion), 200

    except Exception:
        logging.exception(
            "Error al obtener perfil institucional"
        )

        return jsonify({
            "error": "No se pudo obtener el perfil institucional"
        }), 500


# ACTUALIZAR PERFIL INSTITUCIONAL DE LA ORGANIZACIÓN
@intermediario_bp.route(
    "/intermediario/organizacion",
    methods=["PUT"]
)
@intermediario_required
def actualizar_perfil_institucional():
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "error": "No se enviaron datos"
            }), 400

        campos = (
            (data.get("quienes_somos") or "").strip() or None,
            (data.get("que_hacemos") or "").strip() or None,
            (data.get("como_trabajamos") or "").strip() or None,
            (data.get("donde_trabajamos") or "").strip() or None,
            (data.get("url_logo") or "").strip() or None,
            (data.get("imagen_portada") or "").strip() or None,
        )

        with db_cursor(
            connection_factory=get_db_connection
        ) as (conn, cursor):

            cursor.execute(
                """
                UPDATE organizacion
                SET
                    quienes_somos = %s,
                    que_hacemos = %s,
                    como_trabajamos = %s,
                    donde_trabajamos = %s,
                    url_logo = %s,
                    imagen_portada = %s
                WHERE id_organizacion = %s
                """,
                campos + (request.id_organizacion,)
            )

            conn.commit()

            return jsonify({
                "message": "Perfil institucional actualizado"
            }), 200

    except Exception:
        logging.exception(
            "Error al actualizar perfil institucional"
        )

        return jsonify({
            "error": "No se pudo actualizar el perfil institucional"
        }), 500