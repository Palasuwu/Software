from flask import Flask, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return jsonify({"message": "Backend funcionando "})

@app.route("/hello")
def hello():
    return jsonify({
        "message": "Hola desde el backend Flask!",
        "status": "ok"
    })

@app.route("/data")
def data():
    db_host = os.getenv("DB_HOST")
    if not db_host:
        return jsonify({"message": "No hay configuración de base de datos, esta es una prueba de backend."})

    try:
        import mysql.connector
        conn = mysql.connector.connect(
            host=db_host,
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME")
        )
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchall()
        conn.close()
        return jsonify(result)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)