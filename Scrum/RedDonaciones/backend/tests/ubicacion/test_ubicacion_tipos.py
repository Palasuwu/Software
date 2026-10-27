import pytest


@pytest.fixture
def ubicacion_mysql(mysql_case):
    org = mysql_case.organization()
    mysql_case.principal(org)
    inter = mysql_case.user("Intermediario de ubicación", "intermediario", org)
    article = mysql_case.article()
    campaign = mysql_case.campaign(org, inter, article, "Campaña con ubicación heredada")
    mysql_case.conn.commit()
    return {"organizacion": org, "campana": campaign}


# Verifica que latitud/longitud salgan como numero JSON real (no string), no solo con valor correcto.
def test_organizacion_principal_coordenadas_son_numero(client, ubicacion_mysql):
    response = client.get("/organizaciones/principal")
    assert response.status_code == 200
    organizacion = response.get_json()["organizacion"]
    assert organizacion["id_organizacion"] == ubicacion_mysql["organizacion"]
    assert organizacion["latitud"] is not None

    if organizacion.get("latitud") is not None:
        assert isinstance(organizacion["latitud"], float)
        assert isinstance(organizacion["longitud"], float)


def test_publicaciones_coordenadas_son_numero_o_none(client, ubicacion_mysql):
    response = client.get("/publicaciones")
    assert response.status_code == 200

    assert {p["id_publicacion"] for p in response.get_json()} == {ubicacion_mysql["campana"]}
    for publicacion in response.get_json():
        assert publicacion["latitud"] is not None
        if publicacion.get("latitud") is not None:
            assert isinstance(publicacion["latitud"], float)
            assert isinstance(publicacion["longitud"], float)
