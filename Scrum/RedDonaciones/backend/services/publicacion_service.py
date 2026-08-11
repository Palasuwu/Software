# Para centralizar validaciones y operaciones compartidas entre admin e intermediario

from datetime import datetime
# Estados permitidos para una publicación
ESTADOS_PUBLICACION = (
    "activa",
    "finalizada",
    "cancelada"
)
# ----------- Validaciones generales
#Valida que el estado pertenezca a los estados permitidos para una publicación
def validar_estado_publicacion(estado):
    if not estado or not isinstance(estado, str):
        return False
    return estado.strip().lower() in ESTADOS_PUBLICACION
# Formato de fecha
def validar_fecha_yyyy_mm_dd(valor):
    if valor is None:
        return False
    try:
        datetime.strptime(str(valor), "%Y-%m-%d")
        return True
    except (TypeError, ValueError):
        return False
#Valida cantidad_necesaria sea un entero mayor o igual a cero
def validar_cantidad_necesaria(valor):
    if valor is None:
        return False
    try:
        cantidad = int(valor)
        return cantidad >= 0
    except (TypeError, ValueError):
        return False
# VALIDACION DEL PAYLOAD DE PUBLICACION
def validar_publicacion_payload(
    data,
    require_intermediario=True,
    require_organizacion=True,
    require_articulo=True
):
    """
    Valida y normaliza los datos utilizados para crear o editar una publicación.
    Retorna:
        (True, None, payload) si los datos son válidos.
        (False, errores, None) si existen errores.
    """
    errors = []
    payload = {}
    if not data or not isinstance(data, dict):
        return False, ["No se enviaron datos"], None
    def requerido(campo):
        return data.get(campo) not in (None, "")
    # Campos obligatorios
    if require_intermediario and not requerido("id_intermediario"):
        errors.append("Falta el campo obligatorio: id_intermediario")
    if require_organizacion and not requerido("id_organizacion"):
        errors.append("Falta el campo obligatorio: id_organizacion")
    if require_articulo and not requerido("id_articulo"):
        errors.append("Falta el campo obligatorio: id_articulo")
    if not requerido("titulo"):
        errors.append("Falta el campo obligatorio: titulo")
    if not requerido("descripcion"):
        errors.append("Falta el campo obligatorio: descripcion")
    if not requerido("cantidad_necesaria"):
        errors.append("Falta el campo obligatorio: cantidad_necesaria")
    if not requerido("fecha_publicacion"):
        errors.append("Falta el campo obligatorio: fecha_publicacion")
    if not requerido("fecha_limite"):
        errors.append("Falta el campo obligatorio: fecha_limite")
    if not requerido("estado"):
        errors.append("Falta el campo obligatorio: estado")
    if errors:
        return False, errors, None
    # Normalizar payload
    if require_intermediario:
        payload["id_intermediario"] = data.get(
            "id_intermediario"
        )
    if require_organizacion:
        payload["id_organizacion"] = data.get(
            "id_organizacion"
        )
    if require_articulo:
        payload["id_articulo"] = data.get(
            "id_articulo"
        )
    payload["titulo"] = str(
        data.get("titulo") or ""
    ).strip()
    payload["descripcion"] = str(
        data.get("descripcion") or ""
    ).strip()
    payload["cantidad_necesaria"] = data.get(
        "cantidad_necesaria"
    )
    payload["fecha_publicacion"] = data.get(
        "fecha_publicacion"
    )
    payload["fecha_limite"] = data.get(
        "fecha_limite"
    )
    payload["estado"] = str(
        data.get("estado") or ""
    ).strip().lower()
    imagen_url = data.get("imagen_url")
    if isinstance(imagen_url, str):
        imagen_url = imagen_url.strip() or None
    payload["imagen_url"] = imagen_url
    # Validar texto
    if not payload["titulo"]:
        errors.append( "Falta el campo obligatorio: titulo")
    if not payload["descripcion"]:
        errors.append("Falta el campo obligatorio: descripcion")
    # Validar cantidad
    if not validar_cantidad_necesaria(
        payload["cantidad_necesaria"]
    ):
        errors.append("cantidad_necesaria debe ser un número entero mayor o igual a 0")
    # Validar fechas
    fecha_publicacion_valida = validar_fecha_yyyy_mm_dd(
        payload["fecha_publicacion"]
    )
    fecha_limite_valida = validar_fecha_yyyy_mm_dd(
        payload["fecha_limite"]
    )
    if not fecha_publicacion_valida:
        errors.append("fecha_publicacion debe tener formato YYYY-MM-DD")
    if not fecha_limite_valida:
        errors.append("fecha_limite debe tener formato YYYY-MM-DD")
    # Si ambas fechas tienen formato correcto, validar también su orden
    if fecha_publicacion_valida and fecha_limite_valida:
        fecha_publicacion = datetime.strptime(
            str(payload["fecha_publicacion"]),
            "%Y-%m-%d"
        )
        fecha_limite = datetime.strptime(
            str(payload["fecha_limite"]),
            "%Y-%m-%d"
        )
        if fecha_limite < fecha_publicacion:
            errors.append( "fecha_limite no puede ser anterior a fecha_publicacion" )
    # Validar estado
    if not validar_estado_publicacion(
        payload["estado"]
    ):
        errors.append("estado invalido. Usa activa, finalizada o cancelada")
    if errors:
        return False, errors, None
    # Convertir cantidad después de validar
    payload["cantidad_necesaria"] = int(
        payload["cantidad_necesaria"]
    )
    return True, None, payload

