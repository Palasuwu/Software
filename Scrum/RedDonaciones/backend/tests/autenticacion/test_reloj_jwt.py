"""Regresión del iat futuro por retroceso del reloj, sin sleeps ni tolerancia."""
from datetime import datetime, timedelta, timezone

import jwt
import pytest

import auth_utils
from tests.jwt_clock import controlar_reloj_jwt


SECRET = 'test-secret-key-with-at-least-32-bytes'
EMISION = datetime(2026, 10, 27, 12, 0, 1, 100000, tzinfo=timezone.utc)


@pytest.fixture(autouse=True)
def clave_jwt(monkeypatch):
    monkeypatch.setenv('JWT_SECRET_KEY', SECRET)


def test_retroceso_de_300_ms_respecto_del_iat_reproduce_401(client, monkeypatch, reloj_jwt):
    consultas_usuario = []

    def usuario_actual(uid):
        consultas_usuario.append(uid)
        return {'id_usuario': uid, 'rol': 'intermediario', 'activo': 1}

    monkeypatch.setattr(auth_utils, '_obtener_usuario_actual', usuario_actual)
    token = auth_utils.generate_token(20, 'intermediario', 1)
    headers = {'Authorization': f'Bearer {token}'}
    payload = jwt.decode(token, SECRET, algorithms=['HS256'])
    # PyJWT trunca la fracción al serializar, no redondea hacia el futuro.
    assert payload['iat'] == int(EMISION.timestamp())
    assert payload['exp'] == int((EMISION + timedelta(days=7)).timestamp())

    reloj_jwt.ahora = datetime.fromtimestamp(payload['iat'], timezone.utc) - timedelta(milliseconds=300)
    assert payload['iat'] - reloj_jwt.ahora.timestamp() == pytest.approx(0.3)
    with pytest.raises(jwt.ImmatureSignatureError):
        jwt.decode(token, SECRET, algorithms=['HS256'])
    assert auth_utils.verify_token(token) is None
    assert client.get('/donaciones', headers=headers).status_code == 401
    assert consultas_usuario == []

    # El mismo token, con emisión y validación coherentes, llega al control
    # real de rol: /donaciones no admite intermediarios y responde 403.
    reloj_jwt.ahora = EMISION
    assert auth_utils.verify_token(token)['id_usuario'] == 20
    assert client.get('/donaciones', headers=headers).status_code == 403
    assert consultas_usuario == [20]


def test_reloj_controlado_conserva_expiracion_y_firma(reloj_jwt):
    token = auth_utils.generate_token(20, 'intermediario', 1)
    with pytest.raises(jwt.InvalidSignatureError):
        jwt.decode(token, 'otra-clave-de-prueba-con-al-menos-32-bytes', algorithms=['HS256'])

    reloj_jwt.ahora = EMISION + timedelta(days=7)
    with pytest.raises(jwt.ExpiredSignatureError):
        jwt.decode(token, SECRET, algorithms=['HS256'])
    assert auth_utils.verify_token(token) is None


@pytest.mark.parametrize('fallar', [False, True])
def test_restaura_ambos_relojes_incluso_si_el_caso_falla(monkeypatch, fallar):
    emisor_original = auth_utils.datetime
    validador_original = jwt.api_jwt.datetime

    class FalloDelCaso(Exception):
        pass

    try:
        with controlar_reloj_jwt(monkeypatch, EMISION) as reloj:
            assert auth_utils.datetime.now(timezone.utc) == EMISION
            assert jwt.api_jwt.datetime.now(timezone.utc) == EMISION
            reloj.ahora += timedelta(seconds=1)
            assert auth_utils.datetime.now(timezone.utc) == jwt.api_jwt.datetime.now(timezone.utc)
            if fallar:
                raise FalloDelCaso()
    except FalloDelCaso:
        pass

    assert auth_utils.datetime is emisor_original
    assert jwt.api_jwt.datetime is validador_original
