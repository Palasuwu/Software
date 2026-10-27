from datetime import datetime, timedelta, timezone
from unittest.mock import Mock
from urllib.parse import parse_qs, urlparse

import jwt
import pytest

from routes import password_reset as ruta
from services.password_reset import crear_token, huella_de, verificar_token
from tests.helpers import crear_conexion_mock

SECRET = "sprint10-test-secret-with-at-least-32-bytes"
USUARIO = {"id_usuario": 7, "nombre": "Ana López", "correo": "ana@example.test",
           "password": "$2b$hash-de-prueba", "activo": 1}


@pytest.fixture(autouse=True)
def entorno_aislado(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", SECRET)
    monkeypatch.setenv("SMTP_HOST", "smtp.example.test")
    monkeypatch.setenv("FRONTEND_URL", "https://donaciones.example.test/")
    ruta._ultima_solicitud.clear()
    # Ninguna prueba de esta suite puede enviar correo real.
    monkeypatch.setattr(ruta, "enviar_correo", Mock())
    yield
    ruta._ultima_solicitud.clear()


def simular_bd(monkeypatch, filas=None, error=None):
    conn = crear_conexion_mock(resultados_fetchone=filas, error=error)
    conn.commit = Mock()
    conn.rollback = Mock()
    conn.close = Mock()
    conn.cursor_obj.close = Mock()
    monkeypatch.setattr(ruta, "get_db_connection", lambda: conn)
    return conn


@pytest.mark.parametrize("endpoint", ["olvide", "restablecer"])
@pytest.mark.parametrize("datos", [[], ["correo"], "texto", 123, True])
def test_json_con_tipo_incorrecto_no_genera_error_interno(client, monkeypatch, endpoint, datos):
    bd = Mock(side_effect=AssertionError("No debe consultar la base"))
    monkeypatch.setattr(ruta, "get_db_connection", bd)
    assert client.post(f"/password/{endpoint}", json=datos).status_code == 400
    bd.assert_not_called()
    ruta.enviar_correo.assert_not_called()


@pytest.mark.parametrize("correo", [None, 123, True, [], {}])
def test_correo_debe_ser_texto(client, correo):
    assert client.post("/password/olvide", json={"correo": correo}).status_code == 400
    ruta.enviar_correo.assert_not_called()


def test_correo_normalizado_url_configurada_y_vigencia_de_30_minutos(client, monkeypatch):
    conn = simular_bd(monkeypatch, [dict(USUARIO)])
    respuesta = client.post("/password/olvide", json={"correo": "  ANA@example.test  "})
    assert respuesta.status_code == 200
    assert conn.cursor_obj.executed_queries[0][1] == (USUARIO["correo"],)
    destino, asunto, texto, html = ruta.enviar_correo.call_args.args
    assert destino == USUARIO["correo"]
    assert "contraseña" in asunto
    enlace = next(linea for linea in texto.splitlines() if linea.startswith("https://"))
    assert enlace.startswith("https://donaciones.example.test/restablecer?token=")
    token = parse_qs(urlparse(enlace).query)["token"][0]
    payload = verificar_token(token)
    assert payload["exp"] - payload["iat"] == 30 * 60
    assert payload["id_reset"] == USUARIO["id_usuario"]
    assert payload["huella"] == huella_de(USUARIO["password"])
    assert "30 minutos" in texto
    assert "Elegir una nueva contraseña" in html
    assert "<html lang=\"es\">" in html
    conn.close.assert_called_once()
    conn.cursor_obj.close.assert_called_once()


def test_correo_html_escapa_nombre_y_conserva_enlace_alternativo():
    enlace = 'https://example.test/restablecer?token=demo&otro="valor"'
    texto, html = ruta._cuerpo_correo('<img src=x onerror="alert(1)">', enlace)
    assert '<img src=x' not in html
    assert '&lt;img' in html
    assert '&amp;otro=&quot;valor&quot;' in html
    assert html.count('href=') == 2
    assert enlace in texto


def test_respuesta_identica_para_cuenta_activa_inactiva_y_desconocida(client, monkeypatch):
    respuestas = []
    for usuario in [USUARIO, {**USUARIO, "activo": 0}, None]:
        ruta._ultima_solicitud.clear()
        simular_bd(monkeypatch, [usuario])
        response = client.post("/password/olvide", json={"correo": USUARIO["correo"]})
        respuestas.append((response.status_code, response.get_json()))
    assert respuestas[0] == respuestas[1] == respuestas[2]
    ruta.enviar_correo.assert_called_once()


def test_permite_solicitar_otro_enlace_tras_un_minuto(client, monkeypatch):
    reloj = Mock(side_effect=[100, 130, 161])
    monkeypatch.setattr(ruta.time, "monotonic", reloj)
    simular_bd(monkeypatch, [USUARIO, USUARIO])
    for _ in range(3):
        assert client.post("/password/olvide", json={"correo": USUARIO["correo"]}).status_code == 200
    assert ruta.enviar_correo.call_count == 2


def test_fallo_smtp_conserva_respuesta_generica(client, monkeypatch):
    simular_bd(monkeypatch, [USUARIO])
    ruta.enviar_correo.side_effect = RuntimeError("Detalle interno SMTP")
    response = client.post("/password/olvide", json={"correo": USUARIO["correo"]})
    assert response.status_code == 200
    assert response.get_json() == {"message": ruta.RESPUESTA_GENERICA}


@pytest.mark.parametrize("alterar", ["vencido", "firma", "contenido"])
def test_token_rechazado_antes_de_abrir_la_base(client, monkeypatch, alterar):
    ahora = datetime.now(timezone.utc)
    payload = {"tipo": "reset_password", "id_reset": 7,
               "huella": huella_de(USUARIO["password"]), "exp": ahora + timedelta(minutes=30)}
    if alterar == "vencido":
        payload["exp"] = ahora - timedelta(seconds=1)
    if alterar == "contenido":
        payload.pop("huella")
    token = jwt.encode(payload, SECRET if alterar != "firma" else "otro-secreto-con-32-caracteres-test", algorithm="HS256")
    bd = Mock()
    monkeypatch.setattr(ruta, "get_db_connection", bd)
    response = client.post("/password/restablecer", json={"token": token, "password": "ClaveNueva123"})
    assert response.status_code == 400
    bd.assert_not_called()


def test_fallo_al_guardar_revierte_y_cierra_recursos(client, monkeypatch):
    conn = simular_bd(monkeypatch, error=RuntimeError("Detalle SQL"))
    token = crear_token(7, USUARIO["correo"], USUARIO["password"])
    response = client.post("/password/restablecer", json={"token": token, "password": "ClaveNueva123"})
    assert response.status_code == 500
    assert response.get_json() == {"error": "No se pudo restablecer la contraseña"}
    conn.rollback.assert_called_once()
    conn.commit.assert_not_called()
    conn.close.assert_called_once()
    conn.cursor_obj.close.assert_called_once()
