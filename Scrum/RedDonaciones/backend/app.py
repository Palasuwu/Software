from flask import Flask, jsonify
from flask_cors import CORS
import os
import mysql.connector

app = Flask(__name__)
CORS(app)


# DB CONNECTION

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )


# ROUTES

@app.route("/")
def home():
    return jsonify({"message": "Backend funcionando"})

@app.route("/hello")
def hello():
    return jsonify({
        "message": "Hola desde el backend Flask!",
        "status": "ok"
    })

@app.route("/data")
def data():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SHOW TABLES;")
        tables = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "status": "success",
            "tables": tables
        })

    except Exception as exc:
        return jsonify({
            "status": "error",
            "message": str(exc)
        }), 500


# RUN

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)