# Endpoints de reportes/estadisticas: solo administrador e intermediario.
from flask import Blueprint, jsonify, request
from auth_utils import (
    token_required,
    _obtener_organizacion_actual_intermediario,
    _organizacion_verificada,
)
from db.connection import db_cursor, get_db_connection
from services.publicacion_service import validar_fecha_yyyy_mm_dd
from services.reporte_service import (
    ESTADOS_DONACION,
    contar_donaciones_por_estado,
    contar_donantes_unicos,
    contar_donaciones_por_campana,
    listar_detalle_donaciones,
)

reporte_bp = Blueprint("reporte", __name__)

PAGE_SIZE_MAXIMO = 100


def _resolver_alcance_organizacion():
    """Determina el id_organizacion permitido para el usuario actual, o un error 403/500."""
    if request.usuario_rol == "administrador":
        id_organizacion = request.args.get("id_organizacion")
        if id_organizacion:
            try:
                return int(id_organizacion), None
            except ValueError:
                return None, (jsonify({"error": "id_organizacion debe ser un entero"}), 400)
        return None, None

    if request.usuario_rol == "intermediario":
        id_organizacion = _obtener_organizacion_actual_intermediario(request.usuario_id)
        if id_organizacion is None:
            return None, (jsonify({"error": "El usuario no esta asociado a una organizacion"}), 403)
        if not _organizacion_verificada(id_organizacion):
            return None, (jsonify({"error": "La organizacion no esta verificada"}), 403)
        return id_organizacion, None

    return None, (jsonify({"error": "Acceso denegado"}), 403)


def _validar_filtros_fecha():
    """Valida fecha_inicio/fecha_fin de la query string; retorna (fecha_inicio, fecha_fin, error)."""
    fecha_inicio = request.args.get("fecha_inicio")
    fecha_fin = request.args.get("fecha_fin")

    if fecha_inicio and not validar_fecha_yyyy_mm_dd(fecha_inicio):
        return None, None, (jsonify({"error": "fecha_inicio debe tener formato YYYY-MM-DD"}), 400)
    if fecha_fin and not validar_fecha_yyyy_mm_dd(fecha_fin):
        return None, None, (jsonify({"error": "fecha_fin debe tener formato YYYY-MM-DD"}), 400)
    if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
        return None, None, (jsonify({"error": "fecha_fin no puede ser anterior a fecha_inicio"}), 400)

    return fecha_inicio, fecha_fin, None


@reporte_bp.route("/reportes/resumen", methods=["GET"])
@token_required
def obtener_resumen_reportes():
    id_organizacion, error_alcance = _resolver_alcance_organizacion()
    if error_alcance:
        return error_alcance

    fecha_inicio, fecha_fin, error_fecha = _validar_filtros_fecha()
    if error_fecha:
        return error_fecha

    try:
        with db_cursor(connection_factory=get_db_connection) as (conn, cursor):
            por_estado = contar_donaciones_por_estado(cursor, fecha_inicio, fecha_fin, id_organizacion)
            donantes_unicos = contar_donantes_unicos(cursor, fecha_inicio, fecha_fin, id_organizacion)
            por_campana = contar_donaciones_por_campana(cursor, fecha_inicio, fecha_fin, id_organizacion)

        return jsonify({
            "por_estado": por_estado,
            "donantes_unicos": donantes_unicos,
            "por_campana": por_campana,
        }), 200

    except Exception:
        return jsonify({"error": "No se pudo generar el resumen de reportes"}), 500


@reporte_bp.route("/reportes/detalle", methods=["GET"])
@token_required
def obtener_detalle_reportes():
    id_organizacion, error_alcance = _resolver_alcance_organizacion()
    if error_alcance:
        return error_alcance

    fecha_inicio, fecha_fin, error_fecha = _validar_filtros_fecha()
    if error_fecha:
        return error_fecha

    estado = request.args.get("estado")
    if estado and estado not in ESTADOS_DONACION:
        return jsonify({"error": "estado invalido"}), 400

    id_publicacion = request.args.get("id_publicacion")
    if id_publicacion:
        try:
            id_publicacion = int(id_publicacion)
        except ValueError:
            return jsonify({"error": "id_publicacion debe ser un entero"}), 400

    try:
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", 20))
    except ValueError:
        return jsonify({"error": "page y page_size deben ser enteros"}), 400

    if page < 1 or page_size < 1:
        return jsonify({"error": "page y page_size deben ser mayores a 0"}), 400
    page_size = min(page_size, PAGE_SIZE_MAXIMO)

    try:
        with db_cursor(connection_factory=get_db_connection) as (conn, cursor):
            resultado = listar_detalle_donaciones(
                cursor, fecha_inicio, fecha_fin, id_organizacion, estado, id_publicacion, page, page_size
            )

        return jsonify(resultado), 200

    except Exception:
        return jsonify({"error": "No se pudo obtener el detalle de reportes"}), 500
