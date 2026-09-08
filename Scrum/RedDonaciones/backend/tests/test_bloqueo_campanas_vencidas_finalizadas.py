import os
from datetime import date, timedelta
import pytest
from auth_utils import generate_token


class MockBloqueoCursor:
    def __init__(self, publicacion_data=None, donante_existe=True):
        self.publicacion = publicacion_data or {
            "id_publicacion": 1,
            "id_intermediario": 2,
            "titulo": "Campaña de prueba",
            "cantidad_necesaria": 100,
            "cantidad_recibida": 20,
            "estado": "activa",
            "fecha_limite": date.today() + timedelta(days=5),
        }
        self.donante_existe = donante_existe
        self.queries = []
        self.last_query = ""
        self.donacion_insertada = False
        self._lastrowid = 1
        self._rowcount = 1

    def execute(self, sql, params=None):
        self.last_query = " ".join(sql.split())
        self.queries.append((self.last_query, params))

        if "UPDATE publicacion SET estado = 'cancelada'" in self.last_query:
            self.publicacion["estado"] = "cancelada"
            self._rowcount = 1

        elif self.last_query.startswith("UPDATE publicacion SET cantidad_recibida"):
            cantidad = params[0]
            if (
                self.publicacion["estado"] == "activa"
                and (self.publicacion["cantidad_recibida"] + cantidad) <= self.publicacion["cantidad_necesaria"]
            ):
                self.publicacion["cantidad_recibida"] += cantidad
                if self.publicacion["cantidad_recibida"] >= self.publicacion["cantidad_necesaria"]:
                    self.publicacion["estado"] = "finalizada"
                self._rowcount = 1
            else:
                self._rowcount = 0

        elif self.last_query.startswith("INSERT INTO donacion"):
            self.donacion_insertada = True
            self._lastrowid = 101
            self._rowcount = 1

        elif self.last_query.startswith("INSERT INTO notificacion"):
            self._rowcount = 1

        else:
            self._rowcount = 1

    def fetchone(self):
        if "FROM donante" in self.last_query:
            return {"id_usuario": 1} if self.donante_existe else None

        if "FROM publicacion" in self.last_query:
            # Manejar el cálculo de estado en SELECT de detalle si aplica
            pub_copy = dict(self.publicacion)
            if "CASE WHEN (p.estado = 'activa'" in self.last_query:
                fl = pub_copy.get("fecha_limite")
                if fl and isinstance(fl, date) and fl < date.today():
                    pub_copy["estado"] = "cancelada"
            return pub_copy

        return None

    def fetchall(self):
        if "FROM usuario WHERE rol = 'administrador'" in self.last_query:
            return [{"id_usuario": 99}]
        if "FROM publicacion_articulo" in self.last_query:
            return [{
                "articulo": "Prenda",
                "categoria": "Ropa",
                "descripcion_detalle": "Ropa variada",
                "cantidad": 100,
            }]
        return []

    @property
    def lastrowid(self):
        return self._lastrowid

    @property
    def rowcount(self):
        return self._rowcount

    def close(self):
        pass


class MockBloqueoConexion:
    def __init__(self, cursor_mock):
        self.cursor_mock = cursor_mock
        self.autocommit = True
        self.committed = False
        self.rollbacked = False

    def cursor(self, dictionary=True):
        return self.cursor_mock

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rollbacked = True

    def close(self):
        pass


def auth_headers_donante(id_usuario=1):
    os.environ["JWT_SECRET_KEY"] = "test-secret-key-at-least-32-chars-long"
    token = generate_token(id_usuario, "donante")
    return {"Authorization": f"Bearer {token}"}


def payload_donacion_valido(id_publicacion=1, cantidad=5):
    return {
        "id_publicacion": id_publicacion,
        "descripcion": "Entrega agendada de ayuda",
        "nombre_contacto": "Carlos Donante",
        "telefono_contacto": "55551234",
        "hora_preferida": "10:30",
        "nota": "Dejar en recepción",
        "fecha_donacion": "2026-09-10",
        "cantidad_donada": cantidad,
    }


@pytest.fixture(autouse=True)
def mock_autenticacion_donante(monkeypatch):
    monkeypatch.setattr(
        "auth_utils._obtener_usuario_actual",
        lambda id_usuario: {
            "id_usuario": id_usuario,
            "rol": "donante",
            "activo": 1,
        },
    )


