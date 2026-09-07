import os

from auth_utils import generate_token
from test_usuarios import crear_conexion_mock

SECRET = "test-secret-key-with-at-least-32-bytes"


def simular_usuario_actual(monkeypatch, id_usuario, rol):
    monkeypatch.setattr(
        "auth_utils._obtener_usuario_actual",
        lambda _: {
            "id_usuario": id_usuario,
            "rol": rol,
            "activo": 1,
        },
    )


def simular_conexion_organizaciones(monkeypatch):
    connection = crear_conexion_mock(resultado_fetchall=[])
    monkeypatch.setattr(
        "db.connection.get_db_connection",
        lambda: connection,
    )


def test_listar_organizaciones_publico_sin_token(client, monkeypatch):
    os.environ["JWT_SECRET_KEY"] = SECRET
    simular_conexion_organizaciones(monkeypatch)

    response = client.get("/organizaciones")

    assert response.status_code == 200


def test_listar_organizaciones_admin_sin_token_es_401(client, monkeypatch):
    os.environ["JWT_SECRET_KEY"] = SECRET
    simular_conexion_organizaciones(monkeypatch)

    response = client.get("/organizaciones?vista=admin")

    assert response.status_code == 401


def test_listar_organizaciones_admin_donante_es_403(client, monkeypatch):
    os.environ["JWT_SECRET_KEY"] = SECRET
    simular_usuario_actual(monkeypatch, 2, "donante")
    simular_conexion_organizaciones(monkeypatch)
    token = generate_token(2, "donante")

    response = client.get(
        "/organizaciones?vista=admin",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403


def test_listar_organizaciones_admin_activo_es_200(client, monkeypatch):
    os.environ["JWT_SECRET_KEY"] = SECRET
    simular_usuario_actual(monkeypatch, 1, "administrador")
    simular_conexion_organizaciones(monkeypatch)
    token = generate_token(1, "administrador")

    response = client.get(
        "/organizaciones?vista=admin",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200


