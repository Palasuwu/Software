# Rutas relacionadas con publicaciones
import logging
from flask import Blueprint, jsonify, request
from auth_utils import admin_required
from db.connection import get_db_connection, db_cursor
from services.plataforma_config import obtener_id_organizacion_principal
from services.publicacion_service import (articulo_existe, actualizar_estado_publicacion_db, crear_publicacion_db, intermediario_pertenece_a_organizacion, organizacion_verificada, validar_estado_publicacion, validar_publicacion_payload, )

publicacion_bp = Blueprint("publicacion", __name__)

# LISTAR ARTICULOS
@publicacion_bp.route("/articulos", methods=["GET"])
def listar_articulos():
    try:
        with db_cursor(
            connection_factory=get_db_connection
        ) as (conn, cursor):

            cursor.execute(
                """
                SELECT
                    a.id_articulo,
                    a.nombre,
                    a.descripcion,
                    c.nombre AS categoria
                FROM articulo a
                LEFT JOIN categoria_articulo c
                    ON a.id_categoria = c.id_categoria
                ORDER BY a.nombre
                """
            )

            return jsonify(cursor.fetchall()), 200

    except Exception:
        logging.exception("Error al obtener articulos")

        return jsonify({
            "error": "Error al obtener artículos"
        }), 500


