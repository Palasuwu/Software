# Estas son las rutas para el manejo de usuarios 
# Permiten obtener la lista de usuarios y crear nuevos usuarios en la base de datos

# Importamos las librerías necesarias para crear un Blueprint de Flask, manejar solicitudes y conectarnos a la base de datos
from flask import Blueprint, jsonify
from flask import request
from db.connection import get_db_connection

# Se crea un Blueprint para las rutas de usuario
# Esto permite organizar las rutas relacionadas con los usuarios en un módulo separado
usuario_bp = Blueprint("usuario", __name__)

# Ruta para obtener la lista de usuarios
@usuario_bp.route("/usuarios", methods=["GET"])
def obtener_usuarios():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM usuario")
    data = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(data)

# Ruta para crear un nuevo usuario
@usuario_bp.route("/usuarios", methods=["POST"])
def crear_usuario():
    data = request.json

    nombre = data.get("nombre")
    correo = data.get("correo")
    password = data.get("password")
    telefono = data.get("telefono")
    rol = data.get("rol")

    try:
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
        return jsonify({"error": str(e)}), 500