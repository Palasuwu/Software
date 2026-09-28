# Endpoints de reportes/estadisticas: solo administrador e intermediario.
import logging

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


def _leer_id_positivo(nombre):
    valor = request.args.get(nombre)
    if valor is None:
        return None, None

    if not valor.strip():
        return None, (jsonify({"error": f"{nombre} debe ser un entero positivo"}), 400)

    try:
        valor = int(valor)
    except ValueError:
        return None, (jsonify({"error": f"{nombre} debe ser un entero"}), 400)

    if valor <= 0:
        return None, (jsonify({"error": f"{nombre} debe ser positivo"}), 400)

    return valor, None


def _leer_filtros_fecha():
    fecha_inicio = request.args.get("fecha_inicio")
    fecha_fin = request.args.get("fecha_fin")

    if fecha_inicio is not None and not fecha_inicio.strip():
        return None, None, (jsonify({"error": "fecha_inicio no puede estar vacia"}), 400)
    if fecha_fin is not None and not fecha_fin.strip():
        return None, None, (jsonify({"error": "fecha_fin no puede estar vacia"}), 400)
    if fecha_inicio and not validar_fecha_yyyy_mm_dd(fecha_inicio):
        return None, None, (jsonify({"error": "fecha_inicio debe tener formato YYYY-MM-DD"}), 400)
    if fecha_fin and not validar_fecha_yyyy_mm_dd(fecha_fin):
        return None, None, (jsonify({"error": "fecha_fin debe tener formato YYYY-MM-DD"}), 400)
    if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
        return None, None, (jsonify({"error": "fecha_fin no puede ser anterior a fecha_inicio"}), 400)

    return fecha_inicio, fecha_fin, None


def _leer_estado():
    estado = request.args.get("estado")
    if estado is not None and not estado.strip():
        return None, (jsonify({"error": "estado no puede estar vacio"}), 400)
    if estado and estado not in ESTADOS_DONACION:
        return None, (jsonify({"error": "estado invalido"}), 400)
    return estado, None


def _leer_paginacion():
    valores = {
        "page": request.args.get("page", "1"),
        "page_size": request.args.get("page_size", "20"),
    }

    if any(not valor.strip() for valor in valores.values()):
        return None, None, (jsonify({"error": "page y page_size deben ser enteros"}), 400)

    try:
        page = int(valores["page"])
        page_size = int(valores["page_size"])
    except ValueError:
        return None, None, (jsonify({"error": "page y page_size deben ser enteros"}), 400)

    if page < 1 or page_size < 1:
        return None, None, (jsonify({"error": "page y page_size deben ser mayores a 0"}), 400)

    return page, min(page_size, PAGE_SIZE_MAXIMO), None


def _resolver_alcance_organizacion():
    """Determina el id_organizacion permitido para el usuario actual, o un error 403/500."""
    if request.usuario_rol == "administrador":
        id_organizacion, error = _leer_id_positivo("id_organizacion")
        return id_organizacion, error

    if request.usuario_rol == "intermediario":
        id_organizacion = _obtener_organizacion_actual_intermediario(request.usuario_id)
        if id_organizacion is None:
            return None, (jsonify({"error": "El usuario no esta asociado a una organizacion"}), 403)
        if not _organizacion_verificada(id_organizacion):
            return None, (jsonify({"error": "La organizacion no esta verificada"}), 403)
        return id_organizacion, None

    return None, (jsonify({"error": "Acceso denegado"}), 403)


@reporte_bp.route("/reportes/resumen", methods=["GET"])
@token_required
def obtener_resumen_reportes():
    try:
        id_organizacion, error_alcance = _resolver_alcance_organizacion()
        if error_alcance:
            return error_alcance

        fecha_inicio, fecha_fin, error_fecha = _leer_filtros_fecha()
        if error_fecha:
            return error_fecha

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
        logging.exception("Error al generar el resumen de reportes")
        return jsonify({"error": "No se pudo generar el resumen de reportes"}), 500


@reporte_bp.route("/reportes/detalle", methods=["GET"])
@token_required
def obtener_detalle_reportes():
    try:
        id_organizacion, error_alcance = _resolver_alcance_organizacion()
        if error_alcance:
            return error_alcance

        fecha_inicio, fecha_fin, error_fecha = _leer_filtros_fecha()
        if error_fecha:
            return error_fecha

        estado, error_estado = _leer_estado()
        if error_estado:
            return error_estado

        id_publicacion, error_publicacion = _leer_id_positivo("id_publicacion")
        if error_publicacion:
            return error_publicacion

        page, page_size, error_paginacion = _leer_paginacion()
        if error_paginacion:
            return error_paginacion

        with db_cursor(connection_factory=get_db_connection) as (conn, cursor):
            resultado = listar_detalle_donaciones(
                cursor, fecha_inicio, fecha_fin, id_organizacion, estado, id_publicacion, page, page_size
            )

        return jsonify(resultado), 200

    except Exception:
        logging.exception("Error al obtener el detalle de reportes")
        return jsonify({"error": "No se pudo obtener el detalle de reportes"}), 500
