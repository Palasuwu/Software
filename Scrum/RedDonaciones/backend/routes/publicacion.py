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