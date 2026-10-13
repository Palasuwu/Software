from unittest.mock import Mock

import pytest
from auth_utils import generate_token

SECRET = "test-leer-todas-con-al-menos-32-bytes"


@pytest.fixture
def sesion(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", SECRET)
    monkeypatch.setattr("auth_utils._obtener_usuario_actual", lambda uid: {"id_usuario": uid, "rol": "donante", "activo": 1})
    conn = Mock()
    cursor = conn.cursor.return_value
    cursor.rowcount = 3
    monkeypatch.setattr("routes.notificacion.get_db_connection", lambda: conn)
    monkeypatch.setattr("routes.notificacion.asegurar_tabla_notificaciones", lambda cursor: None)
    return conn, cursor, {"Authorization": f"Bearer {generate_token(10, 'donante')}"}


def test_marca_solo_las_notificaciones_del_usuario(client, sesion):
    conn, cursor, headers = sesion
    response = client.patch("/notificaciones/leer-todas", headers=headers)
    assert response.status_code == 200
    assert response.get_json()["actualizadas"] == 3

    sql, params = cursor.execute.call_args.args
    assert "UPDATE notificacion" in sql
    assert "id_usuario = %s" in sql and "leida = 0" in sql
    assert params == (10,)
    conn.commit.assert_called_once()


def test_sin_pendientes_responde_cero(client, sesion):
    _, cursor, headers = sesion
    cursor.rowcount = 0
    response = client.patch("/notificaciones/leer-todas", headers=headers)
    assert response.status_code == 200
    assert response.get_json()["actualizadas"] == 0


def test_requiere_sesion(client, sesion):
    conn, _, _ = sesion
    assert client.patch("/notificaciones/leer-todas").status_code == 401
    conn.cursor.assert_not_called()


def test_error_de_base_de_datos_no_confirma_cambios(client, sesion):
    conn, cursor, headers = sesion
    cursor.execute.side_effect = RuntimeError("timeout")
    response = client.patch("/notificaciones/leer-todas", headers=headers)
    assert response.status_code == 500
    assert "timeout" not in response.get_data(as_text=True)
    conn.commit.assert_not_called()
    conn.close.assert_called_once()
