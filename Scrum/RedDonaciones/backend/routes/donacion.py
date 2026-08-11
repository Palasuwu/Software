# Solo endpoints para manejo de lógica de donaciones
from datetime import datetime
import logging
from flask import Blueprint, jsonify, request
from auth_utils import token_required
from db.connection import get_db_connection, db_cursor
from db.notificaciones import asegurar_tabla_notificaciones, crear_notificacion
from services.donacion_service import (cambiar_estado_donacion, obtener_donacion_estado, validar_estado_donacion, )
donacion_bp = Blueprint("donacion", __name__)

# Ruta para obtener donaciones
@donacion_bp.route("/donaciones", methods=["GET"])
@token_required
def listar_donaciones():
    id_donante = request.args.get("id_donante")

    if id_donante is not None:
        try:
            id_donante = int(id_donante)
        except ValueError:
            return jsonify({
                "error": "id_donante debe ser un entero"
            }), 400

    # Los usuarios que no son administradores solo pueden consultar sus propias donaciones
    if request.usuario_rol != "administrador":
        if id_donante is not None and id_donante != request.usuario_id:
            return jsonify({
                "error": "No autorizado para consultar donaciones de otro usuario"
            }), 403

        id_donante = request.usuario_id

    try:
        with db_cursor(
            connection_factory=get_db_connection
        ) as (conn, cursor):

            sql = """
                SELECT
                    d.id_donacion,
                    d.id_donante,
                    d.id_publicacion,
                    d.descripcion,
                    d.nombre_contacto,
                    d.telefono_contacto,
                    d.estado AS donacion_estado,
                    DATE_FORMAT(
                        d.hora_preferida,
                        '%H:%i'
                    ) AS hora_preferida,
                    d.nota,
                    d.cantidad_donada,
                    DATE_FORMAT(
                        d.fecha_donacion,
                        '%Y-%m-%d'
                    ) AS fecha_donacion,
                    p.titulo AS publicacion_titulo,
                    p.descripcion AS publicacion_descripcion,
                    p.estado AS publicacion_estado,
                    p.cantidad_necesaria,
                    p.cantidad_recibida,
                    DATE_FORMAT(
                        p.fecha_limite,
                        '%Y-%m-%d'
                    ) AS fecha_limite,
                    o.nombre AS organizacion_nombre,
                    o.direccion AS organizacion_direccion,
                    c.nombre AS categoria

                FROM donacion d
                JOIN publicacion p
                    ON p.id_publicacion = d.id_publicacion
                JOIN organizacion o
                    ON o.id_organizacion = p.id_organizacion
                LEFT JOIN articulo a
                    ON a.id_articulo = p.id_articulo
                LEFT JOIN categoria_articulo c
                    ON c.id_categoria = a.id_categoria
                WHERE (%s IS NULL OR d.id_donante = %s)
                ORDER BY
                    d.fecha_donacion DESC,
                    d.id_donacion DESC
                LIMIT 50
            """

            cursor.execute(sql, (id_donante, id_donante))
            donaciones = cursor.fetchall()
            return jsonify(donaciones), 200

    except Exception:
        logging.exception("Error al listar donaciones")

        return jsonify({
            "error": "Error al listar donaciones"
        }), 500

