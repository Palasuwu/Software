import os
import pytest
from auth_utils import generate_token


class RegresionDonacionCursor:
    def __init__(self, donante_existe=True, publicacion=None):
        self.donante_existe = donante_existe
        self.publicacion = publicacion or {
            "id_publicacion": 1,
            "id_intermediario": 2,
            "titulo": "Campaña Ropa",
            "cantidad_necesaria": 50,
            "cantidad_recibida": 10,
            "estado": "activa"
        }
        self.lastrowid = 1
        self.rowcount = 1
        self.last_query = ""

    def execute(self, sql, params=None):
        self.last_query = " ".join(sql.split())

        if self.last_query.startswith("UPDATE publicacion"):
            cantidad = params[0]
            if (
                self.publicacion["estado"] == "activa"
                and (self.publicacion["cantidad_recibida"] + cantidad) <= self.publicacion["cantidad_necesaria"]
            ):
                self.publicacion["cantidad_recibida"] += cantidad
                if self.publicacion["cantidad_recibida"] >= self.publicacion["cantidad_necesaria"]:
                    self.publicacion["estado"] = "finalizada"
                self.rowcount = 1
            else:
                self.rowcount = 0

    def fetchone(self):
        if "FROM donante" in self.last_query:
            return {"id_usuario": 1} if self.donante_existe else None

        if "FROM publicacion" in self.last_query:
            return self.publicacion

        return None

    def fetchall(self):
        return []

    def close(self):
        pass


class RegresionDonacionConexion:
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


def auth_headers_donante(id_usuario=1):
    os.environ["JWT_SECRET_KEY"] = "test-secret-key-at-least-32-chars-long"
    token = generate_token(id_usuario, "donante")
    return {"Authorization": f"Bearer {token}"}


def payload_base():
    return {
        "id_publicacion": 1,
        "descripcion": "Prendas de vestir",
        "nombre_contacto": "Ana Perez",
        "telefono_contacto": "55554444",
        "hora_preferida": "14:30",
        "nota": "Entrega en portería",
        "fecha_donacion": "2026-09-01",
        "cantidad_donada": 5
    }


def test_crear_donacion_flujo_exitoso(client, monkeypatch):
    cursor = RegresionDonacionCursor()
    conn = RegresionDonacionConexion(cursor)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conn)

    response = client.post(
        "/donaciones",
        json=payload_base(),
        headers=auth_headers_donante(1)
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data["message"] == "Donación registrada y publicación actualizada"
    assert data["id_donacion"] == 1
    assert cursor.publicacion["cantidad_recibida"] == 15
    assert cursor.publicacion["estado"] == "activa"


def test_crear_donacion_meta_exacta_finaliza_campana(client, monkeypatch):
    pub = {
        "id_publicacion": 1,
        "id_intermediario": 2,
        "titulo": "Campaña Ropa",
        "cantidad_necesaria": 50,
        "cantidad_recibida": 40,
        "estado": "activa"
    }
    cursor = RegresionDonacionCursor(publicacion=pub)
    conn = RegresionDonacionConexion(cursor)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conn)

    payload = payload_base()
    payload["cantidad_donada"] = 10

    response = client.post(
        "/donaciones",
        json=payload,
        headers=auth_headers_donante(1)
    )

    assert response.status_code == 201
    assert cursor.publicacion["cantidad_recibida"] == 50
    assert cursor.publicacion["estado"] == "finalizada"


def test_crear_donacion_supera_meta_rechazada(client, monkeypatch):
    pub = {
        "id_publicacion": 1,
        "id_intermediario": 2,
        "titulo": "Campaña Ropa",
        "cantidad_necesaria": 50,
        "cantidad_recibida": 45,
        "estado": "activa"
    }
    cursor = RegresionDonacionCursor(publicacion=pub)
    conn = RegresionDonacionConexion(cursor)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conn)

    payload = payload_base()
    payload["cantidad_donada"] = 10

    response = client.post(
        "/donaciones",
        json=payload,
        headers=auth_headers_donante(1)
    )

    assert response.status_code == 400
    data = response.get_json()
    assert "supera lo restante disponible" in data["error"]


def test_crear_donacion_campana_ya_finalizada(client, monkeypatch):
    pub = {
        "id_publicacion": 1,
        "id_intermediario": 2,
        "titulo": "Campaña Ropa",
        "cantidad_necesaria": 50,
        "cantidad_recibida": 50,
        "estado": "finalizada"
    }
    cursor = RegresionDonacionCursor(publicacion=pub)
    conn = RegresionDonacionConexion(cursor)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conn)

    response = client.post(
        "/donaciones",
        json=payload_base(),
        headers=auth_headers_donante(1)
    )

    assert response.status_code == 400
    data = response.get_json()
    assert "La campaña ya finalizo" in data["error"]


def test_crear_donacion_cantidad_invalida(client, monkeypatch):
    cursor = RegresionDonacionCursor()
    conn = RegresionDonacionConexion(cursor)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conn)

    for invalido in [0, -3, "texto_no_valido"]:
        payload = payload_base()
        payload["cantidad_donada"] = invalido

        response = client.post(
            "/donaciones",
            json=payload,
            headers=auth_headers_donante(1)
        )

        assert response.status_code == 400


def test_crear_donacion_formatos_fecha_hora_invalidos(client, monkeypatch):
    cursor = RegresionDonacionCursor()
    conn = RegresionDonacionConexion(cursor)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conn)

    payload_fecha_mala = payload_base()
    payload_fecha_mala["fecha_donacion"] = "2026/09/01"

    r1 = client.post("/donaciones", json=payload_fecha_mala, headers=auth_headers_donante(1))
    assert r1.status_code == 400
    assert "fecha_donacion debe tener formato YYYY-MM-DD" in r1.get_json()["error"]

    payload_hora_mala = payload_base()
    payload_hora_mala["hora_preferida"] = "25:70"

    r2 = client.post("/donaciones", json=payload_hora_mala, headers=auth_headers_donante(1))
    assert r2.status_code == 400
    assert "hora_preferida debe tener formato HH:MM" in r2.get_json()["error"]


def test_crear_donacion_campos_faltantes(client, monkeypatch):
    cursor = RegresionDonacionCursor()
    conn = RegresionDonacionConexion(cursor)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conn)

    for campo in ["id_publicacion", "descripcion", "nombre_contacto", "telefono_contacto", "hora_preferida", "fecha_donacion"]:
        payload = payload_base()
        del payload[campo]

        response = client.post("/donaciones", json=payload, headers=auth_headers_donante(1))
        assert response.status_code == 400
        assert "Faltan datos obligatorios" in response.get_json()["error"]


def test_crear_donacion_donante_o_publicacion_inexistente(client, monkeypatch):
    cursor_sin_donante = RegresionDonacionCursor(donante_existe=False)
    conn1 = RegresionDonacionConexion(cursor_sin_donante)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conn1)

    r1 = client.post("/donaciones", json=payload_base(), headers=auth_headers_donante(1))
    assert r1.status_code == 404
    assert "El donante no existe" in r1.get_json()["error"]

    cursor_sin_pub = RegresionDonacionCursor(donante_existe=True, publicacion=None)
    cursor_sin_pub.publicacion = None
    conn2 = RegresionDonacionConexion(cursor_sin_pub)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conn2)

    r2 = client.post("/donaciones", json=payload_base(), headers=auth_headers_donante(1))
    assert r2.status_code == 404
    assert "La publicación no existe" in r2.get_json()["error"]
