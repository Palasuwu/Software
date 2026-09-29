import pytest


@pytest.fixture
def admin(sesion):
    return sesion("administrador", id_usuario=1)


def pagina(client, headers, datos, page, page_size):
    org_a = datos["organizaciones"]["A"]
    response = client.get(f"/reportes/detalle?id_organizacion={org_a}&page={page}&page_size={page_size}", headers=headers)
    assert response.status_code == 200
    return response.get_json()


def test_divide_los_resultados_en_paginas(client, admin, datos_reportes):
    primera = pagina(client, admin, datos_reportes, 1, 4)
    segunda = pagina(client, admin, datos_reportes, 2, 4)

    assert (primera["total"], primera["total_paginas"], primera["page"], primera["page_size"]) == (6, 2, 1, 4)
    assert len(primera["items"]) == 4
    assert len(segunda["items"]) == 2
    ids = [fila["id_donacion"] for fila in primera["items"] + segunda["items"]]
    assert sorted(ids) == sorted(datos_reportes["donaciones"][:6])


def test_ordena_por_fecha_descendente_y_desempata_por_id(client, admin, datos_reportes):
    donaciones = datos_reportes["donaciones"]

    items = pagina(client, admin, datos_reportes, 1, 20)["items"]

    assert [fila["fecha_donacion"] for fila in items] == [
        "2019-02-15", "2019-02-15", "2019-02-01", "2019-01-31", "2019-01-15", "2019-01-01"
    ]
    assert [fila["id_donacion"] for fila in items[:2]] == [donaciones[5], donaciones[4]]


def test_pagina_fuera_de_rango_devuelve_lista_vacia(client, admin, datos_reportes):
    body = pagina(client, admin, datos_reportes, 3, 4)

    assert body["items"] == []
    assert body["total"] == 6
    assert body["total_paginas"] == 2


def test_page_size_exacto_da_una_sola_pagina(client, admin, datos_reportes):
    body = pagina(client, admin, datos_reportes, 1, 6)

    assert body["total_paginas"] == 1
    assert len(body["items"]) == 6


def test_page_size_se_limita_a_100(client, admin, datos_reportes):
    body = pagina(client, admin, datos_reportes, 1, 1000)

    assert body["page_size"] == 100
    assert body["total_paginas"] == 1


def test_sin_parametros_usa_la_pagina_1_de_20(client, admin, datos_reportes):
    org_a = datos_reportes["organizaciones"]["A"]

    body = client.get(f"/reportes/detalle?id_organizacion={org_a}", headers=admin).get_json()

    assert (body["page"], body["page_size"]) == (1, 20)
