from decimal import Decimal

import pytest


CAMPANA = {
    "id_articulo": 1,
    "titulo": "Campaña de prueba",
    "descripcion": "Recolección de alimentos",
    "cantidad_necesaria": 10,
    "fecha_publicacion": "2026-01-01",
    "fecha_limite": "2026-12-31",
    "estado": "activa",
}

UBICACION_PROPIA = {
    "departamento": "Guatemala",
    "municipio": "Mixco",
    "zona": "4",
    "direccion_detalle": "5 avenida 10-20",
    "latitud": 14.64,
    "longitud": -90.56,
}

ORGANIZACION = {
    "nombre": "Banco de alimentos",
    "descripcion": "Organización dedicada a recolectar alimentos",
    "direccion": "18 avenida 11-95",
    "departamento": "Guatemala",
    "municipio": "Guatemala",
    "zona": "15",
    "estado_verificacion": "verificada",
}


@pytest.fixture
def intermediario(bd, sesion):
    bd.agregar_organizacion(1, direccion="18 avenida 11-95", zona="15", latitud=14.6, longitud=-90.5)
    bd.intermediarios[20] = 1
    return sesion("intermediario", id_usuario=20, id_organizacion=1)


def detalle(client, id_publicacion):
    response = client.get(f"/publicaciones/{id_publicacion}")
    assert response.status_code == 200
    return response.get_json()[0]


def test_sin_ubicacion_la_campana_hereda_la_de_la_organizacion(client, bd, intermediario):
    response = client.post("/intermediario/publicaciones", json=CAMPANA, headers=intermediario)

    assert response.status_code == 201
    guardada = bd.escrituras_en("publicacion")[0]
    assert guardada["departamento"] is None
    assert guardada["latitud"] is None
    assert guardada["longitud"] is None

    campana = detalle(client, guardada["id_publicacion"])
    assert campana["ubicacion_heredada"] is True
    assert campana["direccion_detalle"] == "18 avenida 11-95"
    assert campana["zona"] == "15"
    assert (campana["latitud"], campana["longitud"]) == (14.6, -90.5)


def test_con_ubicacion_propia_la_consulta_devuelve_la_de_la_campana(client, bd, intermediario):
    response = client.post("/intermediario/publicaciones", json={**CAMPANA, **UBICACION_PROPIA}, headers=intermediario)

    assert response.status_code == 201
    guardada = bd.escrituras_en("publicacion")[0]
    assert bd.publicaciones[guardada["id_publicacion"]]["latitud"] == Decimal("14.6400000")

    campana = detalle(client, guardada["id_publicacion"])
    assert campana["ubicacion_heredada"] is False
    assert campana["municipio"] == "Mixco"
    assert campana["direccion_detalle"] == "5 avenida 10-20"
    assert (campana["latitud"], campana["longitud"]) == (14.64, -90.56)


def test_ubicacion_propia_sin_coordenadas_usa_las_de_la_organizacion(client, bd, intermediario):
    datos = {**UBICACION_PROPIA, "latitud": "", "longitud": ""}
    client.post("/intermediario/publicaciones", json={**CAMPANA, **datos}, headers=intermediario)
    id_publicacion = bd.escrituras_en("publicacion")[0]["id_publicacion"]

    campana = detalle(client, id_publicacion)

    assert campana["ubicacion_heredada"] is False
    assert campana["municipio"] == "Mixco"
    assert (campana["latitud"], campana["longitud"]) == (14.6, -90.5)


@pytest.mark.parametrize("cambios", [
    {"latitud": 14.64, "longitud": ""},
    {"latitud": 95, "longitud": -90.56},
    {"latitud": 14.64, "longitud": "oeste"},
    {"zona": "123"},
    {"direccion_detalle": "corta"},
])
def test_no_crea_campana_con_ubicacion_propia_invalida(client, bd, intermediario, cambios):
    response = client.post("/intermediario/publicaciones", json={**CAMPANA, **UBICACION_PROPIA, **cambios}, headers=intermediario)

    assert response.status_code == 400
    assert bd.escrituras == []


