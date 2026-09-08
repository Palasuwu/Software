LONGITUD_MAXIMA_RESUMEN = 1000
LONGITUD_MAXIMA_IMAGEN_URL = 500


def validar_resultado_campana(data):
    """Normaliza el formulario de resultados y devuelve errores por campo."""
    if not isinstance(data, dict):
        return None, {"general": "No se enviaron datos válidos"}

    resumen = data.get("resumen")
    imagen_url = data.get("imagen_url")
    personas_beneficiadas = data.get("personas_beneficiadas")
    errores = {}

    if not isinstance(resumen, str) or not resumen.strip():
        errores["resumen"] = "Escribe un resumen de los resultados"
    elif len(resumen.strip()) > LONGITUD_MAXIMA_RESUMEN:
        errores["resumen"] = (
            f"El resumen no puede superar {LONGITUD_MAXIMA_RESUMEN} caracteres"
        )

    if imagen_url is not None:
        if not isinstance(imagen_url, str):
            errores["imagen_url"] = "La imagen debe ser una dirección válida"
        else:
            imagen_url = imagen_url.strip() or None
            if imagen_url and len(imagen_url) > LONGITUD_MAXIMA_IMAGEN_URL:
                errores["imagen_url"] = (
                    "La dirección de la imagen no puede superar "
                    f"{LONGITUD_MAXIMA_IMAGEN_URL} caracteres"
                )

    if personas_beneficiadas in (None, ""):
        personas_beneficiadas = None
    else:
        try:
            personas_beneficiadas = int(personas_beneficiadas)
        except (TypeError, ValueError):
            errores["personas_beneficiadas"] = "Ingresa una cantidad entera"
        else:
            if personas_beneficiadas < 0:
                errores["personas_beneficiadas"] = "La cantidad no puede ser negativa"

    if errores:
        return None, errores

    return {
        "resumen": resumen.strip(),
        "personas_beneficiadas": personas_beneficiadas,
        "imagen_url": imagen_url,
    }, None


def obtener_resultado_campana(cursor, id_publicacion):
    cursor.execute(
        """
        SELECT
            r.id_resultado,
            r.id_publicacion,
            r.resumen,
            r.personas_beneficiadas,
            r.imagen_url,
            r.fecha_publicacion,
            r.fecha_actualizacion,
            u.nombre AS publicado_por
        FROM resultado_campana r
        INNER JOIN usuario u
            ON u.id_usuario = r.id_usuario_publicador
        WHERE r.id_publicacion = %s
        """,
        (id_publicacion,)
    )
    return cursor.fetchone()


def guardar_resultado_campana(cursor, id_publicacion, id_usuario, payload):
    cursor.execute(
        """
        INSERT INTO resultado_campana (
            id_publicacion,
            id_usuario_publicador,
            resumen,
            personas_beneficiadas,
            imagen_url
        ) VALUES (%s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            id_usuario_publicador = VALUES(id_usuario_publicador),
            resumen = VALUES(resumen),
            personas_beneficiadas = VALUES(personas_beneficiadas),
            imagen_url = VALUES(imagen_url)
        """,
        (
            id_publicacion,
            id_usuario,
            payload["resumen"],
            payload["personas_beneficiadas"],
            payload["imagen_url"]
        )
    )