# Ruta para obtener el detalle de una donación por su ID
@donacion_bp.route("/donaciones/<int:id_donacion>", methods=["GET"])
@token_required
def obtener_detalle_donacion(id_donacion):
    try:
        with db_cursor(
            connection_factory=get_db_connection
        ) as (conn, cursor):

            sql = """
                SELECT
                    d.id_donacion,
                    d.id_donante,
                    d.id_publicacion,
                    d.descripcion,
                    d.nombre_contacto,
                    d.telefono_contacto,
                    d.estado AS donacion_estado,
                    DATE_FORMAT(
                        d.hora_preferida,
                        '%H:%i'
                    ) AS hora_preferida,
                    d.nota,
                    d.cantidad_donada,
                    DATE_FORMAT(
                        d.fecha_donacion,
                        '%Y-%m-%d'
                    ) AS fecha_donacion,
                    p.titulo AS publicacion_titulo,
                    p.descripcion AS publicacion_descripcion,
                    p.estado AS publicacion_estado,
                    p.cantidad_necesaria,
                    p.cantidad_recibida,
                    DATE_FORMAT(
                        p.fecha_publicacion,
                        '%Y-%m-%d'
                    ) AS fecha_publicacion,
                    DATE_FORMAT(
                        p.fecha_limite,
                        '%Y-%m-%d'
                    ) AS fecha_limite,
                    o.nombre AS organizacion_nombre,
                    o.direccion AS organizacion_direccion,
                    c.nombre AS categoria,
                    u.nombre AS donante_nombre,
                    u.correo AS donante_correo,
                    u.telefono AS donante_telefono
                FROM donacion d
                JOIN publicacion p
                    ON p.id_publicacion = d.id_publicacion
                JOIN organizacion o
                    ON o.id_organizacion = p.id_organizacion
                JOIN usuario u
                    ON u.id_usuario = d.id_donante
                LEFT JOIN articulo a
                    ON a.id_articulo = p.id_articulo
                LEFT JOIN categoria_articulo c
                    ON c.id_categoria = a.id_categoria
                WHERE d.id_donacion = %s
            """
            cursor.execute(sql, (id_donacion,))
            donacion = cursor.fetchone()

            if not donacion:
                return jsonify({
                    "error": "Donación no encontrada"
                }), 404

            if (
                request.usuario_rol != "administrador"
                and donacion["id_donante"] != request.usuario_id
            ):
                return jsonify({
                    "error": "No autorizado para consultar esta donacion"
                }), 403

            articulos_sql = """
                SELECT
                    a.id_articulo,
                    a.nombre AS articulo,
                    pa.descripcion_detalle,
                    pa.cantidad
                FROM publicacion_articulo pa
                JOIN articulo a
                    ON a.id_articulo = pa.id_articulo
                WHERE pa.id_publicacion = %s
                ORDER BY a.nombre
            """
            cursor.execute(
                articulos_sql,
                (donacion["id_publicacion"],)
            )

            donacion["articulos"] = cursor.fetchall()

            return jsonify(donacion), 200

    except Exception:
        logging.exception(
            "Error al obtener detalle de donacion %s",
            id_donacion
        )

        return jsonify({
            "error": "Error al obtener el detalle de la donación"
        }), 500

