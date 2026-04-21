from flask import Blueprint, jsonify, request
import bcrypt
from db.connection import get_db_connection
from auth import generate_token, revoke_token, token_required
from validators import validar_correo, validar_password

usuario_bp = Blueprint("usuario", __name__)


# Ruta para obtener la lista de usuarios
@usuario_bp.route("/usuarios", methods=["GET"])
def obtener_usuarios():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT id_usuario, nombre, correo, telefono, rol, fecha_registro FROM usuario"
        )
        data = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(data), 200

    except Exception as e:
        return jsonify({
            "error": "Error al obtener usuarios",
            "detalle": str(e)
        }), 500


# Ruta para crear un nuevo usuario (registro)
@usuario_bp.route("/usuarios", methods=["POST"])
def crear_usuario():
    try:
        data = request.get_json(silent=True)

        if not data:
            return jsonify({"error": "No se enviaron datos"}), 400

        nombre = (data.get("nombre") or "").strip()
        correo = (data.get("correo") or "").strip().lower()
        password = data.get("password") or ""
        telefono = (data.get("telefono") or "").strip()
        rol = (data.get("rol") or "donante").strip().lower()

        if not nombre or not correo or not password or not telefono:
            return jsonify({"error": "Faltan campos obligatorios"}), 400

        if rol not in {"donante", "intermediario", "administrador"}:
            return jsonify({"error": "Rol invalido"}), 400

        error_correo = validar_correo(correo)
        if error_correo:
            return jsonify({"error": error_correo}), 400

        error_password = validar_password(password)
        if error_password:
            return jsonify({"error": error_password}), 400

        hashed_password = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT id_usuario FROM usuario WHERE correo = %s OR telefono = %s",
            (correo, telefono),
        )
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"error": "El correo o el telefono ya estan registrados"}), 409

        sql = """
        INSERT INTO usuario (nombre, correo, password, telefono, rol)
        VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(sql, (nombre, correo, hashed_password, telefono, rol))
        conn.commit()

        nuevo_id = cursor.lastrowid
        cursor.close()
        conn.close()

        usuario_info = {
            "id_usuario": nuevo_id,
            "nombre": nombre,
            "correo": correo,
            "rol": rol,
        }
        token = generate_token(usuario_info)

        return jsonify({
            "message": "Usuario creado",
            "usuario": usuario_info,
            "token": token,
        }), 201

    except Exception as e:
        return jsonify({
            "error": "Error al crear usuario",
            "detalle": str(e)
        }), 500


# Ruta para iniciar sesion
@usuario_bp.route("/login", methods=["POST"])
def login_usuario():
    try:
        data = request.get_json(silent=True)

        if not data:
            return jsonify({"error": "No se enviaron datos"}), 400

        correo = (data.get("correo") or "").strip().lower()
        password = data.get("password") or ""

        if not correo or not password:
            return jsonify({"error": "Correo y password son obligatorios"}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id_usuario, nombre, correo, password, rol
            FROM usuario
            WHERE correo = %s
            """,
            (correo,),
        )
        usuario = cursor.fetchone()

        cursor.close()
        conn.close()

        if not usuario:
            return jsonify({"error": "Credenciales invalidas"}), 401

        stored_password = usuario.get("password") or ""
        # Solo aceptamos passwords hasheados con bcrypt; rechazamos passwords en texto plano.
        if not stored_password.startswith("$2"):
            return jsonify({"error": "Credenciales invalidas"}), 401

        is_valid_password = bcrypt.checkpw(
            password.encode("utf-8"),
            stored_password.encode("utf-8"),
        )
        if not is_valid_password:
            return jsonify({"error": "Credenciales invalidas"}), 401

        usuario_info = {
            "id_usuario": usuario["id_usuario"],
            "nombre": usuario["nombre"],
            "correo": usuario["correo"],
            "rol": usuario["rol"],
        }
        token = generate_token(usuario_info)

        return jsonify({
            "message": "Login exitoso",
            "usuario": usuario_info,
            "token": token,
        }), 200

    except ValueError:
        return jsonify({"error": "Credenciales invalidas"}), 401
    except Exception as e:
        return jsonify({
            "error": "Error al iniciar sesion",
            "detalle": str(e)
        }), 500


# Ruta para cerrar sesion (revoca el token actual)
@usuario_bp.route("/logout", methods=["POST"])
@token_required
def logout_usuario():
    revoke_token(request.token)
    return jsonify({"message": "Sesion cerrada"}), 200


# Informacion del usuario autenticado, util para validar sesion en el cliente
@usuario_bp.route("/me", methods=["GET"])
@token_required
def usuario_actual():
    return jsonify({"usuario": request.user}), 200
