# Lógica y validaciones compartidas para donaciones

from db.notificaciones import asegurar_tabla_notificaciones, crear_notificacion

ESTADOS_DONACION = (
    "pendiente",
    "recibida",
    "en_proceso",
    "entregada",
    "rechazada"
)

# Estados finales: entregada // rechazada
TRANSICIONES_DONACION = {
    "pendiente": {
        "recibida",
        "rechazada"
    },
    "recibida": {
        "en_proceso",
        "rechazada"
    },
    "en_proceso": {
        "entregada",
        "rechazada"
    },
    "entregada": set(),
    "rechazada": set()
}

NOMBRES_ESTADO_DONACION = {
    "pendiente": "pendiente",
    "recibida": "recibida",
    "en_proceso": "en proceso",
    "entregada": "entregada",
    "rechazada": "rechazada"
}

# Normaliza y valida un estado de donación.
# - Retorna el estado normalizado si es válido.
# - Retorna None si no es válido.
def validar_estado_donacion(estado):
    if not isinstance(estado, str):
        return None
    estado = estado.strip().lower()
    if estado not in ESTADOS_DONACION:
        return None
    return estado

#Comprueba si una transición de estado está permitida.
def validar_transicion_donacion(estado_actual,nuevo_estado):
    if estado_actual not in TRANSICIONES_DONACION:
        return False
    return (
        nuevo_estado
        in TRANSICIONES_DONACION[estado_actual]
    )

def obtener_donacion_estado(cursor, id_donacion ):
    """
    Obtiene la información necesaria para consultar
    y gestionar el estado de una donación.
    """
    cursor.execute(
        """
        SELECT
            d.id_donacion,
            d.id_donante,
            d.id_publicacion,
            d.estado,
            p.id_organizacion,
            p.titulo AS publicacion_titulo
        FROM donacion d
        INNER JOIN publicacion p
            ON p.id_publicacion = d.id_publicacion
        WHERE d.id_donacion = %s
        """,
        (id_donacion,)
    )

    return cursor.fetchone()

# Actualiza el estado de una donaci+on
def actualizar_estado_donacion_db(cursor, id_donacion, nuevo_estado ):
    cursor.execute(
        """
        UPDATE donacion
        SET estado = %s
        WHERE id_donacion = %s
        """,
        (
            nuevo_estado,
            id_donacion
        )
    )


def crear_notificacion_cambio_estado(
    cursor,
    donacion,
    estado_anterior,
    nuevo_estado
):
    asegurar_tabla_notificaciones(cursor)
    estado_anterior = NOMBRES_ESTADO_DONACION[estado_anterior]
    estado_nuevo = NOMBRES_ESTADO_DONACION[nuevo_estado]

    crear_notificacion(
        cursor,
        donacion["id_donante"],
        "estado_donacion",
        "Estado de donación actualizado",
        (
            f"Tu donación para {donacion['publicacion_titulo']} "
            f"cambió de {estado_anterior} a {estado_nuevo}."
        ),
        f"/donaciones/{donacion['id_donacion']}"
    )


#  Valida y realiza el cambio de estado de una donación.
# Retorna: donacion actualizada, error, codigo_http
def cambiar_estado_donacion(cursor,id_donacion,nuevo_estado ):
    donacion = obtener_donacion_estado(cursor, id_donacion)

    if not donacion:
        return None, "Donación no encontrada", 404
    estado_actual = donacion["estado"]
    if estado_actual == nuevo_estado:
        return (
            None,
            (
                "La donación ya se encuentra "
                f"en estado {nuevo_estado}"
            ),
            400
        )

    if not validar_transicion_donacion( estado_actual,nuevo_estado):
        return (
            None,
            (
                "Transición de estado no permitida: "
                f"{estado_actual} -> {nuevo_estado}"
            ),
            400
        )

    actualizar_estado_donacion_db(cursor, id_donacion, nuevo_estado)
    crear_notificacion_cambio_estado(
        cursor,
        donacion,
        estado_actual,
        nuevo_estado
    )

    return {
        "id_donacion": id_donacion,
        "id_organizacion": donacion["id_organizacion"],
        "id_donante": donacion["id_donante"],
        "estado_anterior": estado_actual,
        "estado": nuevo_estado
    }, None, 200