# Ruta para registrar una donación
@donacion_bp.route("/donaciones", methods=["POST"])
@token_required
def crear_donacion():
    conn = None
    cursor = None

    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "error": "No se enviaron datos"
            }), 400

        id_donante = request.usuario_id
        id_publicacion = data.get("id_publicacion")
        descripcion = data.get("descripcion")
        nombre_contacto = data.get("nombre_contacto")
        telefono_contacto = data.get("telefono_contacto")
        hora_preferida = data.get("hora_preferida")
        nota = data.get("nota")
        fecha_donacion = data.get("fecha_donacion")
        cantidad_donada = data.get("cantidad_donada")

        # Validar campos obligatorios
        if (not id_publicacion or not descripcion or not nombre_contacto or not telefono_contacto or not hora_preferida or not fecha_donacion or not cantidad_donada ):
            return jsonify({
                "error": "Faltan datos obligatorios"
            }), 400

        # PARA VALIDAR LA CANTIDAD
        try:
            cantidad_donada = int(cantidad_donada)
        except (ValueError, TypeError):
            return jsonify({
                "error": "cantidad_donada debe ser un número entero"
            }), 400

        if cantidad_donada <= 0:
            return jsonify({
                "error": "La cantidad donada debe ser mayor a 0"
            }), 400

        # Vlidar fecha
        try:
            datetime.strptime(
                str(fecha_donacion),
                "%Y-%m-%d"
            )
        except ValueError:
            return jsonify({
                "error": "fecha_donacion debe tener formato YYYY-MM-DD"
            }), 400

        # Validar hora
        try:
            datetime.strptime(
                str(hora_preferida),
                "%H:%M"
            )
        except ValueError:
            return jsonify({
                "error": "hora_preferida debe tener formato HH:MM"
            }), 400

        # Iniciar transaccion
        conn = get_db_connection()

        # Dejamos explícito que esta operación debe ejecutarse dentro de una transacción
        conn.autocommit = False
        cursor = conn.cursor(dictionary=True)

        # . Primero se debe verificar el donante
        cursor.execute(
            """
            SELECT id_usuario
            FROM donante
            WHERE id_usuario = %s
            """,
            (id_donante,)
        )

        donante = cursor.fetchone()
        if not donante:
            return jsonify({
                "error": "El donante no existe"
            }), 404

        # 2. Obtener publicación
        cursor.execute(
            """
            SELECT
                id_publicacion,
                id_intermediario,
                titulo,
                cantidad_necesaria,
                cantidad_recibida,
                estado

            FROM publicacion

            WHERE id_publicacion = %s
            """,
            (id_publicacion,)
        )

        publicacion = cursor.fetchone()
        if not publicacion:
            return jsonify({
                "error": "La publicación no existe"
            }), 404

        # Validar estado de la campaña
        if publicacion["estado"] != "activa":
            return jsonify({
                "error": "La campaña ya finalizo"
            }), 400

        # Validaciones previas
        restante = (
            publicacion["cantidad_necesaria"]
            - publicacion["cantidad_recibida"]
        )
        if restante <= 0:
            return jsonify({
                "error": (
                    "Ya alcanzamos la meta, "
                    "ya no se aceptan más donaciones."
                )
            }), 400

        if cantidad_donada > restante:
            return jsonify({
                "error": (
                    f"La cantidad supera lo restante disponible "
                    f"({restante})"
                )
            }), 400

        # ACTUALIZACION ATOMICA
        # Esta es la protección contra la condición de carrera.
        # Solamente actualizará la publicación si todavía existe suficiente cantidad disponible EN EL MOMENTO DEL UPDATE
        # Dos solicitudes concurrentes no pueden hacer que cantidad_recibida supere cantidad_necesaria.
        update_sql = """
            UPDATE publicacion
            SET
                cantidad_recibida = cantidad_recibida + %s,
                estado = CASE
                    WHEN (cantidad_recibida + %s) >= cantidad_necesaria
                    THEN 'finalizada'
                    ELSE estado
                END
            WHERE id_publicacion = %s
              AND estado = 'activa'
              AND cantidad_recibida + %s <= cantidad_necesaria
        """
        cursor.execute(
            update_sql,
            (cantidad_donada, cantidad_donada,id_publicacion,cantidad_donada)
        )

        # Si otra transacción consumió el cupo entre el SELECT anterior y este UPDATE, no se actualiza ninguna fila
        if cursor.rowcount != 1:
            conn.rollback()
            return jsonify({
                "error": (
                    "La cantidad supera lo restante disponible "
                    "o la campaña ya finalizó"
                )
            }), 400

        # Insertar donación
        insert_sql = """
            INSERT INTO donacion (
                id_donante,
                id_publicacion,
                descripcion,
                nombre_contacto,
                telefono_contacto,
                hora_preferida,
                nota,
                cantidad_donada,
                fecha_donacion
            )
            VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s
            )
        """

        cursor.execute(
            insert_sql,
            (id_donante, id_publicacion, descripcion, nombre_contacto.strip(), telefono_contacto.strip(), hora_preferida,
                (
                    nota.strip()
                    if isinstance(nota, str) and nota.strip()
                    else None
                ),
                cantidad_donada,
                fecha_donacion
            )
        )

        id_donacion = cursor.lastrowid

        # Notificaciones
        asegurar_tabla_notificaciones(cursor)
        crear_notificacion(
            cursor,
            id_donante,
            "donacion_registrada",
            "Donacion registrada",
            (
                f"Tu aporte de {cantidad_donada} unidades para "
                f"{publicacion['titulo']} fue registrado."
            ),
            f"/donaciones/{id_donacion}"
        )

        crear_notificacion(
            cursor,
            publicacion["id_intermediario"],
            "nueva_donacion",
            "Nueva donacion recibida",
            (
                f"{nombre_contacto.strip()} dono "
                f"{cantidad_donada} unidades para "
                f"{publicacion['titulo']}."
            ),
            "/intermediario"
        )

        # Confirmar toda la operación
        conn.commit()

        return jsonify({
            "message": "Donación registrada y publicación actualizada",
            "id_donacion": id_donacion
        }), 201

    except Exception:
        if conn:
            conn.rollback()

        logging.exception("Error al registrar una donacion")

        return jsonify({
            "error": "Error al registrar la donación"
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()

# Ruta para obtener el estado de una donación por su ID
@donacion_bp.route(
    "/donaciones/<int:id_donacion>/estado",
    methods=["GET"]
)
@token_required
def obtener_estado_donacion(id_donacion):
    try:
        with db_cursor(
            connection_factory=get_db_connection
        ) as (conn, cursor):

            donacion = obtener_donacion_estado(
                cursor,
                id_donacion
            )

            if not donacion:
                return jsonify({
                    "error": "Donación no encontrada"
                }), 404

            # ADMINISTRADOR: Puede consultar cualquier donación.
            if request.usuario_rol == "administrador":
                return jsonify(donacion), 200

            # DONANTE: Solamente puede consultar sus donaciones.
            if request.usuario_rol == "donante":
                if (
                    donacion["id_donante"]
                    != request.usuario_id
                ):
                    return jsonify({
                        "error": (
                            "No autorizado para consultar "
                            "esta donación"
                        )
                    }), 403

                return jsonify(donacion), 200

            # INTERMEDIARIO: Solamente puede consultar donaciones pertenecientes a su organización actual
            if request.usuario_rol == "intermediario":
                cursor.execute(
                    """
                    SELECT id_organizacion
                    FROM intermediario
                    WHERE id_usuario = %s
                    """,
                    (request.usuario_id,)
                )

                intermediario = cursor.fetchone()

                if not intermediario:
                    return jsonify({
                        "error": "Acceso denegado"
                    }), 403

                if (
                    donacion["id_organizacion"]
                    != intermediario["id_organizacion"]
                ):
                    return jsonify({
                        "error": "Donación no encontrada"
                    }), 404

                return jsonify(donacion), 200

            # Cualquier otro rol
            return jsonify({
                "error": "Acceso denegado"
            }), 403

    except Exception:
        logging.exception(
            "Error al obtener estado de donacion %s",
            id_donacion
        )

        return jsonify({
            "error": (
                "Error al obtener el estado "
                "de la donación"
            )
        }), 500

# -- Editar estado: admin e intermediario
@donacion_bp.route(
    "/donaciones/<int:id_donacion>/estado",
    methods=["PUT"]
)
@token_required
def actualizar_estado_donacion(id_donacion):
    try:
        # Solamente administrador e intermediario pueden gestionar estados
        if request.usuario_rol not in ("administrador", "intermediario" ):
            return jsonify({
                "error": (
                    "No autorizado para actualizar "
                    "el estado de la donación"
                )
            }), 403

        data = request.get_json()

        if not data:
            return jsonify({
                "error": "No se enviaron datos"
            }), 400

        nuevo_estado = validar_estado_donacion(
            data.get("estado")
        )

        if not nuevo_estado:
            return jsonify({
                "error": (
                    "Estado inválido. Usa pendiente, "
                    "recibida, en_proceso, entregada "
                    "o rechazada"
                )
            }), 400

        with db_cursor(
            connection_factory=get_db_connection
        ) as (conn, cursor):

            # Primero obtenemos la donación para validar permisos antes de modificarla.
            donacion = obtener_donacion_estado(cursor, id_donacion)
            if not donacion:
                return jsonify({
                    "error": "Donación no encontrada"
                }), 404

            # PERMISOS DEL INTERMEDIARIO
            if request.usuario_rol == "intermediario":
                cursor.execute(
                    """
                    SELECT id_organizacion
                    FROM intermediario
                    WHERE id_usuario = %s
                    """,
                    (request.usuario_id,)
                )

                intermediario = cursor.fetchone()

                if not intermediario:
                    return jsonify({
                        "error": (
                            "El intermediario no está "
                            "asociado a una organización"
                        )
                    }), 403

                id_organizacion_actual = (
                    intermediario["id_organizacion"]
                )

                if (
                    donacion["id_organizacion"]
                    != id_organizacion_actual
                ):
                    return jsonify({
                        "error": "Donación no encontrada"
                    }), 404

            # Cambio de estado
            resultado, error, codigo = ( cambiar_estado_donacion( cursor, id_donacion, nuevo_estado) )

            if error:
                return jsonify({
                    "error": error
                }), codigo

            conn.commit()

            return jsonify({
                "message": (
                    "Estado de donación actualizado"
                ),
                "donacion": {
                    "id_donacion": (
                        resultado["id_donacion"]
                    ),
                    "estado_anterior": (
                        resultado["estado_anterior"]
                    ),
                    "estado": resultado["estado"]
                }
            }), 200

    except Exception:
        logging.exception(
            "Error al actualizar estado de donacion %s",
            id_donacion
        )

        return jsonify({
            "error": (
                "No se pudo actualizar "
                "el estado de la donación"
            )
        }), 500