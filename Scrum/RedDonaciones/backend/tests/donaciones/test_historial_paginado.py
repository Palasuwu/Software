import pytest

from auth_utils import generate_token
from tests.helpers import crear_conexion_mock


@pytest.fixture
def historial(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "test-secret-key-at-least-32-chars-long")
    monkeypatch.setattr("auth_utils._obtener_usuario_actual", lambda usuario: {
        "id_usuario": usuario, "rol": "donante", "activo": 1
    })
    conexion = crear_conexion_mock(
        resultados_fetchone=[{"total": 61, "activas": 42, "finalizadas": 19}],
        resultado_fetchall=[{"id_donacion": 51}]
    )
    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conexion)
    headers = {"Authorization": f"Bearer {generate_token(7, 'donante')}"}
    return conexion.cursor_obj, headers


def test_pagina_mas_alla_de_las_primeras_50(client, historial):
    cursor, headers = historial
    respuesta = client.get("/donaciones?page=6&per_page=10", headers=headers)

    assert respuesta.status_code == 200
    assert respuesta.get_json() == {
        "donaciones": [{"id_donacion": 51}],
        "page": 6, "per_page": 10, "total": 61, "total_pages": 7,
        "resumen": {"total": 61, "activas": 42, "finalizadas": 19}
    }
    sql, parametros = cursor.executed_queries[-1]
    assert "ORDER BY d.fecha_donacion DESC, d.id_donacion DESC" in sql
    assert "LIMIT %s OFFSET %s" in sql
    assert parametros == (7, 7, 10, 50)


def test_filtra_antes_de_paginar_y_conserva_el_resumen_global(client, historial):
    cursor, headers = historial
    respuesta = client.get(
        "/donaciones?page=2&per_page=10&estado_publicacion=finalizada", headers=headers
    )
    datos = respuesta.get_json()

    assert datos["total"] == 19
    assert datos["total_pages"] == 2
    assert datos["resumen"]["total"] == 61
    sql, parametros = cursor.executed_queries[-1]
    assert "AND p.estado = %s" in sql
    assert parametros == (7, 7, "finalizada", 10, 10)


@pytest.mark.parametrize("consulta", [
    "page=0", "page=-1", "page=abc", "page=1.5", "page=1000000001",
    "per_page=0", "per_page=51", "per_page=abc", "per_page=",
    "estado_publicacion=cancelada", "estado_publicacion=' OR 1=1"
])
def test_rechaza_parametros_invalidos_antes_de_consultar(client, historial, consulta):
    cursor, headers = historial
    respuesta = client.get(f"/donaciones?{consulta}", headers=headers)
    assert respuesta.status_code == 400
    assert cursor.executed_queries == []


def test_reubica_pagina_inexistente_en_la_ultima(client, historial):
    cursor, headers = historial
    datos = client.get("/donaciones?page=999", headers=headers).get_json()
    assert datos["page"] == 7
    assert cursor.executed_queries[-1][1] == (7, 7, 10, 60)


def test_no_permite_consultar_el_historial_ajeno(client, historial):
    cursor, headers = historial
    respuesta = client.get("/donaciones?id_donante=8&page=1", headers=headers)
    assert respuesta.status_code == 403
    assert cursor.executed_queries == []


def test_conserva_respuesta_anterior_sin_parametros_de_paginacion(client, historial):
    cursor, headers = historial
    respuesta = client.get("/donaciones", headers=headers)
    assert respuesta.get_json() == [{"id_donacion": 51}]
    assert len(cursor.executed_queries) == 1
    assert "LIMIT 50" in cursor.executed_queries[0][0]


def test_historial_vacio(client, historial):
    cursor, headers = historial
    cursor.resultados_fetchone = [{"total": 0, "activas": 0, "finalizadas": 0}]
    cursor.resultado_fetchall = []
    datos = client.get("/donaciones?page=9", headers=headers).get_json()
    assert datos["donaciones"] == []
    assert datos["page"] == 1
    assert datos["total"] == datos["total_pages"] == 0
    assert cursor.executed_queries[-1][1] == (7, 7, 10, 0)


@pytest.mark.parametrize("id_donante,esperado", [(None, None), (8, 8)])
def test_administrador_puede_paginar_y_consultar_otro_donante(
    client, historial, monkeypatch, id_donante, esperado
):
    cursor, _ = historial
    monkeypatch.setattr("auth_utils._obtener_usuario_actual", lambda usuario: {
        "id_usuario": usuario, "rol": "administrador", "activo": 1
    })
    headers = {"Authorization": f"Bearer {generate_token(3, 'administrador')}"}
    consulta = "/donaciones?page=1"
    if id_donante is not None:
        consulta += f"&id_donante={id_donante}"
    assert client.get(consulta, headers=headers).status_code == 200
    assert cursor.executed_queries[0][1] == (esperado, esperado)
    assert cursor.executed_queries[-1][1] == (esperado, esperado, 10, 0)


def test_intermediario_no_puede_usar_el_historial_del_donante(client, historial, monkeypatch):
    cursor, _ = historial
    monkeypatch.setattr("auth_utils._obtener_usuario_actual", lambda usuario: {
        "id_usuario": usuario, "rol": "intermediario", "activo": 1
    })
    headers = {"Authorization": f"Bearer {generate_token(3, 'intermediario')}"}
    assert client.get("/donaciones?page=1", headers=headers).status_code == 403
    assert cursor.executed_queries == []


def test_error_de_base_de_datos_no_expone_detalles(client, historial):
    cursor, headers = historial
    cursor.error = RuntimeError("Detalle interno de conexión")
    respuesta = client.get("/donaciones?page=1", headers=headers)
    assert respuesta.status_code == 500
    assert respuesta.get_json() == {"error": "Error al listar donaciones"}
