from flask import Flask
from flask_cors import CORS

from routes.usuario import usuario_bp

app = Flask(__name__)
CORS(app)

# Registrar rutas
app.register_blueprint(usuario_bp)

@app.route("/")
def home():
    return {"message": "Backend funcionando"}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)