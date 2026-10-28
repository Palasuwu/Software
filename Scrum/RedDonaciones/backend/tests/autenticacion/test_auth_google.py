"""Pruebas del inicio de sesion con Google.

El ID token de Firebase se simula: lo que se verifica aqui es la logica propia
—usuario conocido, usuario nuevo, cuenta desactivada y validacion del alta—,
no la libreria de Google.
"""
import os

import pytest

from tests.helpers import crear_conexion_mock

SECRET = "test-secret-key-with-at-least-32-bytes"

IDENTIDAD = {
    "correo": "nuevo.donante@example.com",
    "nombre": "Nuevo Donante",
    "uid": "uid-google-123",
}


@pytest.fixture(autouse=True)
def _entorno():
    os.environ["JWT_SECRET_KEY"] = SECRET


def _simular_identidad(monkeypatch, identidad=None):
    monkeypatch.setattr(
        "routes.auth_google.verificar_id_token",
        lambda _token: identidad or IDENTIDAD,
    )


def _simular_bd(monkeypatch, filas):
    conexion = crear_conexion_mock(resultados_fetchone=filas)
    monkeypatch.setattr("db.connection.get_db_connection", lambda: conexion)
    monkeypatch.setattr("routes.auth_google.get_db_connection", lambda: conexion)
    return conexion


def test_correo_conocido_devuelve_token(client, monkeypatch):
    _simular_identidad(monkeypatch)
    _simular_bd(monkeypatch, [{
        "id_usuario": 7,
        "nombre": "Donante Demo",
        "correo": IDENTIDAD["correo"],
        "telefono": "3000000001",
        "rol": "donante",
        "activo": 1,
    }])

    respuesta = client.post("/auth/google", json={"id_token": "falso"})

    assert respuesta.status_code == 200
    cuerpo = respuesta.get_json()
    assert cuerpo["token"]
    assert cuerpo["usuario"]["rol"] == "donante"
    assert "requiere_registro" not in cuerpo


def test_correo_nuevo_pide_completar_registro(client, monkeypatch):
    _simular_identidad(monkeypatch)
    _simular_bd(monkeypatch, [None])

    respuesta = client.post("/auth/google", json={"id_token": "falso"})

    assert respuesta.status_code == 200
    cuerpo = respuesta.get_json()
    # No se crea la cuenta todavia: faltan telefono y direccion.
    assert cuerpo["requiere_registro"] is True
    assert cuerpo["correo"] == IDENTIDAD["correo"]
    assert "token" not in cuerpo


def test_cuenta_desactivada_es_rechazada(client, monkeypatch):
    _simular_identidad(monkeypatch)
    _simular_bd(monkeypatch, [{
        "id_usuario": 9,
        "nombre": "Inactivo",
        "correo": IDENTIDAD["correo"],
        "telefono": "3000000009",
        "rol": "donante",
        "activo": 0,
    }])

    respuesta = client.post("/auth/google", json={"id_token": "falso"})

    assert respuesta.status_code == 403


def test_token_invalido_es_401(client, monkeypatch):
    from services.firebase_auth import TokenGoogleInvalido

    def _rechazar(_token):
        raise TokenGoogleInvalido("El token de Google no es válido o venció")

    monkeypatch.setattr("routes.auth_google.verificar_id_token", _rechazar)

    respuesta = client.post("/auth/google", json={"id_token": "vencido"})

    assert respuesta.status_code == 401


def test_sin_credenciales_responde_no_disponible(client, monkeypatch):
    from services.firebase_auth import FirebaseNoConfigurado

    def _sin_config(_token):
        raise FirebaseNoConfigurado("Falta la credencial de Firebase")

    monkeypatch.setattr("routes.auth_google.verificar_id_token", _sin_config)

    respuesta = client.post("/auth/google", json={"id_token": "x"})

    # 503 y no 500: es configuracion ausente, no un fallo de la peticion.
    assert respuesta.status_code == 503


def test_registro_exige_direccion(client, monkeypatch):
    _simular_identidad(monkeypatch)
    _simular_bd(monkeypatch, [None])

    respuesta = client.post("/auth/google/registro", json={
        "id_token": "falso",
        "nombre": "Nuevo Donante",
        "telefono": "30000001",
        # faltan departamento, municipio, zona y direccion_detalle
    })

    assert respuesta.status_code == 400
    campos = respuesta.get_json()["campos"]
    assert "departamento" in campos
    assert "direccion_detalle" in campos


def test_registro_valida_telefono(client, monkeypatch):
    _simular_identidad(monkeypatch)
    _simular_bd(monkeypatch, [None])

    respuesta = client.post("/auth/google/registro", json={
        "id_token": "falso",
        "nombre": "Nuevo Donante",
        "telefono": "123",
        "departamento": "Guatemala",
        "municipio": "Ciudad de Guatemala",
        "zona": "10",
        "direccion_detalle": "6a Avenida 12-34",
    })

    assert respuesta.status_code == 400
    assert "telefono" in respuesta.get_json()["campos"]
