import pytest


ESTADOS = ["pendiente", "recibida", "en_proceso", "entregada", "rechazada"]


@pytest.fixture
def admin(sesion):
    return sesion("administrador", id_usuario=1)


def por_estado(body):
    return {fila["estado"]: (fila["total"], fila["total_donado"]) for fila in body["por_estado"]}


def por_campana(body):
    return {fila["id_publicacion"]: (fila["total_donaciones"], fila["total_donado"]) for fila in body["por_campana"]}


def resumen(client, headers, **filtros):
    query = "&".join(f"{clave}={valor}" for clave, valor in filtros.items())
    response = client.get(f"/reportes/resumen?{query}", headers=headers)
    assert response.status_code == 200
    return response.get_json()


def detalle(client, headers, **filtros):
    query = "&".join(f"{clave}={valor}" for clave, valor in filtros.items())
    response = client.get(f"/reportes/detalle?{query}", headers=headers)
    assert response.status_code == 200
    return response.get_json()


def test_resumen_de_una_organizacion_con_datos_conocidos(client, admin, datos_reportes):
    org_a = datos_reportes["organizaciones"]["A"]
    campanas = datos_reportes["campanas"]

    body = resumen(client, admin, id_organizacion=org_a)

    assert por_estado(body) == {
        "pendiente": (1, 5),
        "recibida": (1, 2),
        "en_proceso": (1, 4),
        "entregada": (2, 13),
        "rechazada": (1, 7),
    }
    assert body["donantes_unicos"] == 3
    assert por_campana(body) == {campanas["A1"]: (6, 31), campanas["A2"]: (0, 0)}


def test_siempre_devuelve_los_cinco_estados_en_orden(client, admin, datos_reportes):
    body = resumen(client, admin, id_organizacion=datos_reportes["organizaciones"]["B"])

    assert [fila["estado"] for fila in body["por_estado"]] == ESTADOS
    assert por_estado(body)["recibida"] == (0, 0)


def test_los_totales_son_numeros_y_no_texto(client, admin, datos_reportes):
    body = resumen(client, admin, id_organizacion=datos_reportes["organizaciones"]["A"])

    for fila in body["por_estado"]:
        assert isinstance(fila["total"], int)
        assert isinstance(fila["total_donado"], int)
    for fila in body["por_campana"]:
        assert isinstance(fila["total_donaciones"], int)
        assert isinstance(fila["total_donado"], int)
    assert isinstance(body["donantes_unicos"], int)


def test_el_rango_de_fechas_incluye_ambos_extremos(client, admin, datos_reportes):
    org_a = datos_reportes["organizaciones"]["A"]

    body = resumen(client, admin, id_organizacion=org_a, fecha_inicio="2019-01-15", fecha_fin="2019-01-31")

    assert por_estado(body)["entregada"] == (2, 13)
    assert sum(total for total, _ in por_estado(body).values()) == 2
    assert body["donantes_unicos"] == 2


@pytest.mark.parametrize("filtros, esperado", [
    ({"fecha_inicio": "2019-02-01"}, 3),
    ({"fecha_fin": "2019-01-01"}, 1),
    ({"fecha_inicio": "2019-02-15", "fecha_fin": "2019-02-15"}, 2),
    ({"fecha_inicio": "2019-01-02", "fecha_fin": "2019-01-14"}, 0),
])
def test_filtra_por_fecha_de_inicio_de_fin_o_ambas(client, admin, datos_reportes, filtros, esperado):
    org_a = datos_reportes["organizaciones"]["A"]

    body = resumen(client, admin, id_organizacion=org_a, **filtros)
    lista = detalle(client, admin, id_organizacion=org_a, **filtros)

    assert sum(total for total, _ in por_estado(body).values()) == esperado
    assert lista["total"] == esperado


def test_las_campanas_sin_donaciones_en_el_rango_aparecen_en_cero(client, admin, datos_reportes):
    org_a = datos_reportes["organizaciones"]["A"]
    campanas = datos_reportes["campanas"]

    body = resumen(client, admin, id_organizacion=org_a, fecha_inicio="2019-02-01", fecha_fin="2019-02-28")

    assert por_campana(body) == {campanas["A1"]: (3, 13), campanas["A2"]: (0, 0)}


def test_un_donante_con_varias_donaciones_cuenta_una_sola_vez(client, admin, datos_reportes):
    body = resumen(client, admin, fecha_inicio="2019-01-01", fecha_fin="2019-12-31")

    assert body["donantes_unicos"] == 3
    assert por_estado(body)["entregada"] == (3, 113)
    assert por_estado(body)["pendiente"] == (2, 55)


