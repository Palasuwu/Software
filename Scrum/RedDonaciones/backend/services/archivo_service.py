"""Referencias de uploads locales; no infiere propietario ni registra archivos."""
from urllib.parse import unquote, urlsplit

from flask import jsonify, request

from auth_utils import _autenticar_request, autorizar_lectura_institucional


def nombre_upload_local(url):
    if not isinstance(url, str) or not url.startswith('/') or url.startswith('//'):
        return None
    try:
        partes = urlsplit(url)
    except ValueError:
        return None
    if partes.scheme or partes.netloc:
        return None
    ruta = unquote(partes.path)
    for prefijo in ('/api/uploads/', '/uploads/'):
        if ruta.startswith(prefijo):
            nombre = ruta[len(prefijo):]
            # Las subidas existentes son planas. No normalizar traversal a un archivo válido.
            if nombre and nombre not in ('.', '..') and not any(c in nombre for c in ('/', '\\', '\x00', '%')):
                return nombre
    return None


def referencias_archivo(cursor, nombre):
    # Comparar URLs normalizadas completas, nunca basename de una URL externa.
    # UNION ALL conserva todas las referencias, también las compartidas.
    cursor.execute("""
        SELECT url_logo AS url, 'organizacion' AS tipo, id_organizacion,
               estado_verificacion, NULL AS estado_publicacion
        FROM organizacion WHERE url_logo IS NOT NULL
        UNION ALL
        SELECT imagen_portada, 'organizacion', id_organizacion, estado_verificacion, NULL
        FROM organizacion WHERE imagen_portada IS NOT NULL
        UNION ALL
        SELECT p.imagen_url, 'publicacion', o.id_organizacion, o.estado_verificacion,
               CASE WHEN COALESCE(p.estado, 'activa') = 'activa'
                         AND p.fecha_limite IS NOT NULL AND p.fecha_limite < CURDATE()
                    THEN 'cancelada' ELSE COALESCE(p.estado, 'activa') END
        FROM publicacion p JOIN organizacion o ON o.id_organizacion = p.id_organizacion
        WHERE p.imagen_url IS NOT NULL
        UNION ALL
        SELECT r.imagen_url, 'resultado', o.id_organizacion, o.estado_verificacion,
               CASE WHEN COALESCE(p.estado, 'activa') = 'activa'
                         AND p.fecha_limite IS NOT NULL AND p.fecha_limite < CURDATE()
                    THEN 'cancelada' ELSE COALESCE(p.estado, 'activa') END
        FROM resultado_campana r JOIN publicacion p ON p.id_publicacion = r.id_publicacion
        JOIN organizacion o ON o.id_organizacion = p.id_organizacion
        WHERE r.imagen_url IS NOT NULL
        UNION ALL
        SELECT url_imagen, 'carrusel', NULL, NULL, NULL FROM landing_carousel
    """)
    return [fila for fila in cursor.fetchall() if nombre_upload_local(fila['url']) == nombre]


def _referencia_publica(ref):
    if ref['tipo'] == 'carrusel':
        return True
    estado = ref['estado_verificacion']
    if ref['tipo'] == 'organizacion':
        return estado == 'verificada'
    if ref['tipo'] == 'resultado' and estado not in ('pendiente', 'archivada', 'verificada'):
        # Conservar el GET legado de resultados de la parte 1 en otros estados.
        return True
    return estado == 'verificada' and ref['estado_publicacion'] in ('activa', 'finalizada')


def autorizar_archivo(cursor, referencias):
    privadas = [ref for ref in referencias if not _referencia_publica(ref)]
    if referencias and not privadas:
        return None
    no_encontrado = (jsonify({'error': 'Archivo no encontrado'}), 404)
    if not request.headers.get('Authorization'):
        return no_encontrado
    _, error = _autenticar_request()
    if error:
        return error
    if request.usuario_rol == 'administrador':
        return None
    if not referencias:
        return no_encontrado
    for ref in privadas:
        error = autorizar_lectura_institucional(
            cursor, ref['id_organizacion'], ref['estado_verificacion'], 'Archivo no encontrado',
        )
        if error:
            return error
    return None
