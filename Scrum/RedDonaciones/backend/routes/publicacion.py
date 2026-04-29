# Aquí se definen las rutas relacionadas con las publicaciones

from flask import Blueprint, request, jsonify
from datetime import datetime
import logging
from db.connection import get_db_connection

# Log exceptions for easier debugging without leaking details to clients
logging.basicConfig(level=logging.INFO)

publicacion_bp = Blueprint("publicacion", __name__)

# Ruta para obtener la lista de publicaciones
@publicacion_bp.route("/publicaciones", methods=["GET"])
def listar_publicaciones():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
        SELECT 
            p.id_publicacion,
            p.titulo,
            p.descripcion,
            p.cantidad_necesaria,
            p.cantidad_recibida,
            p.estado,
            p.fecha_publicacion,
            p.fecha_limite,

            o.nombre AS organizacion,
            o.direccion AS direccion,

            c.nombre AS categoria

        FROM publicacion p
        INNER JOIN organizacion o 
            ON p.id_organizacion = o.id_organizacion

        LEFT JOIN articulo a 
            ON p.id_articulo = a.id_articulo

        LEFT JOIN categoria_articulo c 
            ON a.id_categoria = c.id_categoria
        """

        cursor.execute(sql)
        publicaciones = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(publicaciones)

    except Exception as e:
        print("ERROR EN JOIN:", e)  
        return jsonify({"error": str(e)}), 500


# Ruta para crear una nueva publicación
@publicacion_bp.route("/publicaciones", methods=["POST"])
def crear_publicacion():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No se enviaron datos"}), 400

        campos_requeridos = [
            "id_intermediario",
            "id_organizacion",
            "id_articulo",
            "titulo",
            "descripcion",
            "cantidad_necesaria",
            "fecha_publicacion",
            "fecha_limite",
            "estado"
        ]

        for campo in campos_requeridos:
            if data.get(campo) in [None, ""]:
                return jsonify({"error": f"Falta el campo obligatorio: {campo}"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        sql = """
        INSERT INTO publicacion (
            id_intermediario, id_organizacion, id_articulo,
            titulo, descripcion, cantidad_necesaria,
            cantidad_recibida, fecha_publicacion,
            fecha_limite, estado
        )
        VALUES (%s, %s, %s, %s, %s, %s, 0, %s, %s, %s)
        """

        cursor.execute(sql, (
            data.get("id_intermediario"),
            data.get("id_organizacion"),
            data.get("id_articulo"),
            data.get("titulo"),
            data.get("descripcion"),
            data.get("cantidad_necesaria"),
            data.get("fecha_publicacion"),
            data.get("fecha_limite"),
            data.get("estado")
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Publicación creada"}), 201

    except Exception as e:
        return jsonify({
            "error": "Error al crear publicación",
            "detalle": str(e)
        }), 500


# Ruta para obtener una publicación por su ID (detalle)
@publicacion_bp.route("/publicaciones/<int:id>", methods=["GET"])
def obtener_publicacion(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        publicacion_sql = """
        SELECT 
            p.id_publicacion,
            p.id_articulo,
            p.titulo,
            p.descripcion,
            p.cantidad_necesaria,
            p.cantidad_recibida,
            p.estado,
            DATE_FORMAT(p.fecha_publicacion, '%Y-%m-%d') AS fecha_publicacion,
            DATE_FORMAT(p.fecha_limite, '%Y-%m-%d') AS fecha_limite,

            o.nombre AS organizacion,
            o.direccion,
            c.nombre AS categoria

        FROM publicacion p
        INNER JOIN organizacion o 
            ON p.id_organizacion = o.id_organizacion

        LEFT JOIN articulo a
            ON p.id_articulo = a.id_articulo

        LEFT JOIN categoria_articulo c 
            ON a.id_categoria = c.id_categoria

        WHERE p.id_publicacion = %s
        """

        cursor.execute(publicacion_sql, (id,))
        publicacion = cursor.fetchone()

        if not publicacion:
            cursor.close()
            conn.close()
            return jsonify({"error": "Publicación no encontrada"}), 404

        articulos_sql = """
        SELECT
            a.nombre AS articulo,
            c.nombre AS categoria,
            COALESCE(pa.descripcion_detalle, a.descripcion) AS descripcion_detalle,
            pa.cantidad
        FROM publicacion_articulo pa
        INNER JOIN articulo a ON pa.id_articulo = a.id_articulo
        LEFT JOIN categoria_articulo c ON a.id_categoria = c.id_categoria
        WHERE pa.id_publicacion = %s
        ORDER BY a.nombre
        """
        try:
            cursor.execute(articulos_sql, (id,))
            articulos = cursor.fetchall()
        except Exception:
            logging.exception("Error querying publicacion_articulo for id %s", id)
            articulos = []

        if not articulos and publicacion.get("id_articulo"):
            cursor.execute(
                """
                SELECT
                    a.nombre AS articulo,
                    c.nombre AS categoria,
                    a.descripcion AS descripcion_detalle
                FROM articulo a
                LEFT JOIN categoria_articulo c ON a.id_categoria = c.id_categoria
                WHERE a.id_articulo = %s
                """,
                (publicacion["id_articulo"],)
            )
            articulo_principal = cursor.fetchone()
            if articulo_principal:
                articulos = [{
                    "articulo": articulo_principal["articulo"],
                    "categoria": articulo_principal.get("categoria"),
                    "descripcion_detalle": articulo_principal.get("descripcion_detalle") or publicacion["descripcion"],
                    "cantidad": publicacion["cantidad_necesaria"]
                }]

        if not articulos:
            articulos = [{
                "articulo": "Sin artículo definido",
                "categoria": publicacion.get("categoria"),
                "descripcion_detalle": publicacion["descripcion"],
                "cantidad": publicacion["cantidad_necesaria"]
            }]

        resultados = []
        for articulo in articulos:
            fila = {
                "id_publicacion": publicacion["id_publicacion"],
                "titulo": publicacion["titulo"],
                "descripcion": publicacion["descripcion"],
                "cantidad_necesaria": publicacion["cantidad_necesaria"],
                "cantidad_recibida": publicacion["cantidad_recibida"],
                "estado": publicacion["estado"],
                "fecha_publicacion": publicacion["fecha_publicacion"],
                "fecha_limite": publicacion["fecha_limite"],
                "organizacion": publicacion["organizacion"],
                "direccion": publicacion["direccion"],
                "categoria": articulo.get("categoria") or publicacion.get("categoria") or "Sin categoria",
                "articulo": articulo.get("articulo") or "Sin artículo definido",
                "descripcion_detalle": articulo.get("descripcion_detalle") or publicacion["descripcion"],
                "cantidad": articulo.get("cantidad") or publicacion["cantidad_necesaria"]
            }
            resultados.append(fila)

        cursor.close()
        conn.close()

        return jsonify(resultados), 200

    except Exception:
        return jsonify({
            "error": "Error al obtener la publicación"
        }), 500


# Ruta para obtener donaciones (filtro opcional por donante)
@publicacion_bp.route("/donaciones", methods=["GET"])
def listar_donaciones():
    id_donante = request.args.get("id_donante")

    if id_donante is not None:
        try:
            id_donante = int(id_donante)
        except ValueError:
            return jsonify({"error": "id_donante debe ser un entero"}), 400

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
            DATE_FORMAT(p.fecha_limite, '%Y-%m-%d') AS fecha_limite,
            o.nombre AS organizacion_nombre,
            o.direccion AS organizacion_direccion,
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
            logging.exception("Error listing donaciones with enriched fields, falling back to simpler query")
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
                DATE_FORMAT(p.fecha_limite, '%Y-%m-%d') AS fecha_limite,
                o.nombre AS organizacion_nombre,
                o.direccion AS organizacion_direccion,
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

        cursor.close()
        conn.close()

        return jsonify(donaciones), 200

    except Exception as e:
        return jsonify({
            "error": "Error al listar donaciones",
            "detalle": str(e)
        }), 500


# Ruta para obtener el detalle de una donación por su ID
@publicacion_bp.route("/donaciones/<int:id_donacion>", methods=["GET"])
def obtener_detalle_donacion(id_donacion):
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
            cursor.close()
            conn.close()
            return jsonify({"error": "Donación no encontrada"}), 404

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

        cursor.close()
        conn.close()

        return jsonify(donacion), 200

    except Exception as e:
        return jsonify({
            "error": "Error al obtener el detalle de la donación",
            "detalle": str(e)
        }), 500


# Ruta para registrar una donación
@publicacion_bp.route("/donaciones", methods=["POST"])
def crear_donacion():
    conn = None
    cursor = None

    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No se enviaron datos"}), 400

        id_donante = data.get("id_donante")
        id_publicacion = data.get("id_publicacion")
        descripcion = data.get("descripcion")
        nombre_contacto = data.get("nombre_contacto")
        telefono_contacto = data.get("telefono_contacto")
        hora_preferida = data.get("hora_preferida")
        nota = data.get("nota")
        fecha_donacion = data.get("fecha_donacion")
        cantidad_donada = data.get("cantidad_donada")

        if (
            not id_donante
            or not id_publicacion
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
            SELECT id_publicacion, cantidad_necesaria, cantidad_recibida
            FROM publicacion
            WHERE id_publicacion = %s
            """,
            (id_publicacion,)
        )
        publicacion = cursor.fetchone()

        if not publicacion:
            return jsonify({"error": "La publicación no existe"}), 404

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
@publicacion_bp.route("/donaciones/<int:id_donacion>/estado", methods=["GET"])
def obtener_estado_donacion(id_donacion):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
        SELECT d.id_donacion, d.id_publicacion, p.estado
        FROM donacion d
        JOIN publicacion p ON p.id_publicacion = d.id_publicacion
        WHERE d.id_donacion = %s
        """
        cursor.execute(sql, (id_donacion,))
        donacion = cursor.fetchone()

        cursor.close()
        conn.close()

        if donacion:
            return jsonify(donacion), 200
        else:
            return jsonify({"error": "Donación no encontrada"}), 404

    except Exception as e:
        return jsonify({
            "error": "Error al obtener el estado de la donación",
            "detalle": str(e)
        }), 500