import base64
import logging
import warnings
from io import BytesIO

from flask import Blueprint, jsonify, request
from PIL import Image, ImageOps, UnidentifiedImageError

from auth_utils import token_required
from db.connection import db_cursor, get_db_connection

foto_perfil_bp = Blueprint('foto_perfil', __name__)
MAX_BYTES = 5 * 1024 * 1024
FORMATOS = {'JPEG', 'PNG', 'GIF', 'WEBP'}


def asegurar_tabla_foto(cursor):
    # También permite usar esta funcionalidad con bases creadas antes del sprint.
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuario_foto (
            id_usuario INT PRIMARY KEY,
            imagen MEDIUMBLOB NOT NULL,
            FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ''')


def foto_url(imagen):
    return 'data:image/jpeg;base64,' + base64.b64encode(imagen).decode('ascii')


@foto_perfil_bp.route('/usuarios/<int:id_usuario>/foto', methods=['GET', 'PUT'])
@token_required
def gestionar_foto(id_usuario):
    if request.usuario_id != id_usuario:
        return jsonify({'error': 'Solo puedes consultar o cambiar tu propia foto'}), 403

    imagen = None
    if request.method == 'PUT':
        archivo = request.files.get('file')
        if archivo is None or not archivo.filename:
            return jsonify({'error': 'Selecciona una imagen'}), 400
        contenido = archivo.stream.read(MAX_BYTES + 1)
        if len(contenido) > MAX_BYTES:
            return jsonify({'error': 'La foto supera el límite de 5 MB'}), 400
        try:
            with warnings.catch_warnings():
                warnings.simplefilter('error', Image.DecompressionBombWarning)
                with Image.open(BytesIO(contenido)) as original:
                    if original.format not in FORMATOS:
                        return jsonify({'error': 'Solo se permiten JPG, PNG, GIF o WEBP'}), 400
                    original.seek(0)
                    corregida = ImageOps.exif_transpose(original)
                    corregida.thumbnail((320, 320), Image.Resampling.LANCZOS)
                    rgba = corregida.convert('RGBA')
                    fondo = Image.new('RGB', rgba.size, 'white')
                    fondo.paste(rgba, mask=rgba.getchannel('A'))
                    salida = BytesIO()
                    fondo.save(salida, format='JPEG', quality=85, optimize=True)
                    imagen = salida.getvalue()
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
            return jsonify({'error': 'No se pudo procesar la foto. Selecciona una imagen válida'}), 400

    try:
        with db_cursor(connection_factory=get_db_connection) as (conn, cursor):
            asegurar_tabla_foto(cursor)
            if imagen is not None:
                try:
                    cursor.execute('''
                        INSERT INTO usuario_foto (id_usuario, imagen) VALUES (%s, %s)
                        ON DUPLICATE KEY UPDATE imagen = VALUES(imagen)
                    ''', (id_usuario, imagen))
                    conn.commit()
                except Exception:
                    conn.rollback()
                    raise
            else:
                cursor.execute('SELECT imagen FROM usuario_foto WHERE id_usuario = %s', (id_usuario,))
                fila = cursor.fetchone()
                imagen = fila['imagen'] if fila else None
        response = jsonify({'foto_url': foto_url(imagen) if imagen else None})
        response.headers['Cache-Control'] = 'no-store'
        return response, 200
    except Exception:
        logging.exception('Error al guardar o consultar la foto de perfil')
        return jsonify({'error': 'No se pudo guardar o consultar la foto de perfil'}), 500
