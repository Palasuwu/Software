import pytest


RUTAS = ["/reportes/resumen", "/reportes/detalle"]


@pytest.fixture
def admin(sesion):
    return sesion("administrador", id_usuario=1)


@pytest.mark.parametrize("ruta", RUTAS)
def test_sin_sesion_responde_401(client, ruta):
    assert client.get(ruta).status_code == 401


@pytest.mark.parametrize("ruta", RUTAS)
def test_donante_no_puede_ver_reportes(client, sesion, ruta):
    headers = sesion("donante", id_usuario=30)

    assert client.get(ruta, headers=headers).status_code == 403


@pytest.mark.parametrize("ruta", RUTAS)
def test_intermediario_sin_organizacion_no_puede_ver_reportes(client, sesion, ruta):
    headers = sesion("intermediario", id_usuario=20, id_organizacion=None)

    response = client.get(ruta, headers=headers)

    assert response.status_code == 403
    assert response.get_json()["error"] == "El usuario no esta asociado a una organizacion"


@pytest.mark.parametrize("ruta", RUTAS)
def test_intermediario_de_organizacion_no_verificada_no_puede_ver_reportes(client, sesion, ruta):
    headers = sesion("intermediario", id_usuario=20, id_organizacion=5, organizacion_verificada=False)

    response = client.get(ruta, headers=headers)

    assert response.status_code == 403
    assert response.get_json()["error"] == "La organizacion no esta verificada"


@pytest.mark.parametrize("ruta", RUTAS)
@pytest.mark.parametrize("query, mensaje", [
    ("fecha_inicio=05-01-2019", "fecha_inicio debe tener formato YYYY-MM-DD"),
    ("fecha_inicio=2019-13-01", "fecha_inicio debe tener formato YYYY-MM-DD"),
    ("fecha_fin=2019-02-30", "fecha_fin debe tener formato YYYY-MM-DD"),
    ("fecha_fin=ayer", "fecha_fin debe tener formato YYYY-MM-DD"),
    ("fecha_inicio=", "fecha_inicio no puede estar vacia"),
    ("fecha_fin=%20", "fecha_fin no puede estar vacia"),
    ("fecha_inicio=2019-02-01&fecha_fin=2019-01-31", "fecha_fin no puede ser anterior a fecha_inicio"),
])
def test_rechaza_fechas_invalidas(client, admin, ruta, query, mensaje):
    response = client.get(f"{ruta}?{query}", headers=admin)

    assert response.status_code == 400
    assert response.get_json()["error"] == mensaje


@pytest.mark.parametrize("ruta", RUTAS)
@pytest.mark.parametrize("valor", ["0", "-3", "abc", "", "1.5"])
def test_rechaza_id_organizacion_invalido(client, admin, ruta, valor):
    response = client.get(f"{ruta}?id_organizacion={valor}", headers=admin)

    assert response.status_code == 400


@pytest.mark.parametrize("query", [
    "estado=",
    "estado=no_existe",
    "estado=ENTREGADA",
    "id_publicacion=0",
    "id_publicacion=abc",
    "id_publicacion=",
])
def test_detalle_rechaza_filtros_invalidos(client, admin, query):
    response = client.get(f"/reportes/detalle?{query}", headers=admin)

    assert response.status_code == 400


@pytest.mark.parametrize("query", [
    "page=0",
    "page=-1",
    "page=abc",
    "page=",
    "page_size=0",
    "page_size=-5",
    "page_size=diez",
])
def test_detalle_rechaza_paginacion_invalida(client, admin, query):
    response = client.get(f"/reportes/detalle?{query}", headers=admin)

    assert response.status_code == 400
