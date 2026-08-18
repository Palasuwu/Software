import os
import pytest
from auth_utils import generate_token
from services.donacion_service import validar_transicion_donacion, validar_estado_donacion


class MockCursor:
    def __init__(self, donacion_data=None, org_intermediario=None):
        self.donacion_data = donacion_data
        self.org_intermediario = org_intermediario
        self.queries = []
        self.last_query = ""
        self.updated_estado = None

    def execute(self, sql, params=None):
        self.last_query = " ".join(sql.split())
        self.queries.append((self.last_query, params))

        if self.last_query.startswith("UPDATE donacion SET estado"):
            self.updated_estado = params[0]
            if self.donacion_data:
                self.donacion_data["estado"] = params[0]

    def fetchone(self):
        if "FROM intermediario WHERE id_usuario" in self.last_query:
            if self.org_intermediario is not None:
                return {"id_organizacion": self.org_intermediario}
            return None

        if "FROM donacion d INNER JOIN publicacion p" in self.last_query:
            return self.donacion_data

        return None

    def fetchall(self):
        return []

    def close(self):
        pass


class MockConexion:
    def __init__(self, cursor_mock):
        self.cursor_mock = cursor_mock

    def cursor(self, dictionary=True):
        return self.cursor_mock

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        pass


def auth_headers(id_usuario, rol, id_organizacion=None):
    os.environ["JWT_SECRET_KEY"] = "test-secret-key-at-least-32-chars-long"
    token = generate_token(id_usuario, rol, id_organizacion)
    return {"Authorization": f"Bearer {token}"}


def sample_donacion(id_donacion=1, id_donante=10, id_organizacion=1, estado="pendiente"):
    return {
        "id_donacion": id_donacion,
        "id_donante": id_donante,
        "id_publicacion": 100,
        "id_organizacion": id_organizacion,
        "publicacion_titulo": "Ropa de invierno",
        "estado": estado
    }


def test_cambio_estado_exitoso_intermediario(client, monkeypatch):
    donacion = sample_donacion(id_donacion=1, id_organizacion=1, estado="pendiente")
    cursor = MockCursor(donacion_data=donacion, org_intermediario=1)
    conexion = MockConexion(cursor)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conexion)

    response = client.put(
        "/donaciones/1/estado",
        json={"estado": "recibida"},
        headers=auth_headers(id_usuario=2, rol="intermediario", id_organizacion=1)
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["message"] == "Estado de donación actualizado"
    assert data["donacion"]["estado"] == "recibida"
    assert data["donacion"]["estado_anterior"] == "pendiente"


def test_cambio_estado_exitoso_administrador(client, monkeypatch):
    donacion = sample_donacion(id_donacion=1, id_organizacion=1, estado="pendiente")
    cursor = MockCursor(donacion_data=donacion)
    conexion = MockConexion(cursor)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conexion)

    response = client.put(
        "/donaciones/1/estado",
        json={"estado": "recibida"},
        headers=auth_headers(id_usuario=1, rol="administrador")
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["message"] == "Estado de donación actualizado"
    assert data["donacion"]["estado"] == "recibida"


def test_transiciones_validas_unitarias():
    assert validar_transicion_donacion("pendiente", "recibida") is True
    assert validar_transicion_donacion("pendiente", "rechazada") is True
    assert validar_transicion_donacion("recibida", "en_proceso") is True
    assert validar_transicion_donacion("recibida", "rechazada") is True
    assert validar_transicion_donacion("en_proceso", "entregada") is True
    assert validar_transicion_donacion("en_proceso", "rechazada") is True


def test_transiciones_invalidas_unitarias():
    assert validar_transicion_donacion("pendiente", "entregada") is False
    assert validar_transicion_donacion("pendiente", "en_proceso") is False
    assert validar_transicion_donacion("entregada", "pendiente") is False
    assert validar_transicion_donacion("entregada", "recibida") is False
    assert validar_transicion_donacion("rechazada", "recibida") is False
    assert validar_transicion_donacion("rechazada", "en_proceso") is False


def test_transicion_invalida_rechazada_endpoint(client, monkeypatch):
    donacion = sample_donacion(id_donacion=1, id_organizacion=1, estado="pendiente")
    cursor = MockCursor(donacion_data=donacion, org_intermediario=1)
    conexion = MockConexion(cursor)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conexion)

    response = client.put(
        "/donaciones/1/estado",
        json={"estado": "entregada"},
        headers=auth_headers(id_usuario=2, rol="intermediario", id_organizacion=1)
    )

    assert response.status_code == 400
    data = response.get_json()
    assert "Transición de estado no permitida" in data["error"]


