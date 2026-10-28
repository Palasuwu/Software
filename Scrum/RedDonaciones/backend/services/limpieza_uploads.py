"""Inventario y limpieza de imágenes subidas que ya no usa ningún registro.

Ciclo de vida acordado (tarea 18, ver documentation/LimpiezaImagenes.md):
- Una imagen se sube al elegirla en el formulario, antes de guardar. Si el formulario
  se cancela, falla o se reemplaza la imagen, el archivo queda sin referencia.
- Un archivo se considera sin uso si ninguna columna de imagen lo referencia y tiene
  más de CONSERVACION_DIAS días. Los recientes se conservan: alguien puede estar
  llenando el formulario.
- Solo se tocan los nombres que genera /upload (32 hex + .jpg) directamente en la carpeta.
- Antes de borrar cada archivo se vuelven a consultar sus referencias.
"""
import logging
import os
import re
from datetime import datetime, timedelta

from services.archivo_service import nombre_upload_local, referencias_archivo

CONSERVACION_DIAS = 7
NOMBRE_SUBIDA = re.compile(r"^[0-9a-f]{32}\.jpg$")

# Las mismas cinco fuentes que referencias_archivo; si se agrega una columna de imagen,
# hay que sumarla en ambos lugares (hay una prueba que compara los dos).
_SQL_URLS_EN_USO = """
    SELECT url_logo AS url FROM organizacion WHERE url_logo IS NOT NULL
    UNION ALL SELECT imagen_portada FROM organizacion WHERE imagen_portada IS NOT NULL
    UNION ALL SELECT imagen_url FROM publicacion WHERE imagen_url IS NOT NULL
    UNION ALL SELECT imagen_url FROM resultado_campana WHERE imagen_url IS NOT NULL
    UNION ALL SELECT url_imagen FROM landing_carousel
"""


def nombres_en_uso(cursor):
    cursor.execute(_SQL_URLS_EN_USO)
    nombres = set()
    for fila in cursor.fetchall():
        url = fila["url"] if isinstance(fila, dict) else fila[0]
        nombre = nombre_upload_local(url)
        if nombre:
            nombres.add(nombre)
    return nombres


def inventario(cursor, carpeta, ahora=None, conservacion_dias=CONSERVACION_DIAS):
    """Clasifica los archivos de la carpeta sin modificar nada."""
    ahora = ahora or datetime.now()
    limite = ahora - timedelta(days=conservacion_dias)
    en_uso = nombres_en_uso(cursor)
    resultado = {"en_uso": [], "recientes": [], "candidatos": [], "ignorados": []}

    with os.scandir(carpeta) as entradas:
        for entrada in sorted(entradas, key=lambda e: e.name):
            if not entrada.is_file(follow_symlinks=False) or not NOMBRE_SUBIDA.match(entrada.name):
                resultado["ignorados"].append({"nombre": entrada.name})
                continue
            info = entrada.stat(follow_symlinks=False)
            modificado = datetime.fromtimestamp(info.st_mtime)
            archivo = {
                "nombre": entrada.name,
                "bytes": info.st_size,
                "modificado": modificado,
                "dias": (ahora - modificado).total_seconds() / 86400,
            }
            if entrada.name in en_uso:
                resultado["en_uso"].append(archivo)
            elif modificado > limite:
                resultado["recientes"].append(archivo)
            else:
                resultado["candidatos"].append(archivo)
    return resultado


def borrar_candidatos(cursor, carpeta, candidatos):
    """Borra los candidatos que siguen sin referencia. Devuelve qué pasó con cada uno."""
    borrados, conservados, ya_no_estaban = [], [], []
    for archivo in candidatos:
        nombre = archivo["nombre"]
        if not NOMBRE_SUBIDA.match(nombre):
            conservados.append(nombre)
            continue
        # Alguien pudo guardar el formulario entre el inventario y este momento.
        if referencias_archivo(cursor, nombre):
            conservados.append(nombre)
            continue
        try:
            os.remove(os.path.join(carpeta, nombre))
        except FileNotFoundError:
            ya_no_estaban.append(nombre)
            continue
        logging.info("Imagen sin uso eliminada: %s", nombre)
        borrados.append(nombre)
    return {"borrados": borrados, "conservados": conservados, "ya_no_estaban": ya_no_estaban}
