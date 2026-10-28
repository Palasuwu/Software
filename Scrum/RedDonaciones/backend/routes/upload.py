import os
import uuid
import logging
from io import BytesIO
from flask import Blueprint, request, jsonify, send_from_directory
from PIL import Image
from werkzeug.utils import safe_join
from auth_utils import token_required, _obtener_organizacion_actual_intermediario, _organizacion_verificada
from db.connection import db_cursor, get_db_connection
from services.archivo_service import nombre_upload_local, referencias_archivo, autorizar_archivo

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
    # token_required establece el rol actual del usuario desde la BD.
    if request.usuario_rol not in ("administrador", "intermediario"):
        return jsonify({"error": "No tienes permiso para subir imágenes"}), 403

    if request.usuario_rol == "intermediario":
        id_organizacion = _obtener_organizacion_actual_intermediario(request.usuario_id)
        if id_organizacion is None or not _organizacion_verificada(id_organizacion):
            return jsonify({"error": "La organización no está verificada"}), 403

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
    ruta = safe_join(UPLOAD_FOLDER, filename)
    if nombre_upload_local('/uploads/' + filename) != filename or not ruta or not os.path.isfile(ruta):
        return jsonify({"error": "Archivo no encontrado"}), 404
    try:
        with db_cursor(connection_factory=get_db_connection) as (_, cursor):
            error = autorizar_archivo(cursor, referencias_archivo(cursor, filename))
            if error:
                return error
    except Exception:
        logging.exception("Error al consultar un archivo local")
        return jsonify({"error": "No se pudo consultar el archivo"}), 500
    return send_from_directory(UPLOAD_FOLDER, filename)


@upload_bp.after_request
def cache_descarga(response):
    if request.endpoint == 'upload.serve_upload':
        response.headers['Cache-Control'] = 'private, no-store'
        response.vary.add('Authorization')
    return response