def test_estado_invalido_rechazado_endpoint(client, monkeypatch):
    donacion = sample_donacion(id_donacion=1, id_organizacion=1, estado="pendiente")
    cursor = MockCursor(donacion_data=donacion, org_intermediario=1)
    conexion = MockConexion(cursor)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conexion)

    response = client.put(
        "/donaciones/1/estado",
        json={"estado": "desconocido"},
        headers=auth_headers(id_usuario=2, rol="intermediario", id_organizacion=1)
    )

    assert response.status_code == 400
    data = response.get_json()
    assert "Estado inválido" in data["error"]


def test_transicion_mismo_estado_rechazada(client, monkeypatch):
    donacion = sample_donacion(id_donacion=1, id_organizacion=1, estado="pendiente")
    cursor = MockCursor(donacion_data=donacion, org_intermediario=1)
    conexion = MockConexion(cursor)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conexion)

    response = client.put(
        "/donaciones/1/estado",
        json={"estado": "pendiente"},
        headers=auth_headers(id_usuario=2, rol="intermediario", id_organizacion=1)
    )

    assert response.status_code == 400
    data = response.get_json()
    assert "ya se encuentra en estado pendiente" in data["error"]


def test_intermediario_no_puede_ver_donacion_otra_organizacion(client, monkeypatch):
    donacion = sample_donacion(id_donacion=1, id_organizacion=2, estado="pendiente")
    cursor = MockCursor(donacion_data=donacion, org_intermediario=1)
    conexion = MockConexion(cursor)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conexion)

    response = client.get(
        "/donaciones/1/estado",
        headers=auth_headers(id_usuario=2, rol="intermediario", id_organizacion=1)
    )

    assert response.status_code == 404
    data = response.get_json()
    assert data["error"] == "Donación no encontrada"


def test_intermediario_no_puede_modificar_donacion_otra_organizacion(client, monkeypatch):
    donacion = sample_donacion(id_donacion=1, id_organizacion=2, estado="pendiente")
    cursor = MockCursor(donacion_data=donacion, org_intermediario=1)
    conexion = MockConexion(cursor)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conexion)

    response = client.put(
        "/donaciones/1/estado",
        json={"estado": "recibida"},
        headers=auth_headers(id_usuario=2, rol="intermediario", id_organizacion=1)
    )

    assert response.status_code == 404
    data = response.get_json()
    assert data["error"] == "Donación no encontrada"


def test_donante_no_puede_ver_donacion_otro_donante(client, monkeypatch):
    donacion = sample_donacion(id_donacion=1, id_donante=10, id_organizacion=1, estado="pendiente")
    cursor = MockCursor(donacion_data=donacion)
    conexion = MockConexion(cursor)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conexion)

    response = client.get(
        "/donaciones/1/estado",
        headers=auth_headers(id_usuario=99, rol="donante")
    )

    assert response.status_code == 403
    data = response.get_json()
    assert "No autorizado para consultar" in data["error"]


def test_donante_no_puede_modificar_estado_donacion(client, monkeypatch):
    donacion = sample_donacion(id_donacion=1, id_donante=10, id_organizacion=1, estado="pendiente")
    cursor = MockCursor(donacion_data=donacion)
    conexion = MockConexion(cursor)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conexion)

    response = client.put(
        "/donaciones/1/estado",
        json={"estado": "recibida"},
        headers=auth_headers(id_usuario=10, rol="donante")
    )

    assert response.status_code == 403
    data = response.get_json()
    assert "No autorizado para actualizar el estado" in data["error"]


def test_consulta_sin_token_rechazada(client):
    response = client.get("/donaciones/1/estado")
    assert response.status_code == 401

    response_put = client.put("/donaciones/1/estado", json={"estado": "recibida"})
    assert response_put.status_code == 401
