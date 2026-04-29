from flask import Blueprint, jsonify, request
import bcrypt
import mysql.connector
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


@usuario_bp.route("/usuarios/<int:id_usuario>", methods=["GET"])
def obtener_usuario_por_id(id_usuario):
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id_usuario, nombre, correo, telefono, rol, fecha_registro
            FROM usuario
            WHERE id_usuario = %s
            """,
            (id_usuario,)
        )
        usuario = cursor.fetchone()

        if not usuario:
            return jsonify({"error": "Usuario no encontrado"}), 404

        if usuario["rol"] == "donante":
            cursor.execute(
                """
                SELECT departamento, municipio, zona, direccion_detalle
                FROM donante
                WHERE id_usuario = %s
                """,
                (id_usuario,)
            )
            usuario["perfil"] = cursor.fetchone() or {}
        elif usuario["rol"] == "intermediario":
            cursor.execute(
                """
                SELECT i.id_organizacion, i.cargo, o.nombre AS organizacion_nombre
                FROM intermediario i
                INNER JOIN organizacion o ON o.id_organizacion = i.id_organizacion
                WHERE i.id_usuario = %s
                """,
                (id_usuario,)
            )
            usuario["perfil"] = cursor.fetchone() or {}
        else:
            usuario["perfil"] = {}

        return jsonify(usuario), 200

    except Exception:
        return jsonify({"error": "Error al obtener perfil de usuario"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@usuario_bp.route("/usuarios/<int:id_usuario>", methods=["PUT"])
def actualizar_usuario(id_usuario):
    conn = None
    cursor = None

    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No se enviaron datos"}), 400

        nombre = (data.get("nombre") or "").strip()
        correo = (data.get("correo") or "").strip().lower()
        telefono = (data.get("telefono") or "").strip()

        if not nombre or not correo or not telefono:
            return jsonify({"error": "Nombre, correo y telefono son obligatorios"}), 400

        if len(nombre) < 3:
            return jsonify({"error": "El nombre debe tener al menos 3 caracteres"}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT id_usuario, rol FROM usuario WHERE id_usuario = %s",
            (id_usuario,)
        )
        usuario_actual = cursor.fetchone()

        if not usuario_actual:
            return jsonify({"error": "Usuario no encontrado"}), 404

        rol = usuario_actual["rol"]

        cursor.execute(
            """
            UPDATE usuario
            SET nombre = %s, correo = %s, telefono = %s
            WHERE id_usuario = %s
            """,
            (nombre, correo, telefono, id_usuario)
        )

        if rol == "donante":
            departamento = (data.get("departamento") or "").strip()
            municipio = (data.get("municipio") or "").strip()
            zona = (data.get("zona") or "").strip()
            direccion_detalle = (data.get("direccion_detalle") or "").strip()

            if not departamento or not municipio or not zona or not direccion_detalle:
                conn.rollback()
                return jsonify({"error": "Faltan datos obligatorios para donante"}), 400

            cursor.execute(
                """
                UPDATE donante
                SET departamento = %s,
                    municipio = %s,
                    zona = %s,
                    direccion_detalle = %s
                WHERE id_usuario = %s
                """,
                (departamento, municipio, zona, direccion_detalle, id_usuario)
            )

        elif rol == "intermediario":
            id_organizacion = data.get("id_organizacion")
            cargo = (data.get("cargo") or "").strip()

            if not id_organizacion or not cargo:
                conn.rollback()
                return jsonify({"error": "Faltan datos obligatorios para intermediario"}), 400

            try:
                id_organizacion = int(id_organizacion)
            except (TypeError, ValueError):
                conn.rollback()
                return jsonify({"error": "id_organizacion debe ser un entero valido"}), 400

            cursor.execute(
                "SELECT id_organizacion FROM organizacion WHERE id_organizacion = %s",
                (id_organizacion,)
            )
            organizacion = cursor.fetchone()
            if not organizacion:
                conn.rollback()
                return jsonify({"error": "La organizacion seleccionada no existe"}), 400

            cursor.execute(
                """
                UPDATE intermediario
                SET id_organizacion = %s, cargo = %s
                WHERE id_usuario = %s
                """,
                (id_organizacion, cargo, id_usuario)
            )

        conn.commit()

        cursor.execute(
            """
            SELECT id_usuario, nombre, correo, telefono, rol, fecha_registro
            FROM usuario
            WHERE id_usuario = %s
            """,
            (id_usuario,)
        )
        usuario = cursor.fetchone()

        if usuario["rol"] == "donante":
            cursor.execute(
                """
                SELECT departamento, municipio, zona, direccion_detalle
                FROM donante
                WHERE id_usuario = %s
                """,
                (id_usuario,)
            )
            usuario["perfil"] = cursor.fetchone() or {}
        elif usuario["rol"] == "intermediario":
            cursor.execute(
                """
                SELECT i.id_organizacion, i.cargo, o.nombre AS organizacion_nombre
                FROM intermediario i
                INNER JOIN organizacion o ON o.id_organizacion = i.id_organizacion
                WHERE i.id_usuario = %s
                """,
                (id_usuario,)
            )
            usuario["perfil"] = cursor.fetchone() or {}
        else:
            usuario["perfil"] = {}

        return jsonify({
            "message": "Usuario actualizado",
            "usuario": usuario
        }), 200

    except mysql.connector.IntegrityError as e:
        if conn:
            conn.rollback()

        error_message = str(e).lower()
        if "correo" in error_message:
            return jsonify({"error": "El correo ya esta registrado"}), 409

        return jsonify({"error": "No se pudo actualizar el usuario"}), 400
    except Exception:
        if conn:
            conn.rollback()

        return jsonify({"error": "No se pudo actualizar el usuario"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Ruta para crear un nuevo usuario
@usuario_bp.route("/usuarios", methods=["POST"])
def crear_usuario():
    conn = None
    cursor = None

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

        rol = rol.strip().lower()
        if rol not in ("donante", "intermediario"):
            return jsonify({"error": "Rol invalido para registro"}), 400

        if len(password) < 8:
            return jsonify({"error": "El password debe tener al menos 8 caracteres"}), 400

        departamento = data.get("departamento")
        municipio = data.get("municipio")
        zona = data.get("zona")
        direccion_detalle = data.get("direccion_detalle")

        id_organizacion = data.get("id_organizacion")
        cargo = data.get("cargo")

        if rol == "donante":
            if not departamento or not municipio or not zona or not direccion_detalle:
                return jsonify({"error": "Faltan datos obligatorios para donante"}), 400

        if rol == "intermediario":
            if not id_organizacion or not cargo:
                return jsonify({"error": "Faltan datos obligatorios para intermediario"}), 400

            try:
                id_organizacion = int(id_organizacion)
            except (TypeError, ValueError):
                return jsonify({"error": "id_organizacion debe ser un entero valido"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        sql = """
        INSERT INTO usuario (nombre, correo, password, telefono, rol)
        VALUES (%s, %s, %s, %s, %s)
        """

        cursor.execute(sql, (nombre, correo, hashed_password, telefono, rol))
        id_usuario = cursor.lastrowid

        if rol == "donante":
            sql_donante = """
            INSERT INTO donante (id_usuario, departamento, municipio, zona, direccion_detalle)
            VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(sql_donante, (
                id_usuario,
                departamento,
                municipio,
                zona,
                direccion_detalle
            ))

        if rol == "intermediario":
            cursor.execute(
                "SELECT id_organizacion FROM organizacion WHERE id_organizacion = %s",
                (id_organizacion,)
            )
            organizacion = cursor.fetchone()
            if not organizacion:
                conn.rollback()
                return jsonify({"error": "La organizacion seleccionada no existe"}), 400

            sql_intermediario = """
            INSERT INTO intermediario (id_usuario, id_organizacion, cargo)
            VALUES (%s, %s, %s)
            """
            cursor.execute(sql_intermediario, (id_usuario, id_organizacion, cargo))

        conn.commit()

        return jsonify({
            "message": "Usuario creado",
            "usuario": {
                "id_usuario": id_usuario,
                "nombre": nombre,
                "correo": correo,
                "rol": rol
            }
        }), 201

    except mysql.connector.IntegrityError as e:
        if conn:
            conn.rollback()

        error_message = str(e).lower()
        if "correo" in error_message:
            return jsonify({"error": "El correo ya esta registrado"}), 409

        return jsonify({"error": "No se pudo completar el registro"}), 400

    except Exception as e:
        if conn:
            conn.rollback()

        return jsonify({"error": "No se pudo crear el usuario"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


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
        SELECT id_usuario, nombre, correo, telefono, password, rol
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
                "telefono": usuario["telefono"],
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
