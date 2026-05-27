from flask import Blueprint, jsonify, request
import mysql.connector

from db.connection import get_db_connection
from auth_utils import token_required

intermediario_bp = Blueprint("intermediario", __name__)



# Ruta para que el intermediario vea las publicaciones de su organización
@intermediario_bp.route("/intermediario/publicaciones", methods=["GET"])
@token_required
def obtener_publicaciones_intermediario():
    conn = None
    cursor = None

    try:
        # Validar rol
        if request.usuario_rol != "intermediario":
            return jsonify({
                "error": "Acceso denegado"
            }), 403

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

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

        cursor.execute(sql, (request.id_organizacion,))
        publicaciones = cursor.fetchall()

        return jsonify(publicaciones), 200

    except Exception as e:
        return jsonify({
            "error": "No se pudieron obtener las publicaciones",
            "detalle": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()


# Ruta para que el intermediario vea los usuarios de su organización
@intermediario_bp.route("/intermediario/usuarios", methods=["GET"])
@token_required
def obtener_intermediarios_organizacion():
    conn = None
    cursor = None

    try:
        if request.usuario_rol != "intermediario":
            return jsonify({
                "error": "Acceso denegado"
            }), 403

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

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

        cursor.execute(sql, (request.id_organizacion,))
        usuarios = cursor.fetchall()

        return jsonify(usuarios), 200

    except Exception as e:
        return jsonify({
            "error": "No se pudieron obtener los intermediarios",
            "detalle": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()


#  Permitir al intermediario cambiar el estado de una publicación (activa, finalizada, cancelada)
@intermediario_bp.route(
    "/intermediario/publicaciones/<int:id_publicacion>/estado",
    methods=["PUT"]
)
@token_required
def cambiar_estado_publicacion(id_publicacion):
    conn = None
    cursor = None

    try:
        if request.usuario_rol != "intermediario":
            return jsonify({
                "error": "Acceso denegado"
            }), 403

        data = request.get_json()
        estado = data.get("estado")

        if estado not in ("activa", "finalizada", "cancelada"):
            return jsonify({
                "error": "Estado invalido"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Validar ownership
        cursor.execute(
            """
            SELECT id_publicacion
            FROM publicacion
            WHERE id_publicacion = %s
            AND id_organizacion = %s
            """,
            (id_publicacion, request.id_organizacion)
        )

        publicacion = cursor.fetchone()

        if not publicacion:
            return jsonify({
                "error": "Publicacion no encontrada"
            }), 404

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
            "message": "Estado actualizado"
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()

        return jsonify({
            "error": "No se pudo actualizar el estado",
            "detalle": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()



# Para crear una post
@intermediario_bp.route("/intermediario/publicaciones", methods=["POST"])
@token_required
def crear_publicacion_intermediario():
    conn = None
    cursor = None

    try:
        if request.usuario_rol != "intermediario":
            return jsonify({
                "error": "Acceso denegado"
            }), 403

        data = request.get_json()

        titulo = (data.get("titulo") or "").strip()
        descripcion = (data.get("descripcion") or "").strip()
        cantidad_necesaria = data.get("cantidad_necesaria")
        fecha_publicacion = data.get("fecha_publicacion")
        fecha_limite = data.get("fecha_limite")
        estado = data.get("estado")
        id_articulo = data.get("id_articulo")
        imagen_url = data.get("imagen_url")

        if not titulo or not descripcion:
            return jsonify({
                "error": "Titulo y descripcion son obligatorios"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        sql = """
        INSERT INTO publicacion (
            id_intermediario,
            id_organizacion,
            id_articulo,
            titulo,
            descripcion,
            cantidad_necesaria,
            cantidad_recibida,
            fecha_publicacion,
            fecha_limite,
            estado,
            imagen_url
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """

        cursor.execute(sql, (
            request.usuario_id,
            request.id_organizacion,
            id_articulo,
            titulo,
            descripcion,
            cantidad_necesaria,
            0,
            fecha_publicacion,
            fecha_limite,
            estado,
            imagen_url
        ))

        conn.commit()

        return jsonify({
            "message": "Publicacion creada"
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()

        return jsonify({
            "error": "No se pudo crear la publicacion",
            "detalle": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()


# Para editar
@intermediario_bp.route(
    "/intermediario/publicaciones/<int:id_publicacion>",
    methods=["PUT"]
)
@token_required
def editar_publicacion_intermediario(id_publicacion):
    conn = None
    cursor = None

    try:
        if request.usuario_rol != "intermediario":
            return jsonify({
                "error": "Acceso denegado"
            }), 403

        data = request.get_json()

        titulo = (data.get("titulo") or "").strip()
        descripcion = (data.get("descripcion") or "").strip()
        cantidad_necesaria = data.get("cantidad_necesaria")
        fecha_publicacion = data.get("fecha_publicacion")
        fecha_limite = data.get("fecha_limite")
        estado = data.get("estado")
        id_articulo = data.get("id_articulo")
        imagen_url = data.get("imagen_url")

        if not titulo or not descripcion:
            return jsonify({
                "error": "Titulo y descripcion son obligatorios"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # VALIDAR ownership
        cursor.execute(
            """
            SELECT id_publicacion
            FROM publicacion
            WHERE id_publicacion = %s
            AND id_organizacion = %s
            """,
            (id_publicacion, request.id_organizacion)
        )

        publicacion = cursor.fetchone()

        if not publicacion:
            return jsonify({
                "error": "Publicacion no encontrada"
            }), 404

        sql = """
        UPDATE publicacion
        SET
            titulo = %s,
            descripcion = %s,
            cantidad_necesaria = %s,
            fecha_publicacion = %s,
            fecha_limite = %s,
            estado = %s,
            id_articulo = %s,
            imagen_url = %s
        WHERE id_publicacion = %s
        """

        cursor.execute(sql, (
            titulo,
            descripcion,
            cantidad_necesaria,
            fecha_publicacion,
            fecha_limite,
            estado,
            id_articulo,
            imagen_url,
            id_publicacion
        ))

        conn.commit()

        return jsonify({
            "message": "Publicacion actualizada"
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()

        return jsonify({
            "error": "No se pudo actualizar la publicacion",
            "detalle": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()          