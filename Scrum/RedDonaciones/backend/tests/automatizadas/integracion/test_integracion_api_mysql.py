# Pruebas de integración: API Flask + MySQL real (+ JWT).
# Ninguna usa mocks: la petición pasa por las rutas, los servicios y la base de datos.
import bcrypt
import pytest


pytestmark = pytest.mark.integracion


def test_registro_y_login_de_donante_persisten_en_mysql(client, consultar):
    """I1 — Registro (POST /usuarios) → MySQL → Login (POST /login) → JWT aceptado por una ruta protegida."""
    nuevo = {
        "nombre": "Lucia Perez",
        "correo": "lucia.perez@prueba.test",
        "password": "Clave1234",
        "telefono": "55559876",
        "rol": "donante",
        "departamento": "Guatemala",
        "municipio": "Mixco",
        "zona": "4",
        "direccion_detalle": "Calle principal 10-20",
    }

    registro = client.post("/usuarios", json=nuevo)
    assert registro.status_code == 201
    id_usuario = registro.get_json()["usuario"]["id_usuario"]

    usuario = consultar("SELECT correo, password, rol FROM usuario WHERE id_usuario = %s", (id_usuario,))[0]
    assert usuario["rol"] == "donante"
    assert usuario["password"] != nuevo["password"]
    assert bcrypt.checkpw(nuevo["password"].encode(), usuario["password"].encode())
    assert consultar("SELECT municipio, zona FROM donante WHERE id_usuario = %s", (id_usuario,)) == [
        {"municipio": "Mixco", "zona": "4"}
    ]

    login = client.post("/login", json={"correo": nuevo["correo"], "password": nuevo["password"]})
    assert login.status_code == 200
    token = login.get_json()["token"]

    mis_donaciones = client.get("/donaciones", headers={"Authorization": f"Bearer {token}"})
    assert mis_donaciones.status_code == 200
    assert mis_donaciones.get_json() == []


def test_donacion_actualiza_campana_y_genera_notificaciones(client, consultar, escenario, datos_donacion, auth):
    """I2 — POST /donaciones guarda la donación, suma a la campaña y notifica a donante e intermediario."""
    id_campana = escenario["crear_campana"](cantidad_necesaria=50, cantidad_recibida=10)

    respuesta = client.post(
        "/donaciones", json=datos_donacion(id_campana, 5), headers=auth(escenario["token_donante"])
    )
    assert respuesta.status_code == 201
    id_donacion = respuesta.get_json()["id_donacion"]

    donacion = consultar("SELECT id_donante, cantidad_donada, estado FROM donacion WHERE id_donacion = %s", (id_donacion,))
    assert donacion == [{"id_donante": escenario["id_donante"], "cantidad_donada": 5, "estado": "pendiente"}]

    campana = consultar("SELECT cantidad_recibida, estado FROM publicacion WHERE id_publicacion = %s", (id_campana,))
    assert campana == [{"cantidad_recibida": 15, "estado": "activa"}]

    tipos = consultar("SELECT id_usuario, tipo FROM notificacion ORDER BY id_notificacion")
    assert tipos == [
        {"id_usuario": escenario["id_donante"], "tipo": "donacion_registrada"},
        {"id_usuario": escenario["id_intermediario"], "tipo": "nueva_donacion"},
    ]

    bandeja = client.get("/notificaciones", headers=auth(escenario["token_donante"]))
    assert bandeja.status_code == 200
    assert bandeja.get_json()["notificaciones"][0]["titulo"] == "Donación registrada"


def test_intermediario_cambia_estado_y_donante_lo_ve(client, consultar, escenario, datos_donacion, auth):
    """I3 — PUT /donaciones/<id>/estado (intermediario) → MySQL → GET del donante y su notificación."""
    id_campana = escenario["crear_campana"]()
    creada = client.post("/donaciones", json=datos_donacion(id_campana, 2), headers=auth(escenario["token_donante"]))
    id_donacion = creada.get_json()["id_donacion"]

    cambio = client.put(
        f"/donaciones/{id_donacion}/estado",
        json={"estado": "recibida"},
        headers=auth(escenario["token_intermediario"]),
    )
    assert cambio.status_code == 200
    assert cambio.get_json()["donacion"]["estado_anterior"] == "pendiente"

    assert consultar("SELECT estado FROM donacion WHERE id_donacion = %s", (id_donacion,)) == [{"estado": "recibida"}]

    estado = client.get(f"/donaciones/{id_donacion}/estado", headers=auth(escenario["token_donante"]))
    assert estado.status_code == 200
    assert estado.get_json()["estado"] == "recibida"

    avisos = consultar(
        "SELECT titulo FROM notificacion WHERE id_usuario = %s AND tipo = 'estado_donacion'",
        (escenario["id_donante"],),
    )
    assert avisos == [{"titulo": "Donación recibida"}]
