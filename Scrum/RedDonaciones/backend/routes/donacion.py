from flask import Blueprint, request, jsonify
from datetime import datetime
import logging

from db.connection import get_db_connection
from auth_utils import token_required

donacion_bp = Blueprint("donacion", __name__)

# Ruta para obtener donaciones (filtro opcional por donante)
@donacion_bp.route("/donaciones", methods=["GET"])
@token_required
def listar_donaciones():
    id_donante = request.args.get("id_donante")

    if id_donante is not None:
        try:
            id_donante = int(id_donante)
        except ValueError:
            return jsonify({"error": "id_donante debe ser un entero"}), 400

    if request.usuario_rol != "administrador":
        if id_donante is not None and id_donante != request.usuario_id:
            return jsonify({"error": "No autorizado para consultar donaciones de otro usuario"}), 403
        id_donante = request.usuario_id

    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
        SELECT
            d.id_donacion, d.id_donante, d.id_publicacion, d.descripcion,
            d.nombre_contacto, d.telefono_contacto,
            DATE_FORMAT(d.hora_preferida, '%H:%i') AS hora_preferida,
            d.nota, d.cantidad_donada,
            DATE_FORMAT(d.fecha_donacion, '%Y-%m-%d') AS fecha_donacion,
            p.titulo AS publicacion_titulo, p.descripcion AS publicacion_descripcion,
            p.estado AS publicacion_estado, p.cantidad_necesaria, p.cantidad_recibida,
            DATE_FORMAT(p.fecha_limite, '%Y-%m-%d') AS fecha_limite,
            o.nombre AS organizacion_nombre, o.direccion AS organizacion_direccion,
            c.nombre AS categoria
        FROM donacion d
        JOIN publicacion p ON p.id_publicacion = d.id_publicacion
        JOIN organizacion o ON o.id_organizacion = p.id_organizacion
        LEFT JOIN articulo a ON a.id_articulo = p.id_articulo
        LEFT JOIN categoria_articulo c ON c.id_categoria = a.id_categoria
        WHERE (%s IS NULL OR d.id_donante = %s)
        ORDER BY d.fecha_donacion DESC, d.id_donacion DESC
        LIMIT 50
        """

        try:
            cursor.execute(sql, (id_donante, id_donante))
            donaciones = cursor.fetchall()
        except Exception:
            logging.exception("Error en query enriquecido, ejecutando fallback_sql")
            fallback_sql = """
            SELECT
                d.id_donacion, d.id_donante, d.id_publicacion, d.descripcion,
                DATE_FORMAT(d.fecha_donacion, '%Y-%m-%d') AS fecha_donacion,
                p.titulo AS publicacion_titulo, p.descripcion AS publicacion_descripcion,
                p.estado AS publicacion_estado, p.cantidad_necesaria, p.cantidad_recibida,
                DATE_FORMAT(p.fecha_limite, '%Y-%m-%d') AS fecha_limite,
                o.nombre AS organizacion_nombre, o.direccion AS organizacion_direccion,
                c.nombre AS categoria
            FROM donacion d
            JOIN publicacion p ON p.id_publicacion = d.id_publicacion
            JOIN organizacion o ON o.id_organizacion = p.id_organizacion
            LEFT JOIN articulo a ON a.id_articulo = p.id_articulo
            LEFT JOIN categoria_articulo c ON c.id_categoria = a.id_categoria
            WHERE (%s IS NULL OR d.id_donante = %s)
            ORDER BY d.fecha_donacion DESC, d.id_donacion DESC
            LIMIT 50
            """
            cursor.execute(fallback_sql, (id_donante, id_donante))
            donaciones = cursor.fetchall()

        return jsonify(donaciones), 200

    except Exception as e:
        return jsonify({
            "error": "Error al listar donaciones",
            "detalle": str(e)
        }), 500
        
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Ruta para obtener el detalle de una donación por su ID
@donacion_bp.route("/donaciones/<int:id_donacion>", methods=["GET"])
@token_required
def obtener_detalle_donacion(id_donacion):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
        SELECT
            d.id_donacion,
            d.id_donante,
            d.id_publicacion,
            d.descripcion,
            d.nombre_contacto,
            d.telefono_contacto,
            DATE_FORMAT(d.hora_preferida, '%H:%i') AS hora_preferida,
            d.nota,
            d.cantidad_donada,
            DATE_FORMAT(d.fecha_donacion, '%Y-%m-%d') AS fecha_donacion,
            p.titulo AS publicacion_titulo,
            p.descripcion AS publicacion_descripcion,
            p.estado AS publicacion_estado,
            p.cantidad_necesaria,
            p.cantidad_recibida,
            DATE_FORMAT(p.fecha_publicacion, '%Y-%m-%d') AS fecha_publicacion,
            DATE_FORMAT(p.fecha_limite, '%Y-%m-%d') AS fecha_limite,
            o.nombre AS organizacion_nombre,
            o.direccion AS organizacion_direccion,
            c.nombre AS categoria,
            u.nombre AS donante_nombre,
            u.correo AS donante_correo,
            u.telefono AS donante_telefono
        FROM donacion d
        JOIN publicacion p ON p.id_publicacion = d.id_publicacion
        JOIN organizacion o ON o.id_organizacion = p.id_organizacion
        JOIN usuario u ON u.id_usuario = d.id_donante
        LEFT JOIN articulo a ON a.id_articulo = p.id_articulo
        LEFT JOIN categoria_articulo c ON c.id_categoria = a.id_categoria
        WHERE d.id_donacion = %s
        """

        try:
            cursor.execute(sql, (id_donacion,))
            donacion = cursor.fetchone()
        except Exception:
            logging.exception("Error fetching donacion detalle with enriched fields, falling back to simpler query for id %s", id_donacion)
            fallback_sql = """
            SELECT
                d.id_donacion,
                d.id_donante,
                d.id_publicacion,
                d.descripcion,
                DATE_FORMAT(d.fecha_donacion, '%Y-%m-%d') AS fecha_donacion,
                p.titulo AS publicacion_titulo,
                p.descripcion AS publicacion_descripcion,
                p.estado AS publicacion_estado,
                p.cantidad_necesaria,
                p.cantidad_recibida,
                DATE_FORMAT(p.fecha_publicacion, '%Y-%m-%d') AS fecha_publicacion,
                DATE_FORMAT(p.fecha_limite, '%Y-%m-%d') AS fecha_limite,
                o.nombre AS organizacion_nombre,
                o.direccion AS organizacion_direccion,
                c.nombre AS categoria,
                u.nombre AS donante_nombre,
                u.correo AS donante_correo,
                u.telefono AS donante_telefono
            FROM donacion d
            JOIN publicacion p ON p.id_publicacion = d.id_publicacion
            JOIN organizacion o ON o.id_organizacion = p.id_organizacion
            JOIN usuario u ON u.id_usuario = d.id_donante
            LEFT JOIN articulo a ON a.id_articulo = p.id_articulo
            LEFT JOIN categoria_articulo c ON c.id_categoria = a.id_categoria
            WHERE d.id_donacion = %s
            """
            cursor.execute(fallback_sql, (id_donacion,))
            donacion = cursor.fetchone()

        if not donacion:
            return jsonify({"error": "Donación no encontrada"}), 404

        if request.usuario_rol != "administrador" and donacion["id_donante"] != request.usuario_id:
            return jsonify({"error": "No autorizado para consultar esta donacion"}), 403

        articulos_sql = """
        SELECT
            a.id_articulo,
            a.nombre AS articulo,
            pa.descripcion_detalle,
            pa.cantidad
        FROM publicacion_articulo pa
        JOIN articulo a ON a.id_articulo = pa.id_articulo
        WHERE pa.id_publicacion = %s
        ORDER BY a.nombre
        """

        cursor.execute(articulos_sql, (donacion["id_publicacion"],))
        donacion["articulos"] = cursor.fetchall()

        return jsonify(donacion), 200

    except Exception as e:
        return jsonify({
            "error": "Error al obtener el detalle de la donación",
            "detalle": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Ruta para registrar una donación
@donacion_bp.route("/donaciones", methods=["POST"])
@token_required
def crear_donacion():
    conn = None
    cursor = None

    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No se enviaron datos"}), 400

        id_donante = request.usuario_id
        id_publicacion = data.get("id_publicacion")
        descripcion = data.get("descripcion")
        nombre_contacto = data.get("nombre_contacto")
        telefono_contacto = data.get("telefono_contacto")
        hora_preferida = data.get("hora_preferida")
        nota = data.get("nota")
        fecha_donacion = data.get("fecha_donacion")
        cantidad_donada = data.get("cantidad_donada")

        if (
            not id_publicacion
            or not descripcion
            or not nombre_contacto
            or not telefono_contacto
            or not hora_preferida
            or not fecha_donacion
            or not cantidad_donada
        ):
            return jsonify({"error": "Faltan datos obligatorios"}), 400

        try:
            cantidad_donada = int(cantidad_donada)
        except (ValueError, TypeError):
            return jsonify({"error": "cantidad_donada debe ser un número entero"}), 400

        if cantidad_donada <= 0:
            return jsonify({"error": "La cantidad donada debe ser mayor a 0"}), 400

        try:
            datetime.strptime(str(fecha_donacion), "%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "fecha_donacion debe tener formato YYYY-MM-DD"}), 400

        try:
            datetime.strptime(str(hora_preferida), "%H:%M")
        except ValueError:
            return jsonify({"error": "hora_preferida debe tener formato HH:MM"}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id_usuario FROM donante WHERE id_usuario = %s", (id_donante,))
        donante = cursor.fetchone()
        if not donante:
            return jsonify({"error": "El donante no existe"}), 404

        # Verificar que exista la publicación
        cursor.execute(
            """
            SELECT
                id_publicacion,
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
            return jsonify({"error": "La publicación no existe"}), 404


        # Validaciones adicionales
        if publicacion["estado"] != "activa":
            return jsonify({
                "error": "La campaña ya finalizo"
            }), 400
        
        #Para que no excesa
        restante = (
            publicacion["cantidad_necesaria"]
            - publicacion["cantidad_recibida"]
        )
        if restante <= 0:
            return jsonify({
                "error": "Ya alcanzamos la meta, ya no se aceptan más donaciones."
            }), 400
        
        
        if cantidad_donada > restante:
            return jsonify({
                "error": f"La cantidad supera lo restante disponible ({restante})"
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
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(insert_sql, (
            id_donante,
            id_publicacion,
            descripcion,
            nombre_contacto.strip(),
            telefono_contacto.strip(),
            hora_preferida,
            nota.strip() if isinstance(nota, str) and nota.strip() else None,
            cantidad_donada,
            fecha_donacion
        ))

        id_donacion = cursor.lastrowid

        # Actualizar cantidad recibida de la publicación
        update_sql = """
        UPDATE publicacion
        SET
            cantidad_recibida = cantidad_recibida + %s,
            estado = CASE
                WHEN (cantidad_recibida + %s) >= cantidad_necesaria THEN 'finalizada'
                ELSE estado
            END
        WHERE id_publicacion = %s
        """
        cursor.execute(update_sql, (cantidad_donada, cantidad_donada, id_publicacion))

        conn.commit()

        return jsonify({
            "message": "Donación registrada y publicación actualizada",
            "id_donacion": id_donacion
        }), 201

    except Exception:
        if conn:
            conn.rollback()
        return jsonify({
            "error": "Error al registrar la donación"
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
    


# Ruta para obtener el estado de una donación por su ID
@donacion_bp.route("/donaciones/<int:id_donacion>/estado", methods=["GET"])
@token_required
def obtener_estado_donacion(id_donacion):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
        SELECT d.id_donacion, d.id_donante, d.id_publicacion, p.estado
        FROM donacion d
        JOIN publicacion p ON p.id_publicacion = d.id_publicacion
        WHERE d.id_donacion = %s
        """
        cursor.execute(sql, (id_donacion,))
        donacion = cursor.fetchone()

        if not donacion:
            return jsonify({"error": "Donación no encontrada"}), 404

        if request.usuario_rol != "administrador" and donacion["id_donante"] != request.usuario_id:
            return jsonify({"error": "No autorizado para consultar esta donacion"}), 403

        return jsonify(donacion), 200

    except Exception as e:
        return jsonify({
            "error": "Error al obtener el estado de la donación",
            "detalle": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
