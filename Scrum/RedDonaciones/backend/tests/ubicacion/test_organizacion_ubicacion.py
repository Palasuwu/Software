from decimal import Decimal

import pytest


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
def admin(bd, sesion):
    return sesion("administrador", id_usuario=1)


@pytest.fixture
def intermediario(bd, sesion):
    bd.agregar_organizacion(1, latitud=14.6, longitud=-90.5)
    return sesion("intermediario", id_usuario=20, id_organizacion=1)


def test_admin_crea_organizacion_y_la_consulta_con_las_mismas_coordenadas(client, bd, admin):
    creada = client.post("/organizaciones", json={**ORGANIZACION, "latitud": 14.6349, "longitud": -90.5069}, headers=admin)

    assert creada.status_code == 201
    id_organizacion = creada.get_json()["organizacion"]["id_organizacion"]
    assert bd.organizaciones[id_organizacion]["latitud"] == Decimal("14.6349000")
    assert bd.organizaciones[id_organizacion]["longitud"] == Decimal("-90.5069000")

    consulta = client.get(f"/organizaciones/{id_organizacion}").get_json()["organizacion"]
    assert consulta["latitud"] == 14.6349
    assert consulta["longitud"] == -90.5069


def test_las_coordenadas_se_guardan_con_siete_decimales(client, bd, admin):
    creada = client.post("/organizaciones", json={**ORGANIZACION, "latitud": "14.634567891", "longitud": "-90.506912345"}, headers=admin)
    id_organizacion = creada.get_json()["organizacion"]["id_organizacion"]

    consulta = client.get(f"/organizaciones/{id_organizacion}").get_json()["organizacion"]

    assert consulta["latitud"] == 14.6345679
    assert consulta["longitud"] == -90.5069123


def test_admin_crea_organizacion_sin_coordenadas(client, bd, admin):
    creada = client.post("/organizaciones", json=ORGANIZACION, headers=admin)

    assert creada.status_code == 201
    organizacion = creada.get_json()["organizacion"]
    assert organizacion["latitud"] is None
    assert organizacion["longitud"] is None


@pytest.mark.parametrize("latitud, longitud", [(14.6, None), (91, -90.5), (14.6, -181), ("abc", "-90.5")])
def test_admin_no_crea_organizacion_con_coordenadas_invalidas(client, bd, admin, latitud, longitud):
    response = client.post("/organizaciones", json={**ORGANIZACION, "latitud": latitud, "longitud": longitud}, headers=admin)

    assert response.status_code == 400
    assert "latitud" in response.get_json()["campos"]
    assert bd.escrituras == []


def test_admin_edita_coordenadas_y_la_consulta_refleja_el_cambio(client, bd, admin):
    bd.agregar_organizacion(1, latitud=14.6, longitud=-90.5)

    response = client.put("/organizaciones/1", json={**ORGANIZACION, "latitud": 14.7, "longitud": -90.6}, headers=admin)

    assert response.status_code == 200
    assert response.get_json()["organizacion"]["latitud"] == 14.7
    consulta = client.get("/organizaciones/1").get_json()["organizacion"]
    assert (consulta["latitud"], consulta["longitud"]) == (14.7, -90.6)


def test_admin_puede_quitar_las_coordenadas(client, bd, admin):
    bd.agregar_organizacion(1, latitud=14.6, longitud=-90.5)

    response = client.put("/organizaciones/1", json={**ORGANIZACION, "latitud": "", "longitud": ""}, headers=admin)

    assert response.status_code == 200
    assert bd.organizaciones[1]["latitud"] is None
    assert bd.organizaciones[1]["longitud"] is None


def test_admin_no_edita_con_una_sola_coordenada(client, bd, admin):
    bd.agregar_organizacion(1, latitud=14.6, longitud=-90.5)

    response = client.put("/organizaciones/1", json={**ORGANIZACION, "latitud": 14.7, "longitud": ""}, headers=admin)

    assert response.status_code == 400
    assert bd.escrituras == []
    assert bd.organizaciones[1]["latitud"] == Decimal("14.6000000")


def test_intermediario_actualiza_su_ubicacion_y_la_consulta_la_devuelve(client, bd, intermediario):
    response = client.put("/intermediario/organizacion", json={**ORGANIZACION, "latitud": "14.65", "longitud": "-90.55"}, headers=intermediario)

    assert response.status_code == 200
    perfil = client.get("/intermediario/organizacion", headers=intermediario).get_json()
    assert (perfil["latitud"], perfil["longitud"]) == (14.65, -90.55)
    publica = client.get("/organizaciones/1").get_json()["organizacion"]
    assert (publica["latitud"], publica["longitud"]) == (14.65, -90.55)


def test_intermediario_no_guarda_coordenadas_invalidas(client, bd, intermediario):
    response = client.put("/intermediario/organizacion", json={**ORGANIZACION, "latitud": "14.65", "longitud": "200"}, headers=intermediario)

    assert response.status_code == 400
    assert bd.escrituras == []
    assert bd.organizaciones[1]["longitud"] == Decimal("-90.5000000")


def test_consultas_publicas_devuelven_coordenadas_como_numero(client, bd, monkeypatch):
    monkeypatch.setenv("ID_ORGANIZACION_PRINCIPAL", "1")
    bd.agregar_organizacion(1, latitud=14.6, longitud=-90.5)
    bd.agregar_organizacion(2)

    principal = client.get("/organizaciones/principal").get_json()["organizacion"]
    sin_coordenadas = client.get("/organizaciones/2").get_json()["organizacion"]

    assert isinstance(principal["latitud"], float)
    assert isinstance(principal["longitud"], float)
    assert sin_coordenadas["latitud"] is None
    assert sin_coordenadas["longitud"] is None
