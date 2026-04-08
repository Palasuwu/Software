# Rutas para la gestión de publicaciones
# Permiten obtener la lista de publicaciones y crear nuevas publicaciones en la base de datos

from flask import Blueprint, request, jsonify
from db.connection import get_db_connection

publicacion_bp = Blueprint("publicacion", __name__)

#Ruta para obtener la lista de publicaciones
@publicacion_bp.route("/publicaciones", methods=["GET"])
def listar_publicaciones():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM publicacion")
        publicaciones = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(publicaciones)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Ruta para crear una nueva publicación
@publicacion_bp.route("/publicaciones", methods=["POST"])
def crear_publicacion():
    data = request.json

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        sql = """
        INSERT INTO publicacion (
            id_intermediario, id_organizacion, id_articulo,
            titulo, descripcion, cantidad_necesaria,
            cantidad_recibida, fecha_publicacion,
            fecha_limite, estado
        )
        VALUES (%s, %s, %s, %s, %s, %s, 0, %s, %s, %s)
        """

        cursor.execute(sql, (
            data.get("id_intermediario"),
            data.get("id_organizacion"),
            data.get("id_articulo"),
            data.get("titulo"),
            data.get("descripcion"),
            data.get("cantidad_necesaria"),
            data.get("fecha_publicacion"),
            data.get("fecha_limite"),
            data.get("estado")
        ))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"message": "Publicación creada"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

# Ruta para obtener una publicación por su ID
@publicacion_bp.route("/publicaciones/<int:id>", methods=["GET"])
def obtener_publicacion(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM publicacion WHERE id_publicacion = %s", (id,))
        publicacion = cursor.fetchone()

        cursor.close()
        conn.close()

        if publicacion:
            return jsonify(publicacion)
        else:
            return jsonify({"message": "Publicación no encontrada"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Ruta para obtener donaciones (filtro opcional por donante)
@publicacion_bp.route("/donaciones", methods=["GET"])
def listar_donaciones():
    id_donante = request.args.get("id_donante")

    if id_donante is not None:
        try:
            id_donante = int(id_donante)
        except ValueError:
            return jsonify({"error": "id_donante debe ser un entero"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
        SELECT
            d.id_donacion,
            d.id_donante,
            d.id_publicacion,
            d.descripcion,
            DATE_FORMAT(d.fecha_donacion, '%Y-%m-%d') AS fecha_donacion,
            p.titulo AS publicacion_titulo,
            p.estado AS publicacion_estado,
            p.cantidad_necesaria,
            p.cantidad_recibida,
            DATE_FORMAT(p.fecha_limite, '%Y-%m-%d') AS fecha_limite
        FROM donacion d
        JOIN publicacion p ON p.id_publicacion = d.id_publicacion
        WHERE (%s IS NULL OR d.id_donante = %s)
        ORDER BY d.fecha_donacion DESC, d.id_donacion DESC
        LIMIT 50
        """

        cursor.execute(sql, (id_donante, id_donante))
        donaciones = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(donaciones)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# Ruta para obtener donaciones (filtro opcional por donante)
@publicacion_bp.route("/donaciones", methods=["GET"])
def listar_donaciones():
    id_donante = request.args.get("id_donante")

    if id_donante is not None:
        try:
            id_donante = int(id_donante)
        except ValueError:
            return jsonify({"error": "id_donante debe ser un entero"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
        SELECT
            d.id_donacion,
            d.id_donante,
            d.id_publicacion,
            d.descripcion,
            DATE_FORMAT(d.fecha_donacion, '%Y-%m-%d') AS fecha_donacion,
            p.titulo AS publicacion_titulo,
            p.estado AS publicacion_estado,
            p.cantidad_necesaria,
            p.cantidad_recibida,
            DATE_FORMAT(p.fecha_limite, '%Y-%m-%d') AS fecha_limite
        FROM donacion d
        JOIN publicacion p ON p.id_publicacion = d.id_publicacion
        WHERE (%s IS NULL OR d.id_donante = %s)
        ORDER BY d.fecha_donacion DESC, d.id_donacion DESC
        LIMIT 50
        """

        cursor.execute(sql, (id_donante, id_donante))
        donaciones = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(donaciones)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# Ruta para registrar una donación
@publicacion_bp.route("/donaciones", methods=["POST"])
def crear_donacion():
    data = request.json

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        sql = """
        INSERT INTO donacion (
            id_donante, id_publicacion, descripcion, fecha_donacion
        )
        VALUES (%s, %s, %s, %s)
        """

        cursor.execute(sql, (
            data.get("id_donante"),
            data.get("id_publicacion"),
            data.get("descripcion"),
            data.get("fecha_donacion")
        ))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"message": "Donación registrada"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500