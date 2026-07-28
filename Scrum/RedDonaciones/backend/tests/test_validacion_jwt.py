import os
from datetime import datetime, timedelta, timezone

import jwt as pyjwt


from app import app
from auth_utils import generate_token
from routes.organizacion import request_es_admin

# request_es_admin() debe devolver siempre True/False, nunca None, para que
# comparaciones estrictas (== False) no se salten con un token invalido.

SECRET = "test-secret-key-with-at-least-32-bytes"


def test_token_admin_valido_es_true(monkeypatch):
    os.environ["JWT_SECRET_KEY"] = SECRET
    token = generate_token(1, "administrador")

    with app.test_request_context("/organizaciones", headers={"Authorization": f"Bearer {token}"}):
        assert request_es_admin() is True


def test_token_no_admin_es_false(monkeypatch):
    os.environ["JWT_SECRET_KEY"] = SECRET
    token = generate_token(2, "donante")

    with app.test_request_context("/organizaciones", headers={"Authorization": f"Bearer {token}"}):
        assert request_es_admin() is False


def test_sin_token_es_false(monkeypatch):
    os.environ["JWT_SECRET_KEY"] = SECRET

    with app.test_request_context("/organizaciones"):
        assert request_es_admin() is False


def test_token_con_firma_invalida_es_false_no_none(monkeypatch):
    os.environ["JWT_SECRET_KEY"] = SECRET
    token_forjado = pyjwt.encode(
        {"id_usuario": 99, "rol": "administrador", "exp": datetime.now(timezone.utc) + timedelta(days=1)},
        "clave-incorrecta",
        algorithm="HS256"
    )

    with app.test_request_context("/organizaciones", headers={"Authorization": f"Bearer {token_forjado}"}):
        assert request_es_admin() is False


def test_token_expirado_es_false_no_none(monkeypatch):
    os.environ["JWT_SECRET_KEY"] = SECRET
    token_expirado = pyjwt.encode(
        {"id_usuario": 1, "rol": "administrador", "exp": datetime.now(timezone.utc) - timedelta(days=1)},
        SECRET,
        algorithm="HS256"
    )

    with app.test_request_context("/organizaciones", headers={"Authorization": f"Bearer {token_expirado}"}):
        assert request_es_admin() is False

