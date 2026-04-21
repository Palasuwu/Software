# Rutas relacionadas con organizaciones
from flask import Blueprint, request, jsonify
from db.connection import get_db_connection


organizacion_bp = Blueprint("organizacion", __name__)

# Ruta para obtener la lista de organizaciones
@organizacion_bp.route("/organizaciones", methods=["GET"])
def listar_organizaciones():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = "SELECT id_organizacion, nombre, direccion FROM organizacion"
        cursor.execute(sql)
        organizaciones = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(organizaciones)

    except Exception as e:
        print("ERROR AL OBTENER ORGANIZACIONES:", e)  
        return jsonify({"error": str(e)}), 500
    

# Ruta para crear una nueva organización
@organizacion_bp.route("/organizaciones", methods=["POST"])
def crear_organizacion():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "Datos de organización no proporcionados"}), 400

        nombre = data.get("nombre")
        direccion = data.get("direccion")

        if not nombre or not direccion:
            return jsonify({"error": "Nombre y dirección son requeridos"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        sql = "INSERT INTO organizacion (nombre, direccion) VALUES (%s, %s)"
        cursor.execute(sql, (nombre, direccion))
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"message": "Organización creada exitosamente"}), 201

    except Exception as e:
        print("ERROR AL CREAR ORGANIZACIÓN:", e)  
        return jsonify({"error": str(e)}), 500
    
# Ruta para obtener detalles de una organización por ID
@organizacion_bp.route("/organizaciones/<int:id_organizacion>", methods=["GET"])
def obtener_organizacion(id_organizacion):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = "SELECT id_organizacion, nombre, direccion FROM organizacion WHERE id_organizacion = %s"
        cursor.execute(sql, (id_organizacion,))
        organizacion = cursor.fetchone()

        cursor.close()
        conn.close()

        if organizacion:
            return jsonify(organizacion)
        else:
            return jsonify({"error": "Organización no encontrada"}), 404

    except Exception as e:
        print("ERROR AL OBTENER ORGANIZACIÓN:", e)  
        return jsonify({"error": str(e)}), 500
    