# ------- VALIDACIONES CONTRA BASE DE DATOS
#Organización verificada
def organizacion_verificada(cursor, id_organizacion):
    cursor.execute(
        """
        SELECT id_organizacion
        FROM organizacion
        WHERE id_organizacion = %s
          AND estado_verificacion = 'verificada'
        """,
        (id_organizacion,)
    )
    return cursor.fetchone() is not None
#Intermediario que pretenezca a orga indicada
def intermediario_pertenece_a_organizacion(
    cursor,
    id_intermediario,
    id_organizacion
):
    cursor.execute(
        """
        SELECT id_usuario
        FROM intermediario
        WHERE id_usuario = %s
          AND id_organizacion = %s
        """,
        (
            id_intermediario,
            id_organizacion
        )
    )
    return cursor.fetchone() is not None
#Articulo existe
def articulo_existe(cursor, id_articulo):
    cursor.execute(
        """
        SELECT id_articulo
        FROM articulo
        WHERE id_articulo = %s
        """,
        (id_articulo,)
    )
    return cursor.fetchone() is not None

#Obtiene los datos básicos necesarios de una publicación.
def obtener_publicacion_por_id(
    cursor,
    id_publicacion
):
    cursor.execute(
        """
        SELECT
            id_publicacion,
            id_organizacion
        FROM publicacion
        WHERE id_publicacion = %s
        """,
        (id_publicacion,)
    )
    return cursor.fetchone()
#   Obtiene una publicación únicamente si pertenec a la organización indicada.
def obtener_publicacion_por_id_y_organizacion(
    cursor,
    id_publicacion,
    id_organizacion
):
    cursor.execute(
        """
        SELECT
            id_publicacion,
            id_organizacion
        FROM publicacion
        WHERE id_publicacion = %s
          AND id_organizacion = %s
        """,
        (
            id_publicacion,
            id_organizacion
        )
    )
    return cursor.fetchone()

def publicacion_pertenece_a_organizacion(
    cursor,
    id_publicacion,
    id_organizacion
):
    return obtener_publicacion_por_id_y_organizacion(
        cursor,
        id_publicacion,
        id_organizacion
    ) is not None

# ---------------------- OPERACIONES DE BASE DE DATOS
def crear_publicacion_db(
    cursor,
    payload,
    id_intermediario
):
    sql = """
        INSERT INTO publicacion (
            id_intermediario,
            id_organizacion,
            id_articulo,
            titulo,
            descripcion,
            cantidad_necesaria,
            cantidad_recibida,
            fecha_publicacion,
            fecha_limite,
            estado,
            imagen_url
        )
        VALUES (
            %s, %s, %s, %s, %s,
            %s, 0, %s, %s, %s, %s
        )
    """
    cursor.execute(
        sql,
        (
            id_intermediario,
            payload["id_organizacion"],
            payload["id_articulo"],
            payload["titulo"],
            payload["descripcion"],
            payload["cantidad_necesaria"],
            payload["fecha_publicacion"],
            payload["fecha_limite"],
            payload["estado"],
            payload.get("imagen_url")
        )
    )

def editar_publicacion_db(
    cursor,
    id_publicacion,
    payload
):
    sql = """
        UPDATE publicacion
        SET
            id_articulo = %s,
            titulo = %s,
            descripcion = %s,
            cantidad_necesaria = %s,
            fecha_publicacion = %s,
            fecha_limite = %s,
            estado = %s,
            imagen_url = %s
        WHERE id_publicacion = %s
    """
    cursor.execute(
        sql,
        (
            payload["id_articulo"],
            payload["titulo"],
            payload["descripcion"],
            payload["cantidad_necesaria"],
            payload["fecha_publicacion"],
            payload["fecha_limite"],
            payload["estado"],
            payload.get("imagen_url"),
            id_publicacion
        )
    )
#   Actualiza únicamente el estado de una publicación.
def actualizar_estado_publicacion_db(
    cursor,
    id_publicacion,
    estado
):
    cursor.execute(
        """
        UPDATE publicacion
        SET estado = %s
        WHERE id_publicacion = %s
        """,
        (
            estado,
            id_publicacion
        )
    )
