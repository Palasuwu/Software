from flask import Blueprint, jsonify
from db.connection import get_db_connection

usuario_bp = Blueprint("usuario", __name__)

@usuario_bp.route("/usuarios", methods=["GET"])
def obtener_usuarios():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM usuario")
    data = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(data)