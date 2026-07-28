# Aquí se definen las rutas relacionadas con las publicaciones

from flask import Blueprint, request, jsonify
from datetime import datetime
import logging
from db.connection import get_db_connection, db_cursor
from auth_utils import admin_required, token_required

# Log exceptions for easier debugging without leaking details to clients
logging.basicConfig(level=logging.INFO)

publicacion_bp = Blueprint("publicacion", __name__)


_tiene_imagen_url_cache = None


def publicacion_tiene_imagen_url(cursor):
    global _tiene_imagen_url_cache
    if _tiene_imagen_url_cache is not None:
        return _tiene_imagen_url_cache

    cursor.execute(
        """
        SELECT COUNT(*) AS total
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'publicacion'
          AND COLUMN_NAME = 'imagen_url'
        """
    )
    row = cursor.fetchone()

    if isinstance(row, dict):
        has_column = row.get("total", 0) > 0
    else:
        has_column = bool(row and row[0] > 0)

    _tiene_imagen_url_cache = has_column
    return has_column



@publicacion_bp.route("/articulos", methods=["GET"])
def listar_articulos():
    try:
        with db_cursor(connection_factory=get_db_connection) as (conn, cursor):
            cursor.execute("""
                SELECT a.id_articulo, a.nombre, a.descripcion, c.nombre AS categoria
                FROM articulo a
                LEFT JOIN categoria_articulo c ON a.id_categoria = c.id_categoria
                ORDER BY a.nombre
            """)
            return jsonify(cursor.fetchall()), 200
    except Exception as e:
        return jsonify({"error": "Error al obtener artículos", "detalle": str(e)}), 500


# Ruta para obtener la lista de publicaciones
@publicacion_bp.route("/publicaciones", methods=["GET"])
def listar_publicaciones():
    try:
        with db_cursor(connection_factory=get_db_connection) as (conn, cursor):
            imagen_select = "p.imagen_url," if publicacion_tiene_imagen_url(cursor) else "NULL AS imagen_url,"

            sql = f"""
            SELECT
                p.id_publicacion,
                p.titulo,
                p.descripcion,
                p.cantidad_necesaria,
                p.cantidad_recibida,
                p.estado,
                p.fecha_publicacion,
                p.fecha_limite,
                {imagen_select}

                o.nombre AS organizacion,
                o.direccion AS direccion,

                c.nombre AS categoria

            FROM publicacion p
            INNER JOIN organizacion o
                ON p.id_organizacion = o.id_organizacion

            LEFT JOIN articulo a
                ON p.id_articulo = a.id_articulo

            LEFT JOIN categoria_articulo c
                ON a.id_categoria = c.id_categoria
            """

            cursor.execute(sql)
            publicaciones = cursor.fetchall()

            return jsonify(publicaciones)

    except Exception as e:
        print("ERROR EN JOIN:", e)  
        return jsonify({"error": str(e)}), 500



# Ruta para crear una nueva publicación
@publicacion_bp.route("/publicaciones", methods=["POST"])
@admin_required
def crear_publicacion():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No se enviaron datos"}), 400

        campos_requeridos = [
            "id_intermediario",
            "id_organizacion",
            "id_articulo",
            "titulo",
            "descripcion",
            "cantidad_necesaria",
            "fecha_publicacion",
            "fecha_limite",
            "estado"
        ]

        for campo in campos_requeridos:
            if data.get(campo) in [None, ""]:
                return jsonify({"error": f"Falta el campo obligatorio: {campo}"}), 400

        with db_cursor(dictionary=False, connection_factory=get_db_connection) as (conn, cursor):
            cursor.execute(
                """
                SELECT id_organizacion
                FROM organizacion
                WHERE id_organizacion = %s AND estado_verificacion = 'verificada'
                """,
                (data.get("id_organizacion"),)
            )
            if not cursor.fetchone():
                return jsonify({"error": "La organizacion seleccionada debe estar verificada"}), 400

            cursor.execute(
                """
                SELECT id_usuario
                FROM intermediario
                WHERE id_usuario = %s AND id_organizacion = %s
                """,
                (data.get("id_intermediario"), data.get("id_organizacion"))
            )
            if not cursor.fetchone():
                return jsonify({"error": "El intermediario no pertenece a la organizacion seleccionada"}), 400

            imagen_url = data.get("imagen_url") or None
            tiene_imagen_url = publicacion_tiene_imagen_url(cursor)

            columnas = """
                id_intermediario, id_organizacion, id_articulo,
                titulo, descripcion, cantidad_necesaria,
                cantidad_recibida, fecha_publicacion,
                fecha_limite, estado
            """
            placeholders = "%s, %s, %s, %s, %s, %s, 0, %s, %s, %s"
            valores = [
                data.get("id_intermediario"),
                data.get("id_organizacion"),
                data.get("id_articulo"),
                data.get("titulo"),
                data.get("descripcion"),
                data.get("cantidad_necesaria"),
                data.get("fecha_publicacion"),
                data.get("fecha_limite"),
                data.get("estado")
            ]

            if tiene_imagen_url:
                columnas += ", imagen_url"
                placeholders += ", %s"
                valores.append(imagen_url)

            sql = f"""
            INSERT INTO publicacion ({columnas})
            VALUES ({placeholders})
            """

            cursor.execute(sql, tuple(valores))
            conn.commit()

            return jsonify({"message": "Publicación creada"}), 201

    except Exception as e:
        return jsonify({
            "error": "Error al crear publicación",
            "detalle": str(e)
        }), 500