def test_editar_coordenadas_propias_actualiza_la_consulta(client, bd, intermediario):
    bd.agregar_publicacion(5, 1, **UBICACION_PROPIA)

    response = client.put("/intermediario/publicaciones/5", json={**CAMPANA, **UBICACION_PROPIA, "latitud": 14.65}, headers=intermediario)

    assert response.status_code == 200
    campana = detalle(client, 5)
    assert (campana["latitud"], campana["longitud"]) == (14.65, -90.56)
    assert campana["ubicacion_heredada"] is False


def test_volver_a_heredar_borra_la_ubicacion_propia(client, bd, intermediario):
    bd.agregar_publicacion(5, 1, **UBICACION_PROPIA)

    response = client.put("/intermediario/publicaciones/5", json=CAMPANA, headers=intermediario)

    assert response.status_code == 200
    guardada = bd.publicaciones[5]
    assert [guardada[campo] for campo in UBICACION_PROPIA] == [None] * len(UBICACION_PROPIA)
    campana = detalle(client, 5)
    assert campana["ubicacion_heredada"] is True
    assert (campana["latitud"], campana["longitud"]) == (14.6, -90.5)


def test_pasar_de_heredada_a_propia(client, bd, intermediario):
    bd.agregar_publicacion(5, 1)

    client.put("/intermediario/publicaciones/5", json={**CAMPANA, **UBICACION_PROPIA}, headers=intermediario)

    campana = detalle(client, 5)
    assert campana["ubicacion_heredada"] is False
    assert (campana["latitud"], campana["longitud"]) == (14.64, -90.56)


def test_campana_heredada_sigue_los_cambios_de_la_organizacion(client, bd, intermediario, sesion):
    bd.agregar_publicacion(5, 1)
    bd.agregar_publicacion(6, 1, **UBICACION_PROPIA)
    admin = sesion("administrador", id_usuario=1)

    response = client.put("/organizaciones/1", json={**ORGANIZACION, "latitud": 14.7, "longitud": -90.4}, headers=admin)

    assert response.status_code == 200
    heredada = detalle(client, 5)
    propia = detalle(client, 6)
    assert (heredada["latitud"], heredada["longitud"]) == (14.7, -90.4)
    assert (propia["latitud"], propia["longitud"]) == (14.64, -90.56)


def test_listado_publico_devuelve_coordenadas_numericas_e_indica_la_herencia(client, bd, intermediario):
    bd.agregar_publicacion(5, 1)
    bd.agregar_publicacion(6, 1, **UBICACION_PROPIA)

    campanas = {c["id_publicacion"]: c for c in client.get("/publicaciones").get_json()}

    assert (campanas[5]["latitud"], campanas[5]["longitud"]) == (14.6, -90.5)
    assert (campanas[6]["latitud"], campanas[6]["longitud"]) == (14.64, -90.56)
    assert all(isinstance(c["latitud"], float) for c in campanas.values())
    assert campanas[5]["ubicacion_heredada"]
    assert not campanas[6]["ubicacion_heredada"]


def test_listado_del_intermediario_no_mezcla_la_ubicacion_de_la_organizacion(client, bd, intermediario):
    bd.agregar_publicacion(5, 1)
    bd.agregar_publicacion(6, 1, **UBICACION_PROPIA)

    campanas = {c["id_publicacion"]: c for c in client.get("/intermediario/publicaciones", headers=intermediario).get_json()}

    assert campanas[5]["latitud"] is None
    assert campanas[5]["departamento"] is None
    assert campanas[6]["latitud"] == 14.64


def test_admin_crea_campana_con_ubicacion_propia(client, bd, sesion):
    bd.agregar_organizacion(1, latitud=14.6, longitud=-90.5)
    bd.intermediarios[20] = 1
    admin = sesion("administrador", id_usuario=1)

    response = client.post("/publicaciones", json={**CAMPANA, **UBICACION_PROPIA, "id_intermediario": 20, "id_organizacion": 1}, headers=admin)

    assert response.status_code == 201
    assert detalle(client, 1)["latitud"] == 14.64
