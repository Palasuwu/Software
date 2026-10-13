import pytest
from auth_utils import generate_token
from tests.helpers import crear_conexion_mock

DATOS = {"nombre": "Ana Perez", "correo": "ana@example.com", "telefono": "22223333", "password": "clave1234", "rol": "intermediario", "id_organizacion": 1, "cargo": "Coordinadora"}
SECRET = "test-secret-key-with-at-least-32-bytes"

def test_registro_publico_no_otorga_rol_intermediario(client, monkeypatch):
    def sin_escrituras():
        pytest.fail("El registro sin autorización no debe abrir una conexión de escritura")
    monkeypatch.setattr("routes.usuario.get_db_connection", sin_escrituras)
    response = client.post("/usuarios", json=DATOS)
    assert response.status_code == 401
    assert "usuario" not in response.get_json()

def test_donante_no_puede_crear_intermediario_manipulando_el_rol(client, monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", SECRET)
    monkeypatch.setattr("auth_utils._obtener_usuario_actual", lambda _: {"id_usuario": 9, "rol": "donante", "activo": 1})
    def sin_escrituras():
        pytest.fail("Un donante no debe crear intermediarios")
    monkeypatch.setattr("routes.usuario.get_db_connection", sin_escrituras)
    response = client.post("/usuarios", json=DATOS, headers={"Authorization": f"Bearer {generate_token(9, 'donante')}"})
    assert response.status_code == 403

@pytest.mark.parametrize("verificada", [True, False])
def test_alta_administrativa_exige_organizacion_verificada(client, monkeypatch, verificada):
    monkeypatch.setenv("JWT_SECRET_KEY", SECRET)
    monkeypatch.setattr("auth_utils._obtener_usuario_actual", lambda _: {"id_usuario": 3, "rol": "administrador", "activo": 1})
    conn = crear_conexion_mock(resultados_fetchone=[(1,)] if verificada else [])
    monkeypatch.setattr("routes.usuario.get_db_connection", lambda: conn)
    response = client.post("/usuarios", json=DATOS, headers={"Authorization": f"Bearer {generate_token(3, 'administrador')}"})
    assert response.status_code == (201 if verificada else 400)
    queries = [sql for sql, _ in conn.cursor_obj.executed_queries]
    assert any("INSERT INTO intermediario" in sql for sql in queries) == verificada
    if not verificada:
        assert not any("INSERT INTO usuario" in sql for sql in queries)
    if verificada:
        assert response.get_json()["usuario"]["rol"] == "intermediario"


@pytest.mark.parametrize("cambios", [
    {"id_organizacion": True}, {"id_organizacion": 1.5}, {"id_organizacion": 0},
    {"id_organizacion": -1}, {"id_organizacion": []}, {"cargo": []},
    {"cargo": "ab"}, {"cargo": "x" * 201}, {"rol": []},
    {"password": 12345678}, {"password": "a1" * 37},
])
def test_datos_manipulados_se_rechazan_sin_escrituras(client, monkeypatch, cambios):
    monkeypatch.setenv("JWT_SECRET_KEY", SECRET)
    monkeypatch.setattr("auth_utils._obtener_usuario_actual", lambda _: {"id_usuario": 3, "rol": "administrador", "activo": 1})
    monkeypatch.setattr("routes.usuario.get_db_connection", lambda: pytest.fail("No debe escribir datos inválidos"))
    response = client.post("/usuarios", json={**DATOS, **cambios}, headers={"Authorization": f"Bearer {generate_token(3, 'administrador')}"})
    assert response.status_code == 400


@pytest.mark.parametrize("usuario", [None, {"id_usuario": 3, "rol": "administrador", "activo": 0}, {"id_usuario": 3, "rol": "donante", "activo": 1}])
def test_token_administrativo_obsoleto_no_autoriza_el_alta(client, monkeypatch, usuario):
    monkeypatch.setenv("JWT_SECRET_KEY", SECRET)
    monkeypatch.setattr("auth_utils._obtener_usuario_actual", lambda _: usuario)
    monkeypatch.setattr("routes.usuario.get_db_connection", lambda: pytest.fail("No debe crear cuentas"))
    response = client.post("/usuarios", json=DATOS, headers={"Authorization": f"Bearer {generate_token(3, 'administrador')}"})
    assert response.status_code == 401


def test_no_promueve_donante_editando_su_perfil(client, monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", SECRET)
    monkeypatch.setattr("auth_utils._obtener_usuario_actual", lambda _: {"id_usuario": 9, "rol": "donante", "activo": 1})
    conn = crear_conexion_mock(resultados_fetchone=[{"id_usuario": 9, "rol": "donante"}])
    monkeypatch.setattr("routes.usuario.get_db_connection", lambda: conn)
    response = client.put("/usuarios/9", json=DATOS, headers={"Authorization": f"Bearer {generate_token(9, 'donante')}"})
    assert response.status_code == 400
    assert not any("UPDATE" in sql for sql, _ in conn.cursor_obj.executed_queries)
