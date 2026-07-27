import os

from auth_utils import generate_token

# Pruebas para DELETE /usuarios/<id_usuario> (bug: id_intermediario indefinido)


class CursorEliminarUsuario:
    def __init__(self, usuario_mock, total_publicaciones=0):
        self.usuario_mock = usuario_mock
        self.total_publicaciones = total_publicaciones
        self.ultima_consulta = ""
        self.ultimos_params = None

    def execute(self, sql, params=None):
        self.ultima_consulta = sql
        self.ultimos_params = params

    def fetchone(self):
        if "SELECT id_usuario, rol FROM usuario" in self.ultima_consulta:
            return self.usuario_mock

        if "COUNT(*) AS total FROM publicacion" in self.ultima_consulta:
            return {"total": self.total_publicaciones}

        if "COUNT(*) AS total FROM donacion" in self.ultima_consulta:
            return {"total": self.total_publicaciones}

        return None

    def close(self):
        pass


class ConexionEliminarUsuario:
    def __init__(self, cursor_mock):
        self.cursor_mock = cursor_mock

    def cursor(self, dictionary=False):
        return self.cursor_mock

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        pass


def headers_admin():
    os.environ["JWT_SECRET_KEY"] = "test-secret-key-with-at-least-32-bytes"
    token = generate_token(1, "administrador")
    return {"Authorization": f"Bearer {token}"}


def test_eliminar_intermediario_sin_publicaciones(client, monkeypatch):
    cursor_mock = CursorEliminarUsuario(
        usuario_mock={"id_usuario": 42, "rol": "intermediario"},
        total_publicaciones=0
    )

    monkeypatch.setattr(
        "routes.usuario.get_db_connection",
        lambda: ConexionEliminarUsuario(cursor_mock)
    )

    response = client.delete("/usuarios/42", headers=headers_admin())

    assert response.status_code == 200
    assert response.get_json()["message"] == "Usuario eliminado"
    # La consulta de conteo debe filtrar por el id del usuario eliminado
    assert cursor_mock.ultimos_params == (42,)


def test_eliminar_intermediario_con_publicaciones_asociadas(client, monkeypatch):
    cursor_mock = CursorEliminarUsuario(
        usuario_mock={"id_usuario": 42, "rol": "intermediario"},
        total_publicaciones=3
    )

    monkeypatch.setattr(
        "routes.usuario.get_db_connection",
        lambda: ConexionEliminarUsuario(cursor_mock)
    )

    response = client.delete("/usuarios/42", headers=headers_admin())

    assert response.status_code == 409
    assert "publicaciones asociadas" in response.get_json()["error"]
