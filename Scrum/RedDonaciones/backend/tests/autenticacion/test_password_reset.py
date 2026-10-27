"""Pruebas de la recuperacion de contrasena por correo.

El envio SMTP se simula: lo que se verifica es la logica propia —no filtrar
que correos existen, invalidar el enlace usado, rechazar un token de sesion
como si fuera de recuperacion— no la libreria de correo.
"""
import os

import bcrypt
import pytest

from auth_utils import generate_token
from tests.helpers import crear_conexion_mock
from services.password_reset import crear_token, huella_de

SECRET = "test-secret-key-with-at-least-32-bytes"

HASH_ACTUAL = bcrypt.hashpw(b"ClaveVieja123", bcrypt.gensalt()).decode("utf-8")

USUARIO = {
    "id_usuario": 7,
    "nombre": "Donante Demo",
    "correo": "donante@example.com",
    "password": HASH_ACTUAL,
    "activo": 1,
}


@pytest.fixture(autouse=True)
def _entorno(monkeypatch):
    os.environ["JWT_SECRET_KEY"] = SECRET
    monkeypatch.setenv("SMTP_HOST", "localhost")
    monkeypatch.setenv("SMTP_PORT", "1025")
    # Cada prueba arranca sin el limite de un correo por minuto.
    from routes import password_reset

    password_reset._ultima_solicitud.clear()


@pytest.fixture
def correos_enviados(monkeypatch):
    """Captura los correos en lugar de mandarlos."""
    enviados = []
    monkeypatch.setattr(
        "routes.password_reset.enviar_correo",
        lambda destino, asunto, texto, html=None: enviados.append(
            {"destino": destino, "asunto": asunto, "texto": texto}
        ),
    )
    return enviados


def _simular_bd(monkeypatch, filas):
    conexion = crear_conexion_mock(resultados_fetchone=filas)
    monkeypatch.setattr("db.connection.get_db_connection", lambda: conexion)
    monkeypatch.setattr("routes.password_reset.get_db_connection", lambda: conexion)
    return conexion


# ── Solicitud del enlace ────────────────────────────────────────────────────

def test_correo_registrado_recibe_enlace(client, monkeypatch, correos_enviados):
    _simular_bd(monkeypatch, [dict(USUARIO)])

    respuesta = client.post("/password/olvide", json={"correo": USUARIO["correo"]})

    assert respuesta.status_code == 200
    assert len(correos_enviados) == 1
    assert correos_enviados[0]["destino"] == USUARIO["correo"]
    assert "/restablecer?token=" in correos_enviados[0]["texto"]


def test_correo_desconocido_responde_igual_y_no_manda_nada(
    client, monkeypatch, correos_enviados
):
    _simular_bd(monkeypatch, [None])

    conocido = client.post("/password/olvide", json={"correo": "otro@example.com"})

    # Misma respuesta que con un correo real: el endpoint no sirve para
    # averiguar quien tiene cuenta.
    assert conocido.status_code == 200
    assert conocido.get_json()["message"]
    assert correos_enviados == []


def test_cuenta_desactivada_no_recibe_enlace(client, monkeypatch, correos_enviados):
    _simular_bd(monkeypatch, [{**USUARIO, "activo": 0}])

    respuesta = client.post("/password/olvide", json={"correo": USUARIO["correo"]})

    assert respuesta.status_code == 200
    assert correos_enviados == []


def test_segunda_solicitud_seguida_no_reenvia(client, monkeypatch, correos_enviados):
    _simular_bd(monkeypatch, [dict(USUARIO), dict(USUARIO)])

    client.post("/password/olvide", json={"correo": USUARIO["correo"]})
    respuesta = client.post("/password/olvide", json={"correo": USUARIO["correo"]})

    assert respuesta.status_code == 200
    assert len(correos_enviados) == 1


def test_sin_smtp_configurado_responde_503(client, monkeypatch, correos_enviados):
    monkeypatch.delenv("SMTP_HOST", raising=False)
    _simular_bd(monkeypatch, [dict(USUARIO)])

    respuesta = client.post("/password/olvide", json={"correo": USUARIO["correo"]})

    assert respuesta.status_code == 503
    assert correos_enviados == []


def test_correo_vacio_es_400(client):
    respuesta = client.post("/password/olvide", json={"correo": "   "})

    assert respuesta.status_code == 400


# ── Uso del enlace ──────────────────────────────────────────────────────────