# 1. Donación rechazada cuando la campaña está finalizada
def test_donacion_rechazada_campana_finalizada(client, monkeypatch):
    pub = {
        "id_publicacion": 1,
        "id_intermediario": 2,
        "titulo": "Campaña Finalizada",
        "cantidad_necesaria": 50,
        "cantidad_recibida": 50,
        "estado": "finalizada",
        "fecha_limite": date.today() + timedelta(days=10),
    }
    cursor = MockBloqueoCursor(publicacion_data=pub)
    conn = MockBloqueoConexion(cursor)
    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conn)

    response = client.post(
        "/donaciones",
        json=payload_donacion_valido(1, cantidad=2),
        headers=auth_headers_donante(1),
    )

    assert response.status_code == 400
    data = response.get_json()
    assert data["error"] == "Esta campaña ha finalizado y ya no acepta donaciones"
    assert cursor.donacion_insertada is False


# 2. Donación rechazada cuando la fecha_limite ya venció (actualiza a cancelada)
def test_donacion_rechazada_campana_fecha_limite_vencida(client, monkeypatch):
    pub = {
        "id_publicacion": 2,
        "id_intermediario": 2,
        "titulo": "Campaña Expirada",
        "cantidad_necesaria": 100,
        "cantidad_recibida": 10,
        "estado": "activa",
        "fecha_limite": date.today() - timedelta(days=1),  # Expiró ayer
    }
    cursor = MockBloqueoCursor(publicacion_data=pub)
    conn = MockBloqueoConexion(cursor)
    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conn)

    response = client.post(
        "/donaciones",
        json=payload_donacion_valido(2, cantidad=5),
        headers=auth_headers_donante(1),
    )

    assert response.status_code == 400
    data = response.get_json()
    assert data["error"] == "Ha pasado la fecha límite de la campaña y ya no acepta donaciones"
    # Verificar que el backend actualizó el estado a 'cancelada' y ejecutó commit
    assert cursor.publicacion["estado"] == "cancelada"
    assert conn.committed is True
    assert cursor.donacion_insertada is False


# 3. Donación rechazada cuando la campaña está cancelada
def test_donacion_rechazada_campana_cancelada(client, monkeypatch):
    pub = {
        "id_publicacion": 3,
        "id_intermediario": 2,
        "titulo": "Campaña Cancelada",
        "cantidad_necesaria": 100,
        "cantidad_recibida": 0,
        "estado": "cancelada",
        "fecha_limite": date.today() + timedelta(days=15),
    }
    cursor = MockBloqueoCursor(publicacion_data=pub)
    conn = MockBloqueoConexion(cursor)
    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conn)

    response = client.post(
        "/donaciones",
        json=payload_donacion_valido(3, cantidad=5),
        headers=auth_headers_donante(1),
    )

    assert response.status_code == 400
    data = response.get_json()
    assert data["error"] == "Esta campaña está cancelada y no acepta donaciones"
    assert cursor.donacion_insertada is False


# 4. Donación rechazada si la meta ya fue alcanzada (restante <= 0)
def test_donacion_rechazada_meta_alcanzada_restante_cero(client, monkeypatch):
    pub = {
        "id_publicacion": 4,
        "id_intermediario": 2,
        "titulo": "Campaña Meta Llena",
        "cantidad_necesaria": 50,
        "cantidad_recibida": 50,
        "estado": "activa",  # Estado activo pero cantidad restante es 0
        "fecha_limite": date.today() + timedelta(days=10),
    }
    cursor = MockBloqueoCursor(publicacion_data=pub)
    conn = MockBloqueoConexion(cursor)
    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conn)

    response = client.post(
        "/donaciones",
        json=payload_donacion_valido(4, cantidad=1),
        headers=auth_headers_donante(1),
    )

    assert response.status_code == 400
    data = response.get_json()
    assert data["error"] == "Esta campaña ha finalizado y ya no acepta donaciones"
    assert cursor.donacion_insertada is False


