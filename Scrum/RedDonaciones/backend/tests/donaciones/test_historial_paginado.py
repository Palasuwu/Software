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
