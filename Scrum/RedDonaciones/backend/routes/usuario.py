from flask import Blueprint, jsonify, request
from db.connection import get_db_connection

usuario_bp = Blueprint("usuario", __name__)

# Ruta para obtener la lista de usuarios
@usuario_bp.route("/usuarios", methods=["GET"])
def obtener_usuarios():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM usuario")
        data = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(data), 200

    except Exception as e:
        return jsonify({
            "error": "Error al obtener usuarios",
            "detalle": str(e)
        }), 500


# Ruta para crear un nuevo usuario
@usuario_bp.route("/usuarios", methods=["POST"])
def crear_usuario():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No se enviaron datos"}), 400

        nombre = data.get("nombre")
        correo = data.get("correo")
        password = data.get("password")
        telefono = data.get("telefono")
        rol = data.get("rol")

        if not nombre or not correo or not password or not telefono or not rol:
            return jsonify({"error": "Faltan campos obligatorios"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        sql = """
        INSERT INTO usuario (nombre, correo, password, telefono, rol)
        VALUES (%s, %s, %s, %s, %s)
        """

        cursor.execute(sql, (nombre, correo, password, telefono, rol))
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"message": "Usuario creado"}), 201

    except Exception as e:
        return jsonify({
            "error": "Error al crear usuario",
            "detalle": str(e)
        }), 500