# Verifica que latitud/longitud salgan como numero JSON real (no string), no solo con valor correcto.
def test_organizacion_principal_coordenadas_son_numero(client):
    response = client.get("/organizaciones/principal")
    assert response.status_code == 200
    organizacion = response.get_json()["organizacion"]

    if organizacion.get("latitud") is not None:
        assert isinstance(organizacion["latitud"], float)
        assert isinstance(organizacion["longitud"], float)


def test_publicaciones_coordenadas_son_numero_o_none(client):
    response = client.get("/publicaciones")
    assert response.status_code == 200

    for publicacion in response.get_json():
        if publicacion.get("latitud") is not None:
            assert isinstance(publicacion["latitud"], float)
            assert isinstance(publicacion["longitud"], float)
