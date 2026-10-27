# Tests de integracion de /reportes/* contra MySQL real (necesitan Docker).
# El dataset se confirma para conexiones independientes; se elimina su base completa.
import os

import pytest

from auth_utils import generate_token

SECRET = "test-secret-key-with-at-least-32-bytes"


def token_usuario(id_usuario, rol):
    os.environ["JWT_SECRET_KEY"] = SECRET
    return generate_token(id_usuario, rol)


def auth_usuario(monkeypatch, id_usuario, rol, activo=1):
    monkeypatch.setattr(
        "auth_utils._obtener_usuario_actual",
        lambda _: {"id_usuario": id_usuario, "rol": rol, "activo": activo},
    )


@pytest.fixture
def dataset_reportes(contexto_reportes):
    ctx = contexto_reportes
    data = ctx["data"]
    pub = data.campaign(ctx["organizacion"], ctx["intermediario"], ctx["articulo"], "TEST_CAMPANA_ENDPOINT")
    otra_org = data.organization("Organización ajena")
    a, b = ctx["donantes"]
    for donor, state, date in [
        (a, "pendiente", "2020-01-05"), (a, "entregada", "2020-01-10"),
        (b, "entregada", "2020-01-15"), (b, "rechazada", "2020-01-20"),
    ]:
        data.insert("INSERT INTO donacion (id_donante,id_publicacion,descripcion,nombre_contacto,"
                    "telefono_contacto,hora_preferida,cantidad_donada,fecha_donacion,estado) "
                    "VALUES (%s,%s,'Donación de prueba','Contacto','00000000','10:00:00',1,%s,%s)",
                    (donor, pub, date, state))
    data.conn.commit()
    return dict(id_publicacion=pub, id_organizacion=ctx["organizacion"], otra_organizacion=otra_org,
                admin_headers={"Authorization": f"Bearer {generate_token(ctx['admin'], 'administrador')}"},
                intermediario_headers={"Authorization": f"Bearer {generate_token(ctx['intermediario'], 'intermediario')}"})


def test_resumen_requiere_login(client):
    response = client.get("/reportes/resumen")
    assert response.status_code == 401


def test_resumen_donante_denegado(client, monkeypatch):
    auth_usuario(monkeypatch, 1, "donante")
    token = token_usuario(1, "donante")

    response = client.get("/reportes/resumen", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_resumen_admin_con_dataset_conocido(client, dataset_reportes):
    headers = dataset_reportes["admin_headers"]

    response = client.get(
        f"/reportes/resumen?fecha_inicio=2020-01-01&fecha_fin=2020-01-31&id_organizacion={dataset_reportes['id_organizacion']}",
        headers=headers,
    )
    assert response.status_code == 200
    body = response.get_json()
    por_estado = {f["estado"]: f for f in body["por_estado"]}
    assert por_estado["pendiente"]["total"] == 1
    assert por_estado["entregada"]["total"] == 2
    assert por_estado["rechazada"]["total"] == 1
    assert body["donantes_unicos"] == 2

    # total_donado debe ser un numero real en el JSON, no un string (Decimal mal serializado).
    for fila in body["por_estado"]:
        assert isinstance(fila["total_donado"], int)
    for fila in body["por_campana"]:
        assert isinstance(fila["total_donado"], int)


def test_resumen_fecha_invalida(client, monkeypatch):
    auth_usuario(monkeypatch, 3, "administrador")
    token = token_usuario(3, "administrador")

    response = client.get(
        "/reportes/resumen?fecha_inicio=05-01-2020",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400


def test_detalle_paginacion(client, dataset_reportes):
    headers = dataset_reportes["admin_headers"]
    id_publicacion = dataset_reportes["id_publicacion"]

    response = client.get(
        f"/reportes/detalle?id_publicacion={id_publicacion}&page=1&page_size=2",
        headers=headers,
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["total"] == 4
    assert body["total_paginas"] == 2
    assert len(body["items"]) == 2
    assert body["items"][0]["fecha_donacion"] == "2020-01-20"  # ISO, no formato GMT crudo de MySQL

    response_pagina2 = client.get(
        f"/reportes/detalle?id_publicacion={id_publicacion}&page=2&page_size=2",
        headers=headers,
    )
    assert len(response_pagina2.get_json()["items"]) == 2


def test_detalle_estado_invalido(client, monkeypatch):
    auth_usuario(monkeypatch, 3, "administrador")
    token = token_usuario(3, "administrador")

    response = client.get(
        "/reportes/detalle?estado=no_existe",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400


def test_intermediario_ignora_id_organizacion_ajeno(client, dataset_reportes):
    headers = dataset_reportes["intermediario_headers"]
    otra_org = dataset_reportes["otra_organizacion"]
    # Pedir una organización ajena no amplía el alcance del intermediario real.
    response = client.get(
        f"/reportes/resumen?id_organizacion={otra_org}&fecha_inicio=2020-01-01&fecha_fin=2020-01-31",
        headers=headers,
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["donantes_unicos"] == 2