#  LISTAR PUBLICACIONES
@publicacion_bp.route("/publicaciones", methods=["GET"])
def listar_publicaciones():
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
                    p.estado,
                    p.fecha_publicacion,
                    p.fecha_limite,
                    p.imagen_url,
                    p.departamento,
                    p.municipio,
                    p.zona,
                    p.direccion_detalle,
                    o.nombre AS organizacion,
                    o.direccion AS direccion,
                    c.nombre AS categoria
                    ,r.resumen AS resultado_resumen
                    ,r.personas_beneficiadas AS resultado_personas_beneficiadas
                    ,r.imagen_url AS resultado_imagen_url
                    ,DATE_FORMAT(r.fecha_publicacion, '%Y-%m-%d') AS resultado_fecha_publicacion
                FROM publicacion p
                INNER JOIN organizacion o
                    ON p.id_organizacion = o.id_organizacion
                LEFT JOIN articulo a
                    ON p.id_articulo = a.id_articulo
                LEFT JOIN categoria_articulo c
                    ON a.id_categoria = c.id_categoria
                LEFT JOIN resultado_campana r
                    ON r.id_publicacion = p.id_publicacion
                WHERE (
                    o.estado_verificacion = 'verificada'
                    AND p.estado IN ('activa', 'finalizada')
                ) OR (
                    o.estado_verificacion = 'archivada'
                    AND p.estado = 'finalizada'
                )
            """

            cursor.execute(sql)
            publicaciones = cursor.fetchall()

            return jsonify(publicaciones), 200

    except Exception:
        logging.exception("Error al listar publicaciones")

        return jsonify({
            "error": "Error al obtener publicaciones"
        }), 500


#  CREAR PUBLICACION - ADMIN
@publicacion_bp.route("/publicaciones", methods=["POST"])
@admin_required
def crear_publicacion():
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "error": "No se enviaron datos"
            }), 400

        if not data.get("id_organizacion"):
            data["id_organizacion"] = obtener_id_organizacion_principal()

        valido, errores, payload = validar_publicacion_payload(
            data
        )

        if not valido:
            return jsonify({
                "error": (
                    errores[0]
                    if errores
                    else "Datos invalidos"
                )
            }), 400

        with db_cursor(
            dictionary=False,
            connection_factory=get_db_connection
        ) as (conn, cursor):

            # La organización debe existir y estar verificada.
            if not organizacion_verificada(
                cursor,
                payload["id_organizacion"]
            ):
                return jsonify({
                    "error": (
                        "La organizacion seleccionada "
                        "debe estar verificada"
                    )
                }), 400

            # El intermediario debe pertenecer a la organización.
            if not intermediario_pertenece_a_organizacion(
                cursor,
                payload["id_intermediario"],
                payload["id_organizacion"]
            ):
                return jsonify({
                    "error": (
                        "El intermediario no pertenece "
                        "a la organizacion seleccionada"
                    )
                }), 400

            # El artículo seleccionado debe existir.
            if not articulo_existe(
                cursor,
                payload["id_articulo"]
            ):
                return jsonify({
                    "error": "El articulo seleccionado no existe"
                }), 400

            crear_publicacion_db(
                cursor,
                payload,
                payload["id_intermediario"]
            )

            conn.commit()

            return jsonify({
                "message": "Publicación creada"
            }), 201

    except Exception:
        logging.exception("Error al crear publicacion")

        return jsonify({
            "error": "Error al crear publicación"
        }), 500

# ACTUALIZAR ESTADO DE PUBLICACIÓN - ADMIN
@publicacion_bp.route(
    "/publicaciones/<int:id_publicacion>/estado",
    methods=["PUT"]
)
@admin_required
def actualizar_estado_publicacion(id_publicacion):
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
                    "Estado invalido. "
                    "Usa activa, finalizada o cancelada"
                )
            }), 400

        with db_cursor(
            connection_factory=get_db_connection
        ) as (conn, cursor):

            cursor.execute(
                """
                SELECT id_publicacion
                FROM publicacion
                WHERE id_publicacion = %s
                """,
                (id_publicacion,)
            )

            if not cursor.fetchone():
                return jsonify({
                    "error": "Publicacion no encontrada"
                }), 404

            actualizar_estado_publicacion_db(
                cursor,
                id_publicacion,
                estado
            )

            conn.commit()

            return jsonify({
                "message": "Estado de publicacion actualizado",
                "publicacion": {
                    "id_publicacion": id_publicacion,
                    "estado": estado
                }
            }), 200

    except Exception:
        logging.exception(
            "Error al actualizar estado de publicacion %s",
            id_publicacion
        )

        return jsonify({
            "error": (
                "No se pudo actualizar "
                "el estado de la publicacion"
            )
        }), 500


# OBTENER DETALLE DE PUBLICACIÓN
@publicacion_bp.route(
    "/publicaciones/<int:id_publicacion>",
    methods=["GET"]
)
def obtener_publicacion(id_publicacion):
    try:
        with db_cursor(
            connection_factory=get_db_connection
        ) as (conn, cursor):

            # Obtener información principal de la publicación.
            publicacion_sql = """
                SELECT
                    p.id_publicacion,
                    p.id_articulo,
                    p.titulo,
                    p.descripcion,
                    p.cantidad_necesaria,
                    p.cantidad_recibida,
                    p.estado,
                    p.imagen_url,
                    p.departamento,
                    p.municipio,
                    p.zona,
                    p.direccion_detalle,
                    DATE_FORMAT(
                        p.fecha_publicacion,
                        '%Y-%m-%d'
                    ) AS fecha_publicacion,
                    DATE_FORMAT(
                        p.fecha_limite,
                        '%Y-%m-%d'
                    ) AS fecha_limite,
                    o.nombre AS organizacion,
                    o.direccion,
                    c.nombre AS categoria,
                    r.resumen AS resultado_resumen,
                    r.personas_beneficiadas AS resultado_personas_beneficiadas,
                    r.imagen_url AS resultado_imagen_url,
                    DATE_FORMAT(r.fecha_publicacion, '%Y-%m-%d') AS resultado_fecha_publicacion
                FROM publicacion p
                INNER JOIN organizacion o
                    ON p.id_organizacion = o.id_organizacion
                LEFT JOIN articulo a
                    ON p.id_articulo = a.id_articulo
                LEFT JOIN categoria_articulo c
                    ON a.id_categoria = c.id_categoria
                LEFT JOIN resultado_campana r
                    ON r.id_publicacion = p.id_publicacion
                WHERE p.id_publicacion = %s
            """

            cursor.execute(
                publicacion_sql,
                (id_publicacion,)
            )

            publicacion = cursor.fetchone()

            if not publicacion:
                return jsonify({
                    "error": "Publicación no encontrada"
                }), 404

            # Obtener los artículos relacionados con la publicación.
            articulos_sql = """
                SELECT
                    a.nombre AS articulo,
                    c.nombre AS categoria,
                    COALESCE(
                        pa.descripcion_detalle,
                        a.descripcion
                    ) AS descripcion_detalle,
                    pa.cantidad
                FROM publicacion_articulo pa
                INNER JOIN articulo a
                    ON pa.id_articulo = a.id_articulo
                LEFT JOIN categoria_articulo c
                    ON a.id_categoria = c.id_categoria
                WHERE pa.id_publicacion = %s
                ORDER BY a.nombre
            """

            cursor.execute(
                articulos_sql,
                (id_publicacion,)
            )

            articulos = cursor.fetchall()

            # Compatibilidad con publicaciones antiguas que solamente utilizan publicacion.id_articulo.
            if (
                not articulos
                and publicacion.get("id_articulo")
            ):
                cursor.execute(
                    """
                    SELECT
                        a.nombre AS articulo,
                        c.nombre AS categoria,
                        a.descripcion AS descripcion_detalle
                    FROM articulo a
                    LEFT JOIN categoria_articulo c
                        ON a.id_categoria = c.id_categoria
                    WHERE a.id_articulo = %s
                    """,
                    (publicacion["id_articulo"],)
                )

                articulo_principal = cursor.fetchone()

                if articulo_principal:
                    articulos = [{
                        "articulo": (
                            articulo_principal["articulo"]
                        ),
                        "categoria": (
                            articulo_principal.get("categoria")
                        ),
                        "descripcion_detalle": (
                            articulo_principal.get( "descripcion_detalle")
                            or publicacion["descripcion"]
                        ),
                        "cantidad": (
                            publicacion["cantidad_necesaria"]
                        )
                    }]

            # Fallback funcional si no existe ningún artículo relacionado
            if not articulos:
                articulos = [{
                    "articulo": "Sin artículo definido",
                    "categoria": publicacion.get("categoria"),
                    "descripcion_detalle": (
                        publicacion["descripcion"]
                    ),
                    "cantidad": (
                        publicacion["cantidad_necesaria"]
                    )
                }]

            resultados = []

            for articulo in articulos:
                fila = {
                    "id_publicacion": ( publicacion["id_publicacion"]),
                    "titulo": publicacion["titulo"],
                    "descripcion": ( publicacion["descripcion"]),
                    "cantidad_necesaria": (publicacion["cantidad_necesaria"]),
                    "cantidad_recibida": (publicacion["cantidad_recibida"]),
                    "estado": publicacion["estado"],
                    "imagen_url": (publicacion.get("imagen_url")),
                    "fecha_publicacion": (publicacion["fecha_publicacion"]),
                    "fecha_limite": ( publicacion["fecha_limite"]  ),
                    "organizacion": (publicacion["organizacion"]),
                    "direccion": (publicacion["direccion"]),
                    "departamento": (publicacion.get("departamento")),
                    "municipio": (publicacion.get("municipio")),
                    "zona": (publicacion.get("zona")),
                    "direccion_detalle": (publicacion.get("direccion_detalle")),
                    "categoria": (articulo.get("categoria")
                        or publicacion.get("categoria")
                        or "Sin categoria"
                    ),
                    "resultado_resumen": publicacion.get("resultado_resumen"),
                    "resultado_personas_beneficiadas": publicacion.get("resultado_personas_beneficiadas"),
                    "resultado_imagen_url": publicacion.get("resultado_imagen_url"),
                    "resultado_fecha_publicacion": publicacion.get("resultado_fecha_publicacion"),
                    "articulo": (
                        articulo.get("articulo")
                        or "Sin artículo definido"
                    ),
                    "descripcion_detalle": (
                        articulo.get("descripcion_detalle")
                        or publicacion["descripcion"]
                    ),
                    "cantidad": (
                        articulo.get("cantidad")
                        or publicacion["cantidad_necesaria"]
                    )
                }
                resultados.append(fila)
            return jsonify(resultados), 200

    except Exception:
        logging.exception(
            "Error al obtener publicacion %s",
            id_publicacion
        )

        return jsonify({
            "error": "Error al obtener la publicación"
        }), 500
