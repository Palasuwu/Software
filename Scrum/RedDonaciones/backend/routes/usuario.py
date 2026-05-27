from flask import Blueprint, jsonify, request
import bcrypt
import mysql.connector
import re
import secrets
import string
from db.connection import get_db_connection
from auth_utils import generate_token, token_required, admin_required

usuario_bp = Blueprint("usuario", __name__)
EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
PHONE_REGEX = re.compile(r"^[0-9+\-()\s]{8,20}$")
NAME_REGEX = re.compile(r"^[A-Za-zÀ-ÿ' -]+$")


def limpiar_espacios(value):
    return re.sub(r"\s+", " ", (value or "").strip())


def telefono_valido(value):
    telefono = (value or "").strip()
    return bool(PHONE_REGEX.match(telefono)) and len(re.findall(r"\d", telefono)) >= 8


def validar_usuario_base(nombre, correo, telefono):
    errores = {}

    if len(nombre) < 3:
        errores["nombre"] = "El nombre debe tener al menos 3 caracteres"
    elif not NAME_REGEX.match(nombre):
        errores["nombre"] = "El nombre solo debe contener letras y espacios"

    if not EMAIL_REGEX.match(correo):
        errores["correo"] = "El correo debe ser valido"

    if not telefono_valido(telefono):
        errores["telefono"] = "El telefono debe ser valido"

    return errores


def validar_password_registro(password):
    if len(password) < 8:
        return "El password debe tener al menos 8 caracteres"
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return "El password debe incluir letras y numeros"
    return None


def usuario_autorizado_para_id(id_usuario):
    return request.usuario_rol == "administrador" or request.usuario_id == id_usuario


def validar_admin_para_registro():
    @admin_required
    def _validar():
        return None

    return _validar()