# Cambia el estado de varias donaciones; las invalidas quedan omitidas sin frenar el resto del lote
def cambiar_estado_donaciones_masivo(
    cursor,
    ids_donacion,
    nuevo_estado,
    id_organizacion=None
):
    actualizadas = []
    omitidas = []

    for id_donacion in ids_donacion:
        donacion = obtener_donacion_estado(cursor, id_donacion)

        if not donacion:
            omitidas.append({
                "id_donacion": id_donacion,
                "motivo": "Donación no encontrada"
            })
            continue

        if (
            id_organizacion is not None
            and donacion["id_organizacion"] != id_organizacion
        ):
            omitidas.append({
                "id_donacion": id_donacion,
                "motivo": "No pertenece a tu organización"
            })
            continue

        estado_actual = donacion["estado"]

        if estado_actual == nuevo_estado:
            omitidas.append({
                "id_donacion": id_donacion,
                "motivo": f"Ya se encuentra en estado {nuevo_estado}"
            })
            continue

        if not validar_transicion_donacion(estado_actual, nuevo_estado):
            omitidas.append({
                "id_donacion": id_donacion,
                "motivo": (
                    "Transición no permitida: "
                    f"{estado_actual} -> {nuevo_estado}"
                )
            })
            continue

        actualizar_estado_donacion_db(cursor, id_donacion, nuevo_estado)
        crear_notificacion_cambio_estado(
            cursor,
            donacion,
            estado_actual,
            nuevo_estado
        )

        actualizadas.append({
            "id_donacion": id_donacion,
            "estado_anterior": estado_actual,
            "estado": nuevo_estado
        })

    return actualizadas, omitidas


def consultar_donaciones_recibidas_db(
    cursor,
    id_organizacion=None,
    estado=None,
    id_publicacion=None,
    fecha_desde=None,
    fecha_hasta=None,
    buscar=None
):
    condiciones = []
    params = []

    if id_organizacion is not None:
        condiciones.append("p.id_organizacion = %s")
        params.append(id_organizacion)

    if estado:
        condiciones.append("d.estado = %s")
        params.append(estado)

    if id_publicacion is not None:
        condiciones.append("d.id_publicacion = %s")
        params.append(id_publicacion)

    if fecha_desde:
        condiciones.append("d.fecha_donacion >= %s")
        params.append(fecha_desde)

    if fecha_hasta:
        condiciones.append("d.fecha_donacion <= %s")
        params.append(fecha_hasta)

    if buscar:
        patron = f"%{buscar}%"
        condiciones.append("(u.nombre LIKE %s OR d.nombre_contacto LIKE %s OR p.titulo LIKE %s)")
        params.extend([patron, patron, patron])

    where_sql = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""

    sql = f"""
        SELECT
            d.id_donacion,
            d.id_publicacion,
            d.nombre_contacto,
            d.telefono_contacto,
            d.cantidad_donada,
            d.estado,
            DATE_FORMAT(
                d.fecha_donacion,
                '%Y-%m-%d'
            ) AS fecha_donacion,
            p.titulo AS publicacion_titulo,
            p.id_organizacion,
            o.nombre AS organizacion_nombre,
            u.nombre AS donante_nombre
        FROM donacion d
        INNER JOIN publicacion p
            ON p.id_publicacion = d.id_publicacion
        INNER JOIN organizacion o
            ON o.id_organizacion = p.id_organizacion
        INNER JOIN usuario u
            ON u.id_usuario = d.id_donante
        {where_sql}
        ORDER BY
            d.fecha_donacion DESC,
            d.id_donacion DESC
    """

    cursor.execute(sql, tuple(params))
    return cursor.fetchall()
