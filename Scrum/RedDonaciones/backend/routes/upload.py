import os
import uuid
from io import BytesIO
from flask import Blueprint, request, jsonify, send_from_directory
from PIL import Image
from auth_utils import token_required

upload_bp = Blueprint("upload", __name__)

UPLOAD_FOLDER = "/app/uploads"
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
MAX_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_WIDTH = 800
MAX_HEIGHT = 600
JPEG_QUALITY = 80

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@upload_bp.route("/upload", methods=["POST"])
@token_required
def upload_imagen():
    if "file" not in request.files:
        return jsonify({"error": "No se envió ningún archivo"}), 400

    f = request.files["file"]
    if not f.filename:
        return jsonify({"error": "El archivo no tiene nombre"}), 400

    ext = f.filename.rsplit(".", 1)[-1].lower() if "." in f.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": "Tipo de archivo no permitido. Solo jpg, png, gif, webp"}), 400

    f.seek(0, 2)
    size = f.tell()
    f.seek(0)
    if size > MAX_BYTES:
        return jsonify({"error": "El archivo supera el límite de 5 MB"}), 400

    try:
        img = Image.open(f)
        img.thumbnail((MAX_WIDTH, MAX_HEIGHT), Image.LANCZOS)
        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")
        filename = f"{uuid.uuid4().hex}.jpg"
        img.save(os.path.join(UPLOAD_FOLDER, filename), "JPEG", quality=JPEG_QUALITY, optimize=True)
    except Exception:
        return jsonify({"error": "No se pudo procesar la imagen"}), 400

    return jsonify({"url": f"/api/uploads/{filename}"}), 201


@upload_bp.route("/uploads/<path:filename>", methods=["GET"])
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)
