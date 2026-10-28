# La meta (cantidad_necesaria) de una campaña no puede quedar por debajo de lo ya recibido.
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


@pytest.fixture
def intermediario(bd, sesion):
    bd.agregar_organizacion(1, direccion="18 avenida 11-95", zona="15")
    bd.intermediarios[20] = 1
    return sesion("intermediario", id_usuario=20, id_organizacion=1)


def test_no_permite_bajar_la_meta_por_debajo_de_lo_recibido(client, bd, intermediario):
    bd.agregar_publicacion(5, 1, cantidad_recibida=60)

    response = client.put(
        "/intermediario/publicaciones/5",
        json={**CAMPANA, "cantidad_necesaria": 1},
        headers=intermediario,
    )

    assert response.status_code == 400
    assert "cantidad_necesaria" in response.get_json()["error"]
    assert bd.publicaciones[5]["cantidad_necesaria"] == 10  # no se modifico


def test_permite_editar_la_meta_si_queda_igual_o_por_encima_de_lo_recibido(client, bd, intermediario):
    bd.agregar_publicacion(5, 1, cantidad_recibida=60)

    response = client.put(
        "/intermediario/publicaciones/5",
        json={**CAMPANA, "cantidad_necesaria": 60},
        headers=intermediario,
    )

    assert response.status_code == 200
    assert bd.publicaciones[5]["cantidad_necesaria"] == 60
