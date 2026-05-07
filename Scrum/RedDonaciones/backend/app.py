from flask import Flask, jsonify
from flask_cors import CORS
import os

from routes.usuario import usuario_bp
from routes.organizacion import organizacion_bp
from routes.publicacion import publicacion_bp

app = Flask(__name__)
CORS(app)

# Cargar variables de entorno
# El SECRET_KEY será usado por auth_utils
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY")
if not app.config['JWT_SECRET_KEY']:
    raise ValueError("JWT_SECRET_KEY es obligatoria y no puede estar vacía")

# Registrar rutas
app.register_blueprint(usuario_bp)
app.register_blueprint(organizacion_bp)
app.register_blueprint(publicacion_bp)

@app.route("/")
def home():
    return {"message": "Backend funcionando"}, 200

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Ruta no encontrada"}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Método no permitido"}), 405

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Error interno del servidor"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)