# 5. Donación rechazada si la cantidad supera lo restante disponible
def test_donacion_rechazada_supera_restante(client, monkeypatch):
    pub = {
        "id_publicacion": 5,
        "id_intermediario": 2,
        "titulo": "Campaña Casi Llena",
        "cantidad_necesaria": 50,
        "cantidad_recibida": 46,
        "estado": "activa",
        "fecha_limite": date.today() + timedelta(days=5),
    }
    cursor = MockBloqueoCursor(publicacion_data=pub)
    conn = MockBloqueoConexion(cursor)
    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conn)

    response = client.post(
        "/donaciones",
        json=payload_donacion_valido(5, cantidad=5),  # Intenta donar 5 cuando solo quedan 4
        headers=auth_headers_donante(1),
    )

    assert response.status_code == 400
    data = response.get_json()
    assert "supera lo restante disponible (4)" in data["error"]
    assert cursor.donacion_insertada is False


# 6. Donación permitida en campaña activa con fecha futura
def test_donacion_permitida_campana_activa_con_fecha_futura(client, monkeypatch):
    pub = {
        "id_publicacion": 6,
        "id_intermediario": 2,
        "titulo": "Campaña Activa",
        "cantidad_necesaria": 100,
        "cantidad_recibida": 20,
        "estado": "activa",
        "fecha_limite": date.today() + timedelta(days=30),
    }
    cursor = MockBloqueoCursor(publicacion_data=pub)
    conn = MockBloqueoConexion(cursor)
    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conn)

    response = client.post(
        "/donaciones",
        json=payload_donacion_valido(6, cantidad=10),
        headers=auth_headers_donante(1),
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data["message"] == "Donación registrada y publicación actualizada"
    assert cursor.publicacion["cantidad_recibida"] == 30
    assert cursor.donacion_insertada is True
    assert conn.committed is True


# 7. Donación permitida en campaña con fecha límite hoy mismo (vigente)
def test_donacion_permitida_campana_fecha_limite_hoy(client, monkeypatch):
    pub = {
        "id_publicacion": 7,
        "id_intermediario": 2,
        "titulo": "Campaña Cierra Hoy",
        "cantidad_necesaria": 80,
        "cantidad_recibida": 10,
        "estado": "activa",
        "fecha_limite": date.today(),
    }
    cursor = MockBloqueoCursor(publicacion_data=pub)
    conn = MockBloqueoConexion(cursor)
    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conn)

    response = client.post(
        "/donaciones",
        json=payload_donacion_valido(7, cantidad=5),
        headers=auth_headers_donante(1),
    )

    assert response.status_code == 201
    assert cursor.donacion_insertada is True


# 8. Donación permitida en campaña activa sin fecha límite definida (None)
def test_donacion_permitida_campana_sin_fecha_limite(client, monkeypatch):
    pub = {
        "id_publicacion": 8,
        "id_intermediario": 2,
        "titulo": "Campaña Permanente",
        "cantidad_necesaria": 200,
        "cantidad_recibida": 50,
        "estado": "activa",
        "fecha_limite": None,
    }
    cursor = MockBloqueoCursor(publicacion_data=pub)
    conn = MockBloqueoConexion(cursor)
    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conn)

    response = client.post(
        "/donaciones",
        json=payload_donacion_valido(8, cantidad=15),
        headers=auth_headers_donante(1),
    )

    assert response.status_code == 201
    assert cursor.publicacion["cantidad_recibida"] == 65
    assert cursor.donacion_insertada is True


# 9. Consulta pública calcula estado 'cancelada' si la fecha límite ya expiró
def test_consulta_publicacion_calcula_cancelada_si_vencida(client, monkeypatch):
    pub = {
        "id_publicacion": 9,
        "id_intermediario": 2,
        "id_organizacion": 1,
        "titulo": "Campaña Vencida para Detalle",
        "descripcion": "Descripción",
        "cantidad_necesaria": 100,
        "cantidad_recibida": 20,
        "estado": "activa",
        "fecha_publicacion": "2026-08-01",
        "fecha_limite": date.today() - timedelta(days=5),
        "organizacion": "Org Test",
        "direccion": "Ciudad",
        "categoria": "Ropa",
    }
    cursor = MockBloqueoCursor(publicacion_data=pub)
    conn = MockBloqueoConexion(cursor)
    monkeypatch.setattr("routes.publicacion.get_db_connection", lambda: conn)

    response = client.get("/publicaciones/9")
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert data[0]["estado"] == "cancelada"
