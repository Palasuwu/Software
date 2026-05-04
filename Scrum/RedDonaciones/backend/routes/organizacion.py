# Rutas relacionadas con organizaciones
from flask import Blueprint, request, jsonify
from db.connection import get_db_connection
# Para manejo de errores y logging
import logging

# Configuración básica de logging
logging.basicConfig(level=logging.INFO)

organizacion_bp = Blueprint("organizacion", __name__)


# Para listar todas las organizaciones (con información básica)
@organizacion_bp.route("/organizaciones", methods=["GET"])
def listar_organizaciones():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
        SELECT 
            id_organizacion,
            nombre,
            estado_verificacion
        FROM organizacion
        ORDER BY nombre
        """

        cursor.execute(sql)
        organizaciones = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(organizaciones), 200

    except Exception as e:
        logging.exception("Error al listar organizaciones")
        return jsonify({"error": "Error al obtener organizaciones"}), 500