@publicacion_bp.route("/publicaciones/<int:id_publicacion>/estado", methods=["PUT"])
@admin_required
def actualizar_estado_publicacion(id_publicacion):
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No se enviaron datos"}), 400

        estado = (data.get("estado") or "").strip().lower()

        # Se amplía para soportar activa, finalizada y cancelada
        if estado not in ("activa", "finalizada", "cancelada"):
            return jsonify({"error": "Estado invalido. Usa activa, finalizada o cancelada"}), 400

        with db_cursor(connection_factory=get_db_connection) as (conn, cursor):
            cursor.execute(
                "SELECT id_publicacion FROM publicacion WHERE id_publicacion = %s",
                (id_publicacion,)
            )
            publicacion = cursor.fetchone()

            if not publicacion:
                return jsonify({"error": "Publicacion no encontrada"}), 404

            cursor.execute(
                """
                UPDATE publicacion
                SET estado = %s
                WHERE id_publicacion = %s
                """,
                (estado, id_publicacion)
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
        return jsonify({"error": "No se pudo actualizar el estado de la publicacion"}), 500


# Ruta para obtener una publicación por su ID (detalle)
@publicacion_bp.route("/publicaciones/<int:id>", methods=["GET"])
def obtener_publicacion(id):
    try:
        with db_cursor(connection_factory=get_db_connection) as (conn, cursor):
            imagen_select = "p.imagen_url," if publicacion_tiene_imagen_url(cursor) else "NULL AS imagen_url,"

            publicacion_sql = f"""
            SELECT
                p.id_publicacion,
                p.id_articulo,
                p.titulo,
                p.descripcion,
                p.cantidad_necesaria,
                p.cantidad_recibida,
                p.estado,
                {imagen_select}
                DATE_FORMAT(p.fecha_publicacion, '%Y-%m-%d') AS fecha_publicacion,
                DATE_FORMAT(p.fecha_limite, '%Y-%m-%d') AS fecha_limite,

                o.nombre AS organizacion,
                o.direccion,
                c.nombre AS categoria

            FROM publicacion p
            INNER JOIN organizacion o
                ON p.id_organizacion = o.id_organizacion

            LEFT JOIN articulo a
                ON p.id_articulo = a.id_articulo

            LEFT JOIN categoria_articulo c
                ON a.id_categoria = c.id_categoria

            WHERE p.id_publicacion = %s
            """

            cursor.execute(publicacion_sql, (id,))
            publicacion = cursor.fetchone()

            if not publicacion:
                return jsonify({"error": "Publicación no encontrada"}), 404

            articulos_sql = """
            SELECT
                a.nombre AS articulo,
                c.nombre AS categoria,
                COALESCE(pa.descripcion_detalle, a.descripcion) AS descripcion_detalle,
                pa.cantidad
            FROM publicacion_articulo pa
            INNER JOIN articulo a ON pa.id_articulo = a.id_articulo
            LEFT JOIN categoria_articulo c ON a.id_categoria = c.id_categoria
            WHERE pa.id_publicacion = %s
            ORDER BY a.nombre
            """
            try:
                cursor.execute(articulos_sql, (id,))
                articulos = cursor.fetchall()
            except Exception:
                logging.exception("Error querying publicacion_articulo for id %s", id)
                articulos = []

            if not articulos and publicacion.get("id_articulo"):
                cursor.execute(
                    """
                    SELECT
                        a.nombre AS articulo,
                        c.nombre AS categoria,
                        a.descripcion AS descripcion_detalle
                    FROM articulo a
                    LEFT JOIN categoria_articulo c ON a.id_categoria = c.id_categoria
                    WHERE a.id_articulo = %s
                    """,
                    (publicacion["id_articulo"],)
                )
                articulo_principal = cursor.fetchone()
                if articulo_principal:
                    articulos = [{
                        "articulo": articulo_principal["articulo"],
                        "categoria": articulo_principal.get("categoria"),
                        "descripcion_detalle": articulo_principal.get("descripcion_detalle") or publicacion["descripcion"],
                        "cantidad": publicacion["cantidad_necesaria"]
                    }]

            if not articulos:
                articulos = [{
                    "articulo": "Sin artículo definido",
                    "categoria": publicacion.get("categoria"),
                    "descripcion_detalle": publicacion["descripcion"],
                    "cantidad": publicacion["cantidad_necesaria"]
                }]

            resultados = []
            for articulo in articulos:
                fila = {
                    "id_publicacion": publicacion["id_publicacion"],
                    "titulo": publicacion["titulo"],
                    "descripcion": publicacion["descripcion"],
                    "cantidad_necesaria": publicacion["cantidad_necesaria"],
                    "cantidad_recibida": publicacion["cantidad_recibida"],
                    "estado": publicacion["estado"],
                    "imagen_url": publicacion.get("imagen_url"),
                    "fecha_publicacion": publicacion["fecha_publicacion"],
                    "fecha_limite": publicacion["fecha_limite"],
                    "organizacion": publicacion["organizacion"],
                    "direccion": publicacion["direccion"],
                    "categoria": articulo.get("categoria") or publicacion.get("categoria") or "Sin categoria",
                    "articulo": articulo.get("articulo") or "Sin artículo definido",
                    "descripcion_detalle": articulo.get("descripcion_detalle") or publicacion["descripcion"],
                    "cantidad": articulo.get("cantidad") or publicacion["cantidad_necesaria"]
                }
                resultados.append(fila)

            return jsonify(resultados), 200

    except Exception:
        return jsonify({
            "error": "Error al obtener la publicación"
        }), 500


