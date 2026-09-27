# Consultas de estadisticas: nunca unen donacion con publicacion_articulo (M:N) para no duplicar conteos.

ESTADOS_DONACION = (
    "pendiente",
    "recibida",
    "en_proceso",
    "entregada",
    "rechazada",
)


def _condiciones_filtro(fecha_inicio, fecha_fin, id_organizacion, estado=None, id_publicacion=None):
    condiciones = []
    params = []

    if fecha_inicio:
        condiciones.append("d.fecha_donacion >= %s")
        params.append(fecha_inicio)
    if fecha_fin:
        condiciones.append("d.fecha_donacion <= %s")
        params.append(fecha_fin)
    if id_organizacion:
        condiciones.append("p.id_organizacion = %s")
        params.append(id_organizacion)
    if estado:
        condiciones.append("d.estado = %s")
        params.append(estado)
    if id_publicacion:
        condiciones.append("d.id_publicacion = %s")
        params.append(id_publicacion)

    where_sql = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""
    return where_sql, params


def contar_donaciones_por_estado(cursor, fecha_inicio=None, fecha_fin=None, id_organizacion=None):
    """Conteo y suma de cantidad_donada por estado; los 5 estados siempre presentes (0 si no hay)."""
    where_sql, params = _condiciones_filtro(fecha_inicio, fecha_fin, id_organizacion)

    cursor.execute(
        f"""
        SELECT d.estado, COUNT(*) AS total, SUM(d.cantidad_donada) AS total_donado
        FROM donacion d
        INNER JOIN publicacion p ON p.id_publicacion = d.id_publicacion
        {where_sql}
        GROUP BY d.estado
        """,
        params,
    )
    datos_por_estado = {fila["estado"]: fila for fila in cursor.fetchall()}

    return [
        {
            "estado": estado,
            "total": datos_por_estado.get(estado, {}).get("total", 0),
            "total_donado": int(datos_por_estado.get(estado, {}).get("total_donado") or 0),
        }
        for estado in ESTADOS_DONACION
    ]


def contar_donantes_unicos(cursor, fecha_inicio=None, fecha_fin=None, id_organizacion=None):
    """Cantidad de donantes distintos que registraron al menos una donacion en el rango."""
    where_sql, params = _condiciones_filtro(fecha_inicio, fecha_fin, id_organizacion)

    cursor.execute(
        f"""
        SELECT COUNT(DISTINCT d.id_donante) AS total
        FROM donacion d
        INNER JOIN publicacion p ON p.id_publicacion = d.id_publicacion
        {where_sql}
        """,
        params,
    )
    return cursor.fetchone()["total"]


def contar_donaciones_por_campana(cursor, fecha_inicio=None, fecha_fin=None, id_organizacion=None):
    """Conteo y suma de cantidad_donada por campaña; incluye campañas sin donaciones (0) en el filtro."""
    condiciones = []
    params_publicacion = []
    if id_organizacion:
        condiciones.append("p.id_organizacion = %s")
        params_publicacion.append(id_organizacion)
    where_publicacion = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""

    condiciones_donacion = ["d.id_publicacion = p.id_publicacion"]
    params_join = []
    if fecha_inicio:
        condiciones_donacion.append("d.fecha_donacion >= %s")
        params_join.append(fecha_inicio)
    if fecha_fin:
        condiciones_donacion.append("d.fecha_donacion <= %s")
        params_join.append(fecha_fin)
    join_donacion = " AND ".join(condiciones_donacion)

    cursor.execute(
        f"""
        SELECT
            p.id_publicacion,
            p.titulo,
            COUNT(d.id_donacion) AS total_donaciones,
            COALESCE(SUM(d.cantidad_donada), 0) AS total_donado
        FROM publicacion p
        LEFT JOIN donacion d ON {join_donacion}
        {where_publicacion}
        GROUP BY p.id_publicacion, p.titulo
        ORDER BY p.titulo
        """,
        params_join + params_publicacion,
    )
    filas = cursor.fetchall()
    for fila in filas:
        fila["total_donado"] = int(fila["total_donado"])
    return filas


def listar_detalle_donaciones(
    cursor,
    fecha_inicio=None,
    fecha_fin=None,
    id_organizacion=None,
    estado=None,
    id_publicacion=None,
    page=1,
    page_size=20,
):
    """Detalle paginado de donaciones para el reporte, con los mismos filtros que los indicadores."""
    where_sql, params = _condiciones_filtro(fecha_inicio, fecha_fin, id_organizacion, estado, id_publicacion)

    cursor.execute(
        f"""
        SELECT COUNT(*) AS total
        FROM donacion d
        INNER JOIN publicacion p ON p.id_publicacion = d.id_publicacion
        {where_sql}
        """,
        params,
    )
    total = cursor.fetchone()["total"]

    offset = (page - 1) * page_size
    cursor.execute(
        f"""
        SELECT
            d.id_donacion,
            DATE_FORMAT(d.fecha_donacion, '%Y-%m-%d') AS fecha_donacion,
            d.estado,
            d.cantidad_donada,
            u.nombre AS donante_nombre,
            p.id_publicacion,
            p.titulo AS campana_titulo
        FROM donacion d
        INNER JOIN publicacion p ON p.id_publicacion = d.id_publicacion
        INNER JOIN usuario u ON u.id_usuario = d.id_donante
        {where_sql}
        ORDER BY d.fecha_donacion DESC, d.id_donacion DESC
        LIMIT %s OFFSET %s
        """,
        params + [page_size, offset],
    )
    items = cursor.fetchall()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_paginas": (total + page_size - 1) // page_size if page_size else 0,
    }
