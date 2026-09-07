# Rutas para las imagenes del carrusel de la landing page publica
import logging

from flask import Blueprint, jsonify, request

from db.connection import get_db_connection, db_cursor
from auth_utils import admin_required

logging.basicConfig(level=logging.INFO)

landing_bp = Blueprint("landing", __name__)


def normalizar_carrusel_payload(data):
    url_imagen = (data.get("url_imagen") or "").strip()
    alt_text = (data.get("alt_text") or "").strip()

    try:
        orden = int(data.get("orden"))
    except (TypeError, ValueError):
        orden = 0

    errores = {}
    if not url_imagen:
        errores["url_imagen"] = "La imagen es obligatoria"
    elif len(url_imagen) > 500:
        errores["url_imagen"] = "La URL de la imagen no puede exceder 500 caracteres"
    if not alt_text:
        errores["alt_text"] = "El texto alternativo es obligatorio"
    elif len(alt_text) > 255:
        errores["alt_text"] = "El texto alternativo no puede exceder 255 caracteres"

    return {
        "url_imagen": url_imagen,
        "alt_text": alt_text,
        "orden": orden,
    }, errores


def obtener_imagen_carrusel(cursor, id_imagen):
    cursor.execute(
        "SELECT id_imagen, url_imagen, alt_text, orden FROM landing_carousel WHERE id_imagen = %s",
        (id_imagen,),
    )
    return cursor.fetchone()


@landing_bp.route("/carrusel", methods=["GET"])
def listar_carrusel():
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute(
                "SELECT id_imagen, url_imagen, alt_text, orden FROM landing_carousel ORDER BY orden ASC, id_imagen ASC"
            )
            return jsonify(cursor.fetchall()), 200
    except Exception:
        logging.exception("Error al listar imagenes del carrusel")
        return jsonify({"error": "Error al obtener el carrusel"}), 500


@landing_bp.route("/carrusel", methods=["POST"])
@admin_required
def crear_imagen_carrusel():
    conn = None
    cursor = None

    try:
        payload, errores = normalizar_carrusel_payload(request.get_json() or {})
        if errores:
            return jsonify({"error": "Datos invalidos", "campos": errores}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "INSERT INTO landing_carousel (url_imagen, alt_text, orden) VALUES (%s, %s, %s)",
            (payload["url_imagen"], payload["alt_text"], payload["orden"]),
        )
        id_imagen = cursor.lastrowid
        conn.commit()

        return jsonify({
            "message": "Imagen agregada al carrusel",
            "imagen": obtener_imagen_carrusel(cursor, id_imagen),
        }), 201

    except Exception:
        if conn:
            conn.rollback()
        logging.exception("Error al crear imagen del carrusel")
        return jsonify({"error": "No se pudo agregar la imagen"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@landing_bp.route("/carrusel/<int:id_imagen>", methods=["PUT"])
@admin_required
def actualizar_imagen_carrusel(id_imagen):
    conn = None
    cursor = None

    try:
        payload, errores = normalizar_carrusel_payload(request.get_json() or {})
        if errores:
            return jsonify({"error": "Datos invalidos", "campos": errores}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if not obtener_imagen_carrusel(cursor, id_imagen):
            return jsonify({"error": "Imagen no encontrada"}), 404

        cursor.execute(
            "UPDATE landing_carousel SET url_imagen = %s, alt_text = %s, orden = %s WHERE id_imagen = %s",
            (payload["url_imagen"], payload["alt_text"], payload["orden"], id_imagen),
        )
        conn.commit()

        return jsonify({
            "message": "Imagen actualizada",
            "imagen": obtener_imagen_carrusel(cursor, id_imagen),
        }), 200

    except Exception:
        if conn:
            conn.rollback()
        logging.exception("Error al actualizar imagen del carrusel")
        return jsonify({"error": "No se pudo actualizar la imagen"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@landing_bp.route("/carrusel/<int:id_imagen>", methods=["DELETE"])
@admin_required
def eliminar_imagen_carrusel(id_imagen):
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if not obtener_imagen_carrusel(cursor, id_imagen):
            return jsonify({"error": "Imagen no encontrada"}), 404

        cursor.execute("DELETE FROM landing_carousel WHERE id_imagen = %s", (id_imagen,))
        conn.commit()

        return jsonify({"message": "Imagen eliminada"}), 200

    except Exception:
        if conn:
            conn.rollback()
        logging.exception("Error al eliminar imagen del carrusel")
        return jsonify({"error": "No se pudo eliminar la imagen"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
