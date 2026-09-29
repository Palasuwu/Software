import pytest


ORGANIZACION = {
    "nombre": "Organización de prueba",
    "descripcion": "Organización dedicada a recolectar donaciones",
    "direccion": "18 avenida 11-95",
    "departamento": "Guatemala",
    "municipio": "Guatemala",
    "zona": "15",
    "latitud": 14.6,
    "longitud": -90.5,
    "estado_verificacion": "verificada",
}

CAMPANA = {
    "id_articulo": 1,
    "titulo": "Campaña de prueba",
    "descripcion": "Recolección de alimentos",
    "cantidad_necesaria": 10,
    "fecha_publicacion": "2026-01-01",
    "fecha_limite": "2026-12-31",
    "estado": "activa",
    "departamento": "Guatemala",
    "municipio": "Mixco",
    "zona": "4",
    "direccion_detalle": "5 avenida 10-20",
    "latitud": 14.64,
    "longitud": -90.56,
}

ENDPOINTS_ADMIN = [
    ("POST", "/organizaciones", ORGANIZACION),
    ("PUT", "/organizaciones/1", ORGANIZACION),
    ("POST", "/publicaciones", {**CAMPANA, "id_intermediario": 20, "id_organizacion": 1}),
]

ENDPOINTS_INTERMEDIARIO = [
    ("PUT", "/intermediario/organizacion", ORGANIZACION),
    ("POST", "/intermediario/publicaciones", CAMPANA),
    ("PUT", "/intermediario/publicaciones/5", CAMPANA),
]


@pytest.fixture
def datos(bd):
    bd.agregar_organizacion(1, latitud=14.6, longitud=-90.5)
    bd.agregar_organizacion(2, latitud=15.0, longitud=-91.0)
    bd.agregar_publicacion(5, 1)
    bd.agregar_publicacion(6, 2, departamento="Quetzaltenango", municipio="Xela", zona="1",
                           direccion_detalle="Parque central de Xela", latitud=14.83, longitud=-91.51)
    bd.intermediarios[20] = 1
    return bd


@pytest.mark.parametrize("metodo, ruta, cuerpo", ENDPOINTS_ADMIN + ENDPOINTS_INTERMEDIARIO)
def test_sin_sesion_no_se_puede_modificar_ubicaciones(client, datos, metodo, ruta, cuerpo):
    response = client.open(ruta, method=metodo, json=cuerpo)

    assert response.status_code == 401
    assert datos.escrituras == []


@pytest.mark.parametrize("metodo, ruta, cuerpo", ENDPOINTS_ADMIN + ENDPOINTS_INTERMEDIARIO)
def test_donante_no_puede_modificar_ubicaciones(client, datos, sesion, metodo, ruta, cuerpo):
    headers = sesion("donante", id_usuario=30)

    response = client.open(ruta, method=metodo, json=cuerpo, headers=headers)

    assert response.status_code == 403
    assert datos.escrituras == []


@pytest.mark.parametrize("metodo, ruta, cuerpo", ENDPOINTS_ADMIN)
def test_intermediario_no_usa_rutas_de_administrador(client, datos, sesion, metodo, ruta, cuerpo):
    headers = sesion("intermediario", id_usuario=20, id_organizacion=1)

    response = client.open(ruta, method=metodo, json=cuerpo, headers=headers)

    assert response.status_code == 403
    assert datos.escrituras == []


@pytest.mark.parametrize("metodo, ruta, cuerpo", ENDPOINTS_INTERMEDIARIO)
def test_administrador_no_usa_rutas_de_intermediario(client, datos, sesion, metodo, ruta, cuerpo):
    headers = sesion("administrador", id_usuario=1)

    response = client.open(ruta, method=metodo, json=cuerpo, headers=headers)

    assert response.status_code == 403
    assert datos.escrituras == []


@pytest.mark.parametrize("metodo, ruta, cuerpo", ENDPOINTS_INTERMEDIARIO)
def test_intermediario_de_organizacion_no_verificada_es_rechazado(client, datos, sesion, metodo, ruta, cuerpo):
    headers = sesion("intermediario", id_usuario=20, id_organizacion=1, organizacion_verificada=False)

    response = client.open(ruta, method=metodo, json=cuerpo, headers=headers)

    assert response.status_code == 403
    assert datos.escrituras == []


def test_intermediario_no_edita_campana_de_otra_organizacion(client, datos, sesion):
    headers = sesion("intermediario", id_usuario=20, id_organizacion=1)

    response = client.put("/intermediario/publicaciones/6", json=CAMPANA, headers=headers)

    assert response.status_code == 404
    assert datos.escrituras == []
    assert float(datos.publicaciones[6]["latitud"]) == 14.83


def test_intermediario_solo_actualiza_la_ubicacion_de_su_organizacion(client, datos, sesion):
    headers = sesion("intermediario", id_usuario=20, id_organizacion=1)
    cuerpo = {**ORGANIZACION, "id_organizacion": 2, "latitud": 14.7, "longitud": -90.6}

    response = client.put("/intermediario/organizacion", json=cuerpo, headers=headers)

    assert response.status_code == 200
    assert [cambio["id"] for cambio in datos.escrituras_en("organizacion")] == [1]
    assert float(datos.organizaciones[1]["latitud"]) == 14.7
    assert float(datos.organizaciones[2]["latitud"]) == 15.0


def test_intermediario_crea_campanas_solo_en_su_organizacion(client, datos, sesion):
    headers = sesion("intermediario", id_usuario=20, id_organizacion=1)

    response = client.post("/intermediario/publicaciones", json={**CAMPANA, "id_organizacion": 2}, headers=headers)

    assert response.status_code == 201
    assert datos.escrituras_en("publicacion")[0]["id_organizacion"] == 1
