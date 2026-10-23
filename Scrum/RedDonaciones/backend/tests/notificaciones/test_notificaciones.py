import os

from auth_utils import generate_token


class CursorNotificaciones:
    def __init__(self):
        self.rowcount = 1
        self.ultima_consulta = ""

    def execute(self, sql, params=None):
        self.ultima_consulta = sql

    def fetchall(self):
        return [{
            "id_notificacion": 8,
            "tipo": "donacion_registrada",
            "titulo": "Donacion registrada",
            "mensaje": "Tu aporte fue registrado.",
            "enlace": "/donaciones/4",
            "leida": 0,
            "fecha_creacion": "2026-07-26T10:00:00",
            "fecha_lectura": None
        }]

    def fetchone(self):
        if "COUNT(*) AS total" in self.ultima_consulta:
            return {"total": 1}
        return None

    def close(self):
        pass


class ConexionNotificaciones:
    def __init__(self):
        self.cursor_mock = CursorNotificaciones()

    def cursor(self, dictionary=False):
        return self.cursor_mock

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        pass


def headers_usuario():
    os.environ["JWT_SECRET_KEY"] = "test-secret-key-with-at-least-32-bytes"
    token = generate_token(1, "donante")
    return {"Authorization": f"Bearer {token}"}


def test_listar_notificaciones_del_usuario(client, monkeypatch):
    monkeypatch.setattr(
        "routes.notificacion.get_db_connection",
        lambda: ConexionNotificaciones()
    )

    response = client.get("/notificaciones", headers=headers_usuario())

    assert response.status_code == 200
    assert response.get_json()["total_no_leidas"] == 1
    assert response.get_json()["notificaciones"][0]["id_notificacion"] == 8


def test_marcar_notificacion_como_leida(client, monkeypatch):
    monkeypatch.setattr(
        "routes.notificacion.get_db_connection",
        lambda: ConexionNotificaciones()
    )

    response = client.patch(
        "/notificaciones/8/leer",
        headers=headers_usuario()
    )

    assert response.status_code == 200
    assert response.get_json()["message"] == "Notificacion marcada como leida"
