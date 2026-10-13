# Pruebas de regresión: protegen comportamiento ya validado en sprints anteriores.
# Cada prueba documenta qué se protege y qué cambio la rompería.
import pytest


pytestmark = pytest.mark.regresion


def test_campana_solo_finaliza_al_alcanzar_la_meta(client, consultar, escenario, datos_donacion, auth):
    """R1 — Cierre automático de campañas (sprint 6/8).

    Protege: la campaña pasa a 'finalizada' solo cuando lo recibido alcanza la meta, y después
    ya no acepta donaciones.
    Regresión posible: reordenar el UPDATE de routes/donacion.py para sumar cantidad_recibida
    antes de evaluar el CASE (MySQL aplica el SET de izquierda a derecha) cierra campañas antes de tiempo.
    """
    id_campana = escenario["crear_campana"](cantidad_necesaria=10, cantidad_recibida=0)
    token = auth(escenario["token_donante"])

    primera = client.post("/donaciones", json=datos_donacion(id_campana, 6), headers=token)
    assert primera.status_code == 201
    assert consultar("SELECT cantidad_recibida, estado FROM publicacion WHERE id_publicacion = %s", (id_campana,)) == [
        {"cantidad_recibida": 6, "estado": "activa"}
    ]

    segunda = client.post("/donaciones", json=datos_donacion(id_campana, 4), headers=token)
    assert segunda.status_code == 201
    assert consultar("SELECT cantidad_recibida, estado FROM publicacion WHERE id_publicacion = %s", (id_campana,)) == [
        {"cantidad_recibida": 10, "estado": "finalizada"}
    ]

    extra = client.post("/donaciones", json=datos_donacion(id_campana, 1), headers=token)
    assert extra.status_code == 400
    assert consultar("SELECT COUNT(*) AS total FROM donacion WHERE id_publicacion = %s", (id_campana,)) == [{"total": 2}]


@pytest.mark.parametrize("estado_invalido", ["entregada", "en_proceso"])
def test_estado_de_donacion_no_salta_pasos(client, consultar, escenario, datos_donacion, auth, estado_invalido):
    """R2 — Flujo de seguimiento de donaciones (sprint 7).

    Protege: pendiente → recibida → en_proceso → entregada, sin saltos, y 'entregada' es final.
    Regresión posible: agregar atajos en TRANSICIONES_DONACION (services/donacion_service.py)
    o quitar validar_transicion_donacion del cambio de estado.
    """
    id_campana = escenario["crear_campana"]()
    creada = client.post("/donaciones", json=datos_donacion(id_campana, 1), headers=auth(escenario["token_donante"]))
    id_donacion = creada.get_json()["id_donacion"]
    inter = auth(escenario["token_intermediario"])

    salto = client.put(f"/donaciones/{id_donacion}/estado", json={"estado": estado_invalido}, headers=inter)
    assert salto.status_code == 400
    assert "Transición de estado no permitida" in salto.get_json()["error"]
    assert consultar("SELECT estado FROM donacion WHERE id_donacion = %s", (id_donacion,)) == [{"estado": "pendiente"}]

    for paso in ("recibida", "en_proceso", "entregada"):
        assert client.put(f"/donaciones/{id_donacion}/estado", json={"estado": paso}, headers=inter).status_code == 200

    reabrir = client.put(f"/donaciones/{id_donacion}/estado", json={"estado": "recibida"}, headers=inter)
    assert reabrir.status_code == 400
    assert consultar("SELECT estado FROM donacion WHERE id_donacion = %s", (id_donacion,)) == [{"estado": "entregada"}]


def test_campana_sin_ubicacion_hereda_la_de_su_organizacion(client, escenario):
    """R3 — Ubicación de campañas para Maps/Waze (sprint 8).

    Protege: GET /publicaciones devuelve la ubicación de la organización cuando la campaña no tiene
    una propia (ubicacion_heredada = 1) y respeta la propia cuando sí la tiene.
    Regresión posible: quitar los COALESCE con la organización en routes/publicacion.py; las campañas
    sin ubicación quedarían sin enlaces de Maps/Waze en el frontend.
    """
    id_heredada = escenario["crear_campana"](titulo="Campaña sin ubicación")
    id_propia = escenario["crear_campana"](
        titulo="Campaña con ubicación",
        ubicacion={
            "departamento": "Sacatepéquez", "municipio": "Antigua Guatemala", "zona": "1",
            "direccion_detalle": "Parque Central", "latitud": 14.5573, "longitud": -90.7333,
        },
    )

    respuesta = client.get("/publicaciones")
    assert respuesta.status_code == 200
    campanas = {c["id_publicacion"]: c for c in respuesta.get_json()}

    heredada = campanas[id_heredada]
    assert heredada["ubicacion_heredada"] == 1
    assert heredada["municipio"] == "Ciudad de Guatemala"
    assert heredada["latitud"] == pytest.approx(14.6349)
    assert heredada["longitud"] == pytest.approx(-90.5069)

    propia = campanas[id_propia]
    assert propia["ubicacion_heredada"] == 0
    assert propia["municipio"] == "Antigua Guatemala"
    assert propia["latitud"] == pytest.approx(14.5573)