# Ruta para obtener la lista de usuarios
@usuario_bp.route("/usuarios", methods=["GET"])
@admin_required  # Solo administradores pueden listar usuarios
def obtener_usuarios():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # SELECT ESPECÍFICO que EXCLUYE password
        cursor.execute("""
            SELECT id_usuario, nombre, correo, telefono, rol, fecha_registro, activo 
            FROM usuario
        """)
        data = cursor.fetchall()

        return jsonify(data), 200

    except Exception as e:
        return jsonify({
            "error": "Error al obtener usuarios",
            "detalle": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@usuario_bp.route("/usuarios/<int:id_usuario>", methods=["GET"])
@token_required  # Protegido con token
def obtener_usuario_por_id(id_usuario):
    conn = None
    cursor = None

    if not usuario_autorizado_para_id(id_usuario):
        return jsonify({"error": "No autorizado para acceder a este usuario"}), 403

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
@token_required  # Protegido con token
def actualizar_usuario(id_usuario):
    conn = None
    cursor = None

    if not usuario_autorizado_para_id(id_usuario):
        return jsonify({"error": "No autorizado para actualizar este usuario"}), 403

    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No se enviaron datos"}), 400

        nombre = limpiar_espacios(data.get("nombre"))
        correo = (data.get("correo") or "").strip().lower()
        telefono = (data.get("telefono") or "").strip()

        errores_base = validar_usuario_base(nombre, correo, telefono)
        if errores_base:
            return jsonify({"error": "Datos invalidos", "campos": errores_base}), 400

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
            departamento = limpiar_espacios(data.get("departamento"))
            municipio = limpiar_espacios(data.get("municipio"))
            zona = (data.get("zona") or "").strip()
            direccion_detalle = limpiar_espacios(data.get("direccion_detalle"))

            if not departamento or not municipio or not zona or not direccion_detalle:
                conn.rollback()
                return jsonify({"error": "Faltan datos obligatorios para donante"}), 400
            if not zona.isdigit() or len(zona) > 2:
                conn.rollback()
                return jsonify({"error": "La zona debe ser un numero valido"}), 400
            if len(direccion_detalle) < 8:
                conn.rollback()
                return jsonify({"error": "La direccion debe ser mas especifica"}), 400

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
            cargo = limpiar_espacios(data.get("cargo"))

            if not id_organizacion or not cargo:
                conn.rollback()
                return jsonify({"error": "Faltan datos obligatorios para intermediario"}), 400
            if len(cargo) < 3:
                conn.rollback()
                return jsonify({"error": "El cargo debe tener al menos 3 caracteres"}), 400

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


@usuario_bp.route("/usuarios/<int:id_usuario>", methods=["DELETE"])
@admin_required
def eliminar_usuario(id_usuario):
    conn = None
    cursor = None

    if request.usuario_id == id_usuario:
        return jsonify({"error": "No puedes eliminar tu propio usuario administrador"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT id_usuario, rol FROM usuario WHERE id_usuario = %s",
            (id_usuario,)
        )
        usuario = cursor.fetchone()

        if not usuario:
            return jsonify({"error": "Usuario no encontrado"}), 404

        rol = usuario["rol"]

        if rol == "donante":
            cursor.execute(
                "SELECT COUNT(*) AS total FROM donacion WHERE id_donante = %s",
                (id_usuario,)
            )
            if cursor.fetchone()["total"] > 0:
                return jsonify({
                    "error": "No se puede eliminar el usuario porque tiene donaciones asociadas"
                }), 409

            cursor.execute("DELETE FROM donante WHERE id_usuario = %s", (id_usuario,))

        elif rol == "intermediario":
            cursor.execute(
                "SELECT COUNT(*) AS total FROM publicacion WHERE id_intermediario = %s",
                (id_intermediario,)
            )
            if cursor.fetchone()["total"] > 0:
                return jsonify({
                    "error": "No se puede eliminar el usuario porque tiene publicaciones asociadas"
                }), 409

            cursor.execute("DELETE FROM intermediario WHERE id_usuario = %s", (id_usuario,))

        cursor.execute("DELETE FROM usuario WHERE id_usuario = %s", (id_usuario,))
        conn.commit()

        return jsonify({"message": "Usuario eliminado"}), 200

    except mysql.connector.IntegrityError:
        if conn:
            conn.rollback()

        return jsonify({
            "error": "No se puede eliminar el usuario porque tiene informacion relacionada"
        }), 409
    except Exception:
        if conn:
            conn.rollback()

        return jsonify({"error": "No se pudo eliminar el usuario"}), 500
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

        nombre = limpiar_espacios(data.get("nombre"))
        correo = (data.get("correo") or "").strip().lower()
        password = data.get("password")
        telefono = (data.get("telefono") or "").strip()
        rol = data.get("rol")

        # El password ya no es estrictamente obligatorio en la entrada si se genera temporalmente
        if not nombre or not correo or not telefono or not rol:
            return jsonify({"error": "Faltan campos obligatorios"}), 400

        errores_base = validar_usuario_base(nombre, correo, telefono)
        if errores_base:
            return jsonify({"error": "Datos invalidos", "campos": errores_base}), 400

        rol = rol.strip().lower()
        if rol not in ("donante", "intermediario", "administrador"):
            return jsonify({"error": "Rol invalido para registro"}), 400

        if rol == "administrador":
            respuesta_admin = validar_admin_para_registro()
            if respuesta_admin:
                return respuesta_admin

        # Generar contraseña temporal si no se provee
        temp_password = None
        if not password:
            alphabet = string.ascii_letters + string.digits
            temp_password = (
                secrets.choice(string.ascii_letters)
                + secrets.choice(string.digits)
                + ''.join(secrets.choice(alphabet) for _ in range(10))
            )
            password = temp_password

        password_error = validar_password_registro(password)
        if password_error:
            return jsonify({"error": password_error}), 400

        departamento = limpiar_espacios(data.get("departamento"))
        municipio = limpiar_espacios(data.get("municipio"))
        zona = (data.get("zona") or "").strip()
        direccion_detalle = limpiar_espacios(data.get("direccion_detalle"))

        id_organizacion = data.get("id_organizacion")
        cargo = limpiar_espacios(data.get("cargo"))

        if rol == "donante":
            if not departamento or not municipio or not zona or not direccion_detalle:
                return jsonify({"error": "Faltan datos obligatorios para donante"}), 400
            if not zona.isdigit() or len(zona) > 2:
                return jsonify({"error": "La zona debe ser un numero valido"}), 400
            if len(direccion_detalle) < 8:
                return jsonify({"error": "La direccion debe ser mas especifica"}), 400

        if rol == "intermediario":
            if not id_organizacion or not cargo:
                return jsonify({"error": "Faltan datos obligatorios para intermediario"}), 400
            if len(cargo) < 3:
                return jsonify({"error": "El cargo debe tener al menos 3 caracteres"}), 400

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

        respuesta = {
            "message": "Usuario creado",
            "usuario": {
                "id_usuario": id_usuario,
                "nombre": nombre,
                "correo": correo,
                "rol": rol
            }
        }
        if temp_password:
            respuesta["password_temporal"] = temp_password

        return jsonify(respuesta), 201

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
    conn = None
    cursor = None
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
        SELECT id_usuario, nombre, correo, telefono, password, rol, activo
        FROM usuario
        WHERE correo = %s
        """
        cursor.execute(sql, (correo,))
        usuario = cursor.fetchone()

        if not usuario:
            return jsonify({"error": "Credenciales invalidas"}), 401

        if usuario.get("activo") == 0:
            return jsonify({"error": "Esta cuenta está desactivada. Por favor contacte al administrador."}), 403

        stored_password = usuario.get("password") or ""
        if not stored_password.startswith("$2"):
            return jsonify({"error": "Credenciales invalidas"}), 401

        is_valid_password = bcrypt.checkpw(
            password.encode("utf-8"),
            stored_password.encode("utf-8")
        )

        if not is_valid_password:
            return jsonify({"error": "Credenciales invalidas"}), 401

        # Datos extra para intermediario
        id_organizacion = None
        cargo = None

        if usuario["rol"] == "intermediario":
            cursor.execute(
                """
                SELECT id_organizacion, cargo
                FROM intermediario
                WHERE id_usuario = %s
                """,
                (usuario["id_usuario"],)
            )

            datos_intermediario = cursor.fetchone()

            if datos_intermediario:
                id_organizacion = datos_intermediario["id_organizacion"]
                cargo = datos_intermediario["cargo"]

        # JWT
        token = generate_token(
            usuario["id_usuario"],
            usuario["rol"],
            id_organizacion
        )

        return jsonify({
            "message": "Login exitoso",
            "token": token,
            "usuario": {
                "id_usuario": usuario["id_usuario"],
                "nombre": usuario["nombre"],
                "correo": usuario["correo"],
                "telefono": usuario["telefono"],
                "rol": usuario["rol"],
                "id_organizacion": id_organizacion,
                "cargo": cargo
            }
        }), 200

    except ValueError:
        return jsonify({"error": "Credenciales invalidas"}), 401

    except Exception as e:
        return jsonify({
            "error": "Error al iniciar sesion",
            "detalle": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()


@usuario_bp.route("/usuarios/<int:id_usuario>/desactivar", methods=["PUT"])
@admin_required
def desactivar_usuario(id_usuario):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id_usuario FROM usuario WHERE id_usuario = %s", (id_usuario,))
        usuario = cursor.fetchone()
        if not usuario:
            return jsonify({"error": "Usuario no encontrado"}), 404

        # Cambiar columna activo a 0
        cursor.execute("UPDATE usuario SET activo = 0 WHERE id_usuario = %s", (id_usuario,))
        conn.commit()

        return jsonify({"message": "Usuario desactivado correctamente"}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": "No se pudo desactivar el usuario", "detalle": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@usuario_bp.route("/usuarios/<int:id_usuario>/activar", methods=["PUT"])
@admin_required
def activar_usuario(id_usuario):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id_usuario FROM usuario WHERE id_usuario = %s", (id_usuario,))
        usuario = cursor.fetchone()
        if not usuario:
            return jsonify({"error": "Usuario no encontrado"}), 404

        # Cambiar columna activo a 1
        cursor.execute("UPDATE usuario SET activo = 1 WHERE id_usuario = %s", (id_usuario,))
        conn.commit()

        return jsonify({"message": "Usuario activado correctamente"}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": "No se pudo activar el usuario", "detalle": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@usuario_bp.route("/usuarios/<int:id_usuario>/anonimizar", methods=["PUT"])
@admin_required
def anonimizar_usuario(id_usuario):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id_usuario FROM usuario WHERE id_usuario = %s", (id_usuario,))
        usuario = cursor.fetchone()
        if not usuario:
            return jsonify({"error": "Usuario no encontrado"}), 404

        # Generar correo único anonimizado para cumplir con la restricción UNIQUE y GDPR
        correo_anonimo = f"anonimo_{id_usuario}@reddonaciones.local"
        telefono_anonimo = ""

        # Actualizar la fila en la tabla de usuario
        cursor.execute(
            """
            UPDATE usuario
            SET nombre = 'Usuario Anonimizado',
                correo = %s,
                telefono = %s,
                activo = 0
            WHERE id_usuario = %s
            """,
            (correo_anonimo, telefono_anonimo, id_usuario)
        )
        conn.commit()

        return jsonify({"message": "Usuario anonimizado correctamente"}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": "No se pudo anonimizar el usuario", "detalle": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