def test_admin_sin_organizacion_ve_todas_las_organizaciones(client, admin, datos_reportes):
    campanas = datos_reportes["campanas"]

    body = resumen(client, admin, fecha_inicio="2019-01-01", fecha_fin="2019-12-31")
    totales = por_campana(body)

    assert totales[campanas["A1"]] == (6, 31)
    assert totales[campanas["B1"]] == (2, 150)


def test_resumen_y_detalle_coinciden_con_los_mismos_filtros(client, admin, datos_reportes):
    filtros = {"id_organizacion": datos_reportes["organizaciones"]["A"], "fecha_inicio": "2019-01-10"}

    body = resumen(client, admin, **filtros)
    lista = detalle(client, admin, page_size=100, **filtros)

    total_por_estado = sum(total for total, _ in por_estado(body).values())
    total_por_campana = sum(total for total, _ in por_campana(body).values())
    assert total_por_estado == total_por_campana == lista["total"] == len(lista["items"]) == 5
    assert sum(fila["cantidad_donada"] for fila in lista["items"]) == sum(d for _, d in por_estado(body).values())


@pytest.mark.parametrize("filtro, esperado", [
    ("estado=entregada", 2),
    ("estado=pendiente", 1),
    ("estado=recibida", 1),
])
def test_detalle_filtra_por_estado(client, admin, datos_reportes, filtro, esperado):
    org_a = datos_reportes["organizaciones"]["A"]

    body = client.get(f"/reportes/detalle?id_organizacion={org_a}&{filtro}", headers=admin).get_json()

    estado = filtro.split("=")[1]
    assert body["total"] == esperado
    assert {fila["estado"] for fila in body["items"]} == {estado}


def test_detalle_combina_campana_estado_y_fechas(client, admin, datos_reportes):
    a1 = datos_reportes["campanas"]["A1"]

    body = detalle(client, admin, id_publicacion=a1, estado="entregada", fecha_inicio="2019-01-20")

    assert body["total"] == 1
    assert body["items"][0]["fecha_donacion"] == "2019-01-31"
    assert body["items"][0]["cantidad_donada"] == 3


def test_detalle_de_campana_de_otra_organizacion_sale_vacio(client, admin, datos_reportes):
    org_a = datos_reportes["organizaciones"]["A"]
    b1 = datos_reportes["campanas"]["B1"]

    body = detalle(client, admin, id_organizacion=org_a, id_publicacion=b1)

    assert body["total"] == 0
    assert body["items"] == []


def test_detalle_trae_los_datos_de_cada_donacion(client, admin, datos_reportes):
    b1 = datos_reportes["campanas"]["B1"]

    body = detalle(client, admin, id_publicacion=b1)

    assert body["items"][0] == {
        "id_donacion": datos_reportes["donaciones"][7],
        "fecha_donacion": "2019-03-01",
        "estado": "pendiente",
        "cantidad_donada": 50,
        "donante_nombre": "Carla Reportes",
        "id_publicacion": b1,
        "campana_titulo": "Reportes B1 Víveres",
    }


def test_rango_sin_donaciones_devuelve_ceros(client, admin, datos_reportes):
    org_a = datos_reportes["organizaciones"]["A"]
    filtros = {"id_organizacion": org_a, "fecha_inicio": "2018-01-01", "fecha_fin": "2018-12-31"}

    body = resumen(client, admin, **filtros)
    lista = detalle(client, admin, **filtros)

    assert por_estado(body) == {estado: (0, 0) for estado in ESTADOS}
    assert body["donantes_unicos"] == 0
    assert set(por_campana(body).values()) == {(0, 0)}
    assert lista == {"items": [], "total": 0, "page": 1, "page_size": 20, "total_paginas": 0}


def test_intermediario_solo_ve_su_organizacion(client, sesion, datos_reportes):
    org_a = datos_reportes["organizaciones"]["A"]
    org_b = datos_reportes["organizaciones"]["B"]
    campanas = datos_reportes["campanas"]
    headers = sesion("intermediario", id_usuario=20, id_organizacion=org_a)

    body = resumen(client, headers, id_organizacion=org_b)
    lista = detalle(client, headers, id_organizacion=org_b, page_size=100)

    assert set(por_campana(body)) == {campanas["A1"], campanas["A2"]}
    assert lista["total"] == 6
    assert {fila["id_publicacion"] for fila in lista["items"]} == {campanas["A1"]}


def test_intermediario_no_ve_campanas_ajenas_aunque_las_pida(client, sesion, datos_reportes):
    headers = sesion("intermediario", id_usuario=20, id_organizacion=datos_reportes["organizaciones"]["A"])

    body = detalle(client, headers, id_publicacion=datos_reportes["campanas"]["B1"])

    assert body["total"] == 0