def test_token_valido_cambia_la_contrasena(client, monkeypatch):
    conexion = _simular_bd(
        monkeypatch, [dict(USUARIO), {"total": 1}, {"total": 1}]
    )
    token = crear_token(USUARIO["id_usuario"], USUARIO["correo"], HASH_ACTUAL)

    respuesta = client.post(
        "/password/restablecer", json={"token": token, "password": "ClaveNueva123"}
    )

    assert respuesta.status_code == 200

    updates = [
        (sql, params)
        for sql, params in conexion.cursor_obj.executed_queries
        if "UPDATE usuario SET password" in sql
    ]
    assert len(updates) == 1

    hash_guardado = updates[0][1][0]
    assert bcrypt.checkpw(b"ClaveNueva123", hash_guardado.encode("utf-8"))
    # Nunca se guarda la contrasena en claro.
    assert hash_guardado.startswith("$2")


def test_enlace_ya_usado_se_rechaza(client, monkeypatch):
    token = crear_token(USUARIO["id_usuario"], USUARIO["correo"], HASH_ACTUAL)

    # La contrasena ya cambio: en la BD hay otro hash que el del token.
    hash_nuevo = bcrypt.hashpw(b"ClaveNueva123", bcrypt.gensalt()).decode("utf-8")
    _simular_bd(monkeypatch, [{**USUARIO, "password": hash_nuevo}])

    respuesta = client.post(
        "/password/restablecer", json={"token": token, "password": "OtraClave456"}
    )

    assert respuesta.status_code == 400
    assert "ya se uso" in respuesta.get_json()["error"]


def test_token_de_sesion_no_sirve_para_restablecer(client, monkeypatch):
    _simular_bd(monkeypatch, [dict(USUARIO)])

    # Mismo secreto de firma, pero es un token de sesion, no de recuperacion.
    token_sesion = generate_token(USUARIO["id_usuario"], "administrador")

    respuesta = client.post(
        "/password/restablecer",
        json={"token": token_sesion, "password": "ClaveNueva123"},
    )

    assert respuesta.status_code == 400


def test_token_firmado_con_otro_secreto_se_rechaza(client, monkeypatch):
    _simular_bd(monkeypatch, [dict(USUARIO)])
    token = crear_token(USUARIO["id_usuario"], USUARIO["correo"], HASH_ACTUAL)

    os.environ["JWT_SECRET_KEY"] = "otro-secreto-completamente-distinto-32"
    try:
        respuesta = client.post(
            "/password/restablecer", json={"token": token, "password": "ClaveNueva123"}
        )
    finally:
        os.environ["JWT_SECRET_KEY"] = SECRET

    assert respuesta.status_code == 400


def test_contrasena_debil_se_rechaza(client, monkeypatch):
    _simular_bd(monkeypatch, [dict(USUARIO)])
    token = crear_token(USUARIO["id_usuario"], USUARIO["correo"], HASH_ACTUAL)

    respuesta = client.post(
        "/password/restablecer", json={"token": token, "password": "corta"}
    )

    assert respuesta.status_code == 400


def test_cuenta_desactivada_no_puede_restablecer(client, monkeypatch):
    _simular_bd(monkeypatch, [{**USUARIO, "activo": 0}])
    token = crear_token(USUARIO["id_usuario"], USUARIO["correo"], HASH_ACTUAL)

    respuesta = client.post(
        "/password/restablecer", json={"token": token, "password": "ClaveNueva123"}
    )

    assert respuesta.status_code == 400


def test_el_token_no_usa_claims_reservados_del_rfc():
    """PyJWT valida los claims registrados: "sub" tendria que ser texto.

    El id va en una clave propia, que ademas evita que auth_utils confunda
    este token con uno de sesion.
    """
    import jwt

    token = crear_token(USUARIO["id_usuario"], USUARIO["correo"], HASH_ACTUAL)
    payload = jwt.decode(token, SECRET, algorithms=["HS256"])

    assert payload["id_reset"] == USUARIO["id_usuario"]
    assert "sub" not in payload
    # Sin "id_usuario" ni "rol", _autenticar_request lo rechaza.
    assert "id_usuario" not in payload
    assert "rol" not in payload


def test_huella_cambia_con_el_hash():
    otro = bcrypt.hashpw(b"ClaveVieja123", bcrypt.gensalt()).decode("utf-8")

    assert huella_de(HASH_ACTUAL) == huella_de(HASH_ACTUAL)
    # Dos hashes distintos de la misma contrasena dan huellas distintas:
    # basta con que el hash cambie para matar el enlace.
    assert huella_de(HASH_ACTUAL) != huella_de(otro)
