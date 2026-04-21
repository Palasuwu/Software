from flask import Blueprint, jsonify, request
import bcrypt
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

        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        sql = """
        INSERT INTO usuario (nombre, correo, password, telefono, rol)
        VALUES (%s, %s, %s, %s, %s)
        """

        cursor.execute(sql, (nombre, correo, hashed_password, telefono, rol))
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"message": "Usuario creado"}), 201

    except Exception as e:
        return jsonify({
            "error": "Error al crear usuario",
            "detalle": str(e)
        }), 500


# Ruta para iniciar sesión
@usuario_bp.route("/login", methods=["POST"])
def login_usuario():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No se enviaron datos"}), 400

        correo = data.get("correo")
        password = data.get("password")

        if not correo or not password:
            return jsonify({"error": "Correo y password son obligatorios"}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
        SELECT id_usuario, nombre, correo, password, rol
        FROM usuario
        WHERE correo = %s
        """
        cursor.execute(sql, (correo,))
        usuario = cursor.fetchone()

        cursor.close()
        conn.close()

        if not usuario:
            return jsonify({"error": "Credenciales invalidas"}), 401

        stored_password = usuario.get("password") or ""
        if not stored_password.startswith("$2"):
            return jsonify({"error": "Credenciales invalidas"}), 401

        is_valid_password = bcrypt.checkpw(
            password.encode("utf-8"),
            stored_password.encode("utf-8")
        )
        if not is_valid_password:
            return jsonify({"error": "Credenciales invalidas"}), 401

        return jsonify({
            "message": "Login exitoso",
            "usuario": {
                "id_usuario": usuario["id_usuario"],
                "nombre": usuario["nombre"],
                "correo": usuario["correo"],
                "rol": usuario["rol"]
            }
        }), 200

    except ValueError:
        return jsonify({"error": "Credenciales invalidas"}), 401
    except Exception as e:
        return jsonify({
            "error": "Error al iniciar sesion",
            "detalle": str(e)
        }), 